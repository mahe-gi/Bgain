import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { Modal } from "./Modal.js";
import { updateFolderApi } from "../../api/storage.api.js";
import { updateFileApi } from "../../api/file.api.js";
import { getErrorMessage } from "../../api/client.js";

export interface RenameItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: { id: string; name: string; type: "folder" | "file" } | null;
  onSuccessMessage?: (msg: string) => void;
}

export const RenameItemDialog: React.FC<RenameItemDialogProps> = ({
  isOpen,
  onClose,
  item,
  onSuccessMessage
}) => {
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen && item) {
      setName(item.name);
      setErrorMsg(null);
    }
  }, [isOpen, item]);

  const maxLength = item?.type === "folder" ? 120 : 255;

  const mutation = useMutation({
    mutationFn: async (newName: string) => {
      if (!item) throw new Error("No item selected");
      if (item.type === "folder") {
        return updateFolderApi(item.id, { name: newName });
      } else {
        return updateFileApi(item.id, { name: newName });
      }
    },
    onSuccess: (updatedItem) => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
      if (item) {
        queryClient.invalidateQueries({ queryKey: ["file", item.id] });
      }
      if (onSuccessMessage) {
        onSuccessMessage(`Renamed to "${updatedItem.name}" successfully.`);
      }
      onClose();
    },
    onError: (err) => {
      setErrorMsg(getErrorMessage(err, "Failed to rename item"));
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg("Name is required.");
      return;
    }
    if (trimmed.length > maxLength) {
      setErrorMsg(`Name must not exceed ${maxLength} characters.`);
      return;
    }
    setErrorMsg(null);
    mutation.mutate(trimmed);
  };

  if (!item) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={item.type === "folder" ? "Rename Folder" : "Rename File"}
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
            {mutation.isPending ? "Renaming…" : "Save Name"}
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

        <label htmlFor="rename-item-input" style={{ fontSize: "14px", fontWeight: 600 }}>
          New Name
        </label>
        <input
          id="rename-item-input"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errorMsg) setErrorMsg(null);
          }}
          maxLength={maxLength}
          autoFocus
          disabled={mutation.isPending}
          className="dialog-input"
        />
      </form>
    </Modal>
  );
};
