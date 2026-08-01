import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Trash2 } from "lucide-react";
import { Modal } from "./Modal.js";
import { deleteFolderApi } from "../../api/storage.api.js";
import { deleteFileApi } from "../../api/file.api.js";
import { getErrorMessage } from "../../api/client.js";

export interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: { id: string; name: string; type: "folder" | "file" } | null;
  onDeletedSuccess?: (deletedItem: { id: string; name: string; type: "folder" | "file" }) => void;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  onClose,
  item,
  onDeletedSuccess
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
    }
  }, [isOpen]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!item) throw new Error("No item selected");
      if (item.type === "folder") {
        return deleteFolderApi(item.id);
      } else {
        return deleteFileApi(item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
      if (item) {
        queryClient.invalidateQueries({ queryKey: ["file", item.id] });
        if (onDeletedSuccess) {
          onDeletedSuccess(item);
        }
      }
      onClose();
    },
    onError: (err) => {
      setErrorMsg(getErrorMessage(err, "Failed to delete item"));
    }
  });

  if (!item) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={item.type === "folder" ? `Delete Folder "${item.name}"?` : `Delete File "${item.name}"?`}
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
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            style={{
              padding: "10px 16px",
              backgroundColor: "var(--color-danger)",
              color: "#ffffff",
              borderRadius: "var(--radius-md)",
              fontSize: "14px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Trash2 size={16} aria-hidden="true" />
            <span>{mutation.isPending ? "Deleting…" : "Delete Permanently"}</span>
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {errorMsg && (
          <div role="alert" className="error-banner">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {item.type === "folder" ? (
          <div style={{ fontSize: "14px", color: "var(--color-danger)", backgroundColor: "var(--color-danger-bg)", padding: "12px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-danger-border)" }}>
            <strong>Warning:</strong> Deleting folder &quot;{item.name}&quot; will permanently remove all nested subfolders and files contained inside it.
          </div>
        ) : (
          <div style={{ fontSize: "14px", color: "var(--color-text-primary)" }}>
            Are you sure you want to permanently delete file &quot;{item.name}&quot;? This action cannot be undone.
          </div>
        )}
      </div>
    </Modal>
  );
};
