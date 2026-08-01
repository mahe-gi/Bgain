import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { Modal } from "./Modal.js";
import { uploadFileApi } from "../../api/file.api.js";
import { getErrorMessage } from "../../api/client.js";
import { formatBytes } from "../../utils/formatters.js";

export interface UploadFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolderId: string; // "root" or UUID
  onSuccessMessage?: (msg: string) => void;
}

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".txt", ".docx", ".xlsx"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const UploadFileDialog: React.FC<UploadFileDialogProps> = ({
  isOpen,
  onClose,
  currentFolderId,
  onSuccessMessage
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setProgress(0);
      setErrorMsg(null);
    }
  }, [isOpen]);

  const mutation = useMutation({
    mutationFn: (file: File) => {
      const folderId = currentFolderId === "root" ? null : currentFolderId;
      return uploadFileApi(file, folderId, (percent) => setProgress(percent));
    },
    onSuccess: (file) => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
      if (onSuccessMessage) {
        onSuccessMessage(`File "${file.name}" uploaded successfully.`);
      }
      onClose();
    },
    onError: (err) => {
      setErrorMsg(getErrorMessage(err, "Failed to upload file"));
      setProgress(0);
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setSelectedFile(null);
      return;
    }

    const file = files[0];
    const extension = "." + file.name.split(".").pop()?.toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setErrorMsg(`Invalid file type (${extension}). Allowed: PDF, JPG, PNG, TXT, DOCX, XLSX.`);
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMsg(`File size (${formatBytes(file.size)}) exceeds maximum limit of 10 MB.`);
      setSelectedFile(null);
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg("Please select a file to upload.");
      return;
    }
    setErrorMsg(null);
    mutation.mutate(selectedFile);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload File"
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
            disabled={mutation.isPending || !selectedFile}
            className="primary-btn"
          >
            {mutation.isPending ? `Uploading (${progress}%)…` : "Upload File"}
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

        <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
          Allowed types: PDF, JPG, PNG, TXT, DOCX, XLSX (Max size: 10 MB).
        </span>

        <label htmlFor="upload-file-input" style={{ fontSize: "14px", fontWeight: 600 }}>
          Select File
        </label>
        <input
          id="upload-file-input"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.txt,.docx,.xlsx"
          onChange={handleFileChange}
          disabled={mutation.isPending}
          className="dialog-input"
        />

        {selectedFile && (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-primary)" }}>
              {selectedFile.name} ({formatBytes(selectedFile.size)})
            </span>
          </div>
        )}

        {mutation.isPending && (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
            <div
              style={{
                width: "100%",
                height: "8px",
                backgroundColor: "var(--color-bg-input)",
                borderRadius: "4px",
                overflow: "hidden"
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  backgroundColor: "var(--color-primary)",
                  transition: "width 0.2s ease"
                }}
              />
            </div>
            <span style={{ fontSize: "12px", textAlign: "right", color: "var(--color-text-muted)" }}>
              {progress}% uploaded
            </span>
          </div>
        )}
      </form>
    </Modal>
  );
};
