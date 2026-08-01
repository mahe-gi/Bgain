import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  FileCode,
  File,
  AlertCircle,
  Info,
  Edit2,
  FolderInput,
  Trash2
} from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { getFileDetailsApi, getPreviewUrlApi, getDownloadUrlApi } from "../api/file.api.js";
import { getErrorMessage } from "../api/client.js";
import { formatBytes, formatDate, getFileTypeLabel } from "../utils/formatters.js";
import { RenameItemDialog } from "../components/dialogs/RenameItemDialog.js";
import { MoveItemDialog } from "../components/dialogs/MoveItemDialog.js";
import { DeleteConfirmDialog } from "../components/dialogs/DeleteConfirmDialog.js";
import styles from "./FileDetailsPage.module.css";

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <ImageIcon size={28} aria-hidden="true" />;
  if (mimeType.includes("pdf") || mimeType.includes("document")) return <FileText size={28} aria-hidden="true" />;
  if (mimeType.includes("json") || mimeType.includes("javascript") || mimeType.includes("text")) return <FileCode size={28} aria-hidden="true" />;
  return <File size={28} aria-hidden="true" />;
}

function isSupportedPreview(mimeType: string): boolean {
  if (!mimeType) return false;
  const mime = mimeType.toLowerCase();
  if (mime.startsWith("image/")) return true;
  if (mime === "application/pdf") return true;
  if (mime === "text/plain" || mime.startsWith("text/")) return true;
  return false;
}

