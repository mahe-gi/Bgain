import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search as SearchIcon,
  Folder as FolderIcon,
  FileText,
  File,
  Image as ImageIcon,
  FileCode,
  AlertCircle
} from "lucide-react";
import { searchApi } from "../api/search.api.js";
import { getErrorMessage } from "../api/client.js";
import { formatBytes, formatDate, getFileTypeLabel } from "../utils/formatters.js";
import type { Folder } from "../types/storage.js";
import styles from "./SearchPage.module.css";

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <ImageIcon size={18} aria-hidden="true" />;
  if (mimeType.includes("pdf") || mimeType.includes("document")) return <FileText size={18} aria-hidden="true" />;
  if (mimeType.includes("json") || mimeType.includes("javascript") || mimeType.includes("text")) return <FileCode size={18} aria-hidden="true" />;
  return <File size={18} aria-hidden="true" />;
}

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryFromUrl = searchParams.get("q") || "";
  const [inputValue, setInputValue] = useState(queryFromUrl);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync input value with URL search parameter
  useEffect(() => {
    setInputValue(queryFromUrl);
  }, [queryFromUrl]);

  const trimmedQuery = queryFromUrl.trim();
  const isValidQuery = trimmedQuery.length >= 2 && trimmedQuery.length <= 100;

  // TanStack Query search execution
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["search", trimmedQuery],
    queryFn: () => searchApi(trimmedQuery),
    enabled: isValidQuery
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();

    if (text.length < 2 || text.length > 100) {
      setValidationError("Search query must be between 2 and 100 characters");
      return;
    }

    setValidationError(null);
    setSearchParams({ q: text });
  };

  const handleOpenFolderResult = (folder: Folder) => {
    navigate("/storage", {
      state: { initialFolder: { id: folder.id, name: folder.name } }
    });
  };

  const { folders = [], files = [], total = 0 } = data || {};

  return (
    <div className={styles.container}>
      {/* Search Form Card */}
      <div className={styles.searchCard}>
        <form onSubmit={handleSubmit} className={styles.searchForm}>
          <label htmlFor="search-input" className={styles.label}>
            Search Files and Folders
          </label>
          <div className={styles.inputGroup}>
            <input
              id="search-input"
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="Enter folder or file name…"
              className={styles.searchInput}
            />
            <button type="submit" className={styles.submitButton}>
              <SearchIcon size={18} aria-hidden="true" />
              <span>Search</span>
            </button>
          </div>
          {validationError && <span className={styles.validationError}>{validationError}</span>}
        </form>
      </div>

      {/* Results Header / Summary */}
      {isValidQuery && !isLoading && !isError && (
        <div className={styles.summaryBar}>
          <span>
            {total} {total === 1 ? "result" : "results"} found for &quot;{trimmedQuery}&quot;
          </span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className={styles.section} data-testid="search-loading">
          <div className={styles.searchCard} style={{ opacity: 0.6 }}>Searching storage system…</div>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className={styles.errorBanner} role="alert" data-testid="search-error">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={20} aria-hidden="true" />
            <span>{getErrorMessage(error, "Failed to complete search")}</span>
          </div>
          <button type="button" onClick={() => refetch()} className={styles.retryButton}>
            Retry Search
          </button>
        </div>
      )}

      {/* Prompt / Empty State */}
      {!queryFromUrl && (
        <div className={styles.emptyState} data-testid="search-prompt">
          <SearchIcon size={48} aria-hidden="true" />
          <h3>Global Storage Search</h3>
          <p>Enter a keyword above to find matching folders and files across the system.</p>
        </div>
      )}

      {/* Results Rendering */}
      {isValidQuery && !isLoading && !isError && (
        <>
          {total === 0 ? (
            <div className={styles.emptyState} data-testid="search-empty">
              <SearchIcon size={48} aria-hidden="true" />
              <h3>No results found</h3>
              <p>No files or folders match &quot;{trimmedQuery}&quot;.</p>
            </div>
          ) : (
            <>
              {/* Folders Result Group */}
              {folders.length > 0 && (
                <section className={styles.section} aria-label="Folder Search Results">
                  <h2 className={styles.sectionHeader}>Folders ({folders.length})</h2>
                  <div className={styles.folderGrid}>
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => handleOpenFolderResult(folder)}
                        className={styles.folderCard}
                      >
                        <FolderIcon size={24} style={{ color: "var(--color-primary)", flexShrink: 0 }} aria-hidden="true" />
                        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                          <span className={styles.fileName}>{folder.name}</span>
                          <span className={styles.fileMeta}>
                            Updated {formatDate(folder.updatedAt || folder.createdAt)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Files Result Group */}
              {files.length > 0 && (
                <section className={styles.section} aria-label="File Search Results">
                  <h2 className={styles.sectionHeader}>Files ({files.length})</h2>
                  <div className={styles.fileList}>
                    {files.map((file) => (
                      <Link key={file.id} to={`/files/${file.id}`} className={styles.fileCard}>
                        <div className={styles.fileMain}>
                          <span className={styles.fileIcon}>{getFileIcon(file.mimeType)}</span>
                          <div className={styles.fileInfo}>
                            <span className={styles.fileName}>{file.name}</span>
                            <span className={styles.fileMeta}>{getFileTypeLabel(file.mimeType)}</span>
                          </div>
                        </div>

                        <div className={styles.fileRight}>
                          <span>{formatBytes(file.sizeBytes)}</span>
                          <span>{formatDate(file.updatedAt || file.createdAt)}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};
