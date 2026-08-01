import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { Modal } from "./Modal.js";
import { createFolderApi } from "../../api/storage.api.js";
import { getErrorMessage } from "../../api/client.js";

export interface CreateFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolderId: string; // "root" or UUID
  onSuccessMessage?: (msg: string) => void;
}

export const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({
  isOpen,
  onClose,
  currentFolderId,
  onSuccessMessage
}) => {
  const [folderName, setFolderName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen) {
      setFolderName("");
      setErrorMsg(null);
    }
  }, [isOpen]);

  const mutation = useMutation({
    mutationFn: (name: string) => {
      const parentId = currentFolderId === "root" ? null : currentFolderId;
      return createFolderApi({ name, parentId });
    },
    onSuccess: (folder) => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (onSuccessMessage) {
        onSuccessMessage(`Folder "${folder.name}" created successfully.`);
      }
      onClose();
    },
    onError: (err) => {
      setErrorMsg(getErrorMessage(err, "Failed to create folder"));
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = folderName.trim();
    if (!trimmed) {
      setErrorMsg("Folder name is required.");
      return;
    }
    if (trimmed.length > 120) {
      setErrorMsg("Folder name must not exceed 120 characters.");
      return;
    }
    setErrorMsg(null);
    mutation.mutate(trimmed);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Folder"
      isSubmitting={mutation.isPending}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="secondary-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="primary-btn"
          >
            {mutation.isPending ? "Creating…" : "Create Folder"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {errorMsg && (
          <div role="alert" className="error-banner">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        <label htmlFor="create-folder-name" style={{ fontSize: "14px", fontWeight: 600 }}>
          Folder Name
        </label>
        <input
          id="create-folder-name"
          type="text"
          value={folderName}
          onChange={(e) => {
            setFolderName(e.target.value);
            if (errorMsg) setErrorMsg(null);
          }}
          placeholder="e.g. Invoices"
          maxLength={120}
          autoFocus
          disabled={mutation.isPending}
          className="dialog-input"
        />
      </form>
    </Modal>
  );
};