export const FileDetailsPage: React.FC = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  // Component state for signed URLs and TXT content
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [txtContent, setTxtContent] = useState<string | null>(null);

  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Admin Dialog States
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Clear preview state when file ID changes
  useEffect(() => {
    setPreviewUrl(null);
    setPreviewLoading(false);
    setPreviewError(null);
    setTxtContent(null);
    setDownloadLoading(false);
    setDownloadError(null);
  }, [fileId]);

  // Fetch File Metadata via TanStack Query
  const { data: file, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["file", fileId],
    queryFn: () => getFileDetailsApi(fileId!),
    enabled: Boolean(fileId)
  });

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/storage");
    }
  };

  const handleRequestPreview = async () => {
    if (!fileId || !file) return;
    setPreviewLoading(true);
    setPreviewError(null);
    setTxtContent(null);

    try {
      const response = await getPreviewUrlApi(fileId);
      setPreviewUrl(response.url);

      if (file.mimeType.startsWith("text/")) {
        const textRes = await fetch(response.url);
        if (!textRes.ok) {
          throw new Error("Failed to load text preview content from storage.");
        }
        const textData = await textRes.text();
        setTxtContent(textData);
      }
    } catch (err: unknown) {
      setPreviewError(getErrorMessage(err, "Failed to generate preview URL"));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!fileId || !file) return;
    setDownloadLoading(true);
    setDownloadError(null);

    try {
      const response = await getDownloadUrlApi(fileId);
      const link = document.createElement("a");
      link.href = response.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: unknown) {
      setDownloadError(getErrorMessage(err, "Failed to generate download URL"));
    } finally {
      setDownloadLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container} data-testid="file-details-loading">
        <div className={styles.backHeader}>
          <button type="button" onClick={handleBack} className={styles.backButton}>
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Back</span>
          </button>
        </div>
        <div className={styles.detailsCard} style={{ opacity: 0.6 }}>Loading file details…</div>
      </div>
    );
  }

  if (isError || !file) {
    return (
      <div className={styles.container} data-testid="file-details-error">
        <div className={styles.backHeader}>
          <button type="button" onClick={handleBack} className={styles.backButton}>
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Back</span>
          </button>
        </div>
        <div className={styles.errorBanner} role="alert">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={20} aria-hidden="true" />
            <span>{getErrorMessage(error, "File not found or failed to load")}</span>
          </div>
          <button type="button" onClick={() => refetch()} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const supported = isSupportedPreview(file.mimeType);

  return (
    <div className={styles.container}>
      {/* Back Navigation Bar */}
      <div className={styles.backHeader}>
        <button type="button" onClick={handleBack} className={styles.backButton} aria-label="Go back to previous page">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back</span>
        </button>
      </div>

      {/* Download Error Banner */}
      {downloadError && (
        <div className={styles.errorBanner} role="alert" data-testid="download-error">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={20} aria-hidden="true" />
            <span>{downloadError}</span>
          </div>
          <button type="button" onClick={handleDownload} className={styles.retryButton}>
            Retry Download
          </button>
        </div>
      )}

      {/* Main Metadata Card */}
      <div className={styles.detailsCard}>
        <div className={styles.fileHeader}>
          <div className={styles.fileTitleGroup}>
            <div className={styles.fileIconContainer}>{getFileIcon(file.mimeType)}</div>
            <div className={styles.fileTitleMeta}>
              <h1 className={styles.fileName}>{file.name}</h1>
              <span className={styles.fileTypeBadge}>{getFileTypeLabel(file.mimeType)}</span>
            </div>
          </div>

          <div className={styles.actionButtons}>
            {supported && (
              <button
                type="button"
                onClick={handleRequestPreview}
                disabled={previewLoading}
                className={styles.secondaryButton}
                aria-label="Preview file content"
              >
                <Eye size={16} aria-hidden="true" />
                <span>{previewLoading ? "Loading Preview…" : "Preview"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownload}
              disabled={downloadLoading}
              className={styles.primaryButton}
              aria-label="Download file"
            >
              <Download size={16} aria-hidden="true" />
              <span>{downloadLoading ? "Preparing Download…" : "Download"}</span>
            </button>

            {/* Admin Action Buttons */}
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => setIsRenameOpen(true)}
                  className={styles.secondaryButton}
                  aria-label="Rename file"
                >
                  <Edit2 size={16} aria-hidden="true" />
                  <span>Rename</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsMoveOpen(true)}
                  className={styles.secondaryButton}
                  aria-label="Move file"
                >
                  <FolderInput size={16} aria-hidden="true" />
                  <span>Move</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(true)}
                  className={styles.secondaryButton}
                  style={{ color: "var(--color-danger)", borderColor: "var(--color-danger-border)" }}
                  aria-label="Delete file"
                >
                  <Trash2 size={16} aria-hidden="true" />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Metadata Details Grid */}
        <div className={styles.metadataGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>File Size</span>
            <span className={styles.metaValue}>{formatBytes(file.sizeBytes)}</span>
          </div>

          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>MIME Type</span>
            <span className={styles.metaValue}>{file.mimeType}</span>
          </div>

          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Created Date</span>
            <span className={styles.metaValue}>{formatDate(file.createdAt)}</span>
          </div>

          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Last Modified</span>
            <span className={styles.metaValue}>{formatDate(file.updatedAt || file.createdAt)}</span>
          </div>

          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Location</span>
            <span className={styles.metaValue}>
              {file.folderId === null ? "Root Storage" : `Folder (${file.folderId.slice(0, 8)}…)`}
            </span>
          </div>
        </div>
      </div>

      {/* Preview Display Section */}
      <section className={styles.previewSection} aria-label="File Preview">
        <h2 className={styles.sectionTitle}>File Preview</h2>

        {!supported ? (
          <div className={styles.noticeBox} data-testid="preview-unsupported">
            <Info size={36} aria-hidden="true" />
            <p>Preview is not available for this file type ({getFileTypeLabel(file.mimeType)}).</p>
            <span style={{ fontSize: "var(--font-size-xs)", marginTop: "4px" }}>
              You can still download this file to view it on your device.
            </span>
          </div>
        ) : !previewUrl && !previewError ? (
          <div className={styles.noticeBox} data-testid="preview-prompt">
            <Eye size={36} aria-hidden="true" />
            <p>Click the <strong>Preview</strong> button above to load a private signed preview of this file.</p>
          </div>
        ) : previewError ? (
          <div className={styles.errorBanner} role="alert" data-testid="preview-error">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={20} aria-hidden="true" />
              <span>{previewError}</span>
            </div>
            <button type="button" onClick={handleRequestPreview} className={styles.retryButton}>
              Retry Preview
            </button>
          </div>
        ) : (
          <div className={styles.previewContainer} data-testid="preview-content">
            {file.mimeType.startsWith("image/") && (
              <img src={previewUrl!} alt={file.name} className={styles.previewImage} />
            )}

            {file.mimeType === "application/pdf" && (
              <iframe src={previewUrl!} title={file.name} className={styles.previewIframe} />
            )}

            {file.mimeType.startsWith("text/") && (
              <pre className={styles.previewTxt}>{txtContent ?? "Loading plain text content…"}</pre>
            )}
          </div>
        )}
      </section>

      {/* Admin Mutation Dialogs */}
      {isAdmin && (
        <>
          <RenameItemDialog
            isOpen={isRenameOpen}
            onClose={() => setIsRenameOpen(false)}
            item={{ id: file.id, name: file.name, type: "file" }}
            onSuccessMessage={() => refetch()}
          />

          <MoveItemDialog
            isOpen={isMoveOpen}
            onClose={() => setIsMoveOpen(false)}
            item={{ id: file.id, name: file.name, type: "file", currentParentId: file.folderId }}
            onSuccessMessage={() => refetch()}
          />

          <DeleteConfirmDialog
            isOpen={isDeleteOpen}
            onClose={() => setIsDeleteOpen(false)}
            item={{ id: file.id, name: file.name, type: "file" }}
            onDeletedSuccess={() => navigate("/storage")}
          />
        </>
      )}
    </div>
  );
};
