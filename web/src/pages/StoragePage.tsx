import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Folder as FolderIcon,
  FileText,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  File,
  Image,
  FileCode,
  FolderOpen
} from "lucide-react";
import { getFoldersApi, getFilesApi } from "../api/storage.api.js";
import { getErrorMessage } from "../api/client.js";
import { formatBytes, formatDate, getFileTypeLabel } from "../utils/formatters.js";
import type { BreadcrumbItem, SortOptionValue, StorageSortField, SortOrder, Folder } from "../types/storage.js";
import styles from "./StoragePage.module.css";

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image size={18} aria-hidden="true" />;
  if (mimeType.includes("pdf") || mimeType.includes("document")) return <FileText size={18} aria-hidden="true" />;
  if (mimeType.includes("json") || mimeType.includes("javascript") || mimeType.includes("text")) return <FileCode size={18} aria-hidden="true" />;
  return <File size={18} aria-hidden="true" />;
}

function parseSortOption(sortOption: SortOptionValue): { sortBy: StorageSortField; order: SortOrder } {
  switch (sortOption) {
    case "name_asc":
      return { sortBy: "name", order: "asc" };
    case "name_desc":
      return { sortBy: "name", order: "desc" };
    case "newest":
      return { sortBy: "createdAt", order: "desc" };
    case "oldest":
      return { sortBy: "createdAt", order: "asc" };
    default:
      return { sortBy: "name", order: "asc" };
  }
}

export const StoragePage: React.FC = () => {
  // Navigation State
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: "root", name: "Storage" }
  ]);
  const [sortOption, setSortOption] = useState<SortOptionValue>("name_asc");

  const currentFolder = breadcrumbs[breadcrumbs.length - 1];
  const { sortBy, order } = parseSortOption(sortOption);

  // Separate TanStack Query queries for Folders and Files
  const foldersQuery = useQuery({
    queryKey: ["folders", currentFolder.id, sortBy, order],
    queryFn: () => getFoldersApi({ parentId: currentFolder.id, sortBy, order })
  });

  const filesQuery = useQuery({
    queryKey: ["files", currentFolder.id, sortBy, order],
    queryFn: () => getFilesApi({ folderId: currentFolder.id, sortBy, order })
  });

  const isLoading = foldersQuery.isLoading || filesQuery.isLoading;
  const isRefetching = foldersQuery.isRefetching || filesQuery.isRefetching;

  const handleOpenFolder = (folder: Folder) => {
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleNavigateBreadcrumb = (index: number) => {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  };

  const handleRefresh = async () => {
    await Promise.all([foldersQuery.refetch(), filesQuery.refetch()]);
  };

  const folders = foldersQuery.data || [];
  const files = filesQuery.data || [];

  return (
    <div className={styles.container}>
      {/* Top Controls Bar: Breadcrumbs, Sorting & Refresh */}
      <div className={styles.controlsBar}>
        <nav aria-label="Folder Breadcrumb Navigation" className={styles.breadcrumbNav}>
          <ol className={styles.breadcrumbList}>
            {breadcrumbs.map((item, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <li key={item.id} className={styles.breadcrumbItem}>
                  {isLast ? (
                    <span className={styles.breadcrumbCurrent} aria-current="page">
                      {item.name}
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleNavigateBreadcrumb(idx)}
                        className={styles.breadcrumbButton}
                      >
                        {item.name}
                      </button>
                      <ChevronRight size={14} className={styles.separator} aria-hidden="true" />
                    </>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className={styles.actionsGroup}>
          <div className={styles.sortGroup}>
            <label htmlFor="sort-select" className={styles.sortLabel}>
              Sort by
            </label>
            <select
              id="sort-select"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOptionValue)}
              className={styles.sortSelect}
            >
              <option value="name_asc">Name A–Z</option>
              <option value="name_desc">Name Z–A</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefetching || isLoading}
            className={styles.refreshButton}
            aria-label="Refresh storage content"
          >
            <RefreshCw size={16} className={isRefetching ? "spinner" : ""} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      {!isLoading && !foldersQuery.isError && !filesQuery.isError && (
        <div className={styles.summaryBar}>
          <span>
            {folders.length} {folders.length === 1 ? "folder" : "folders"},{" "}
            {files.length} {files.length === 1 ? "file" : "files"}
          </span>
        </div>
      )}

      {/* Folder Error State */}
      {foldersQuery.isError && (
        <div className={styles.errorBanner} role="alert" data-testid="folder-error">
          <div style={{ display: "flex", items: "center", gap: "8px" }}>
            <AlertCircle size={20} aria-hidden="true" />
            <span>{getErrorMessage(foldersQuery.error, "Failed to load folders")}</span>
          </div>
          <button type="button" onClick={() => foldersQuery.refetch()} className={styles.retryButton}>
            Retry Folders
          </button>
        </div>
      )}

      {/* File Error State */}
      {filesQuery.isError && (
        <div className={styles.errorBanner} role="alert" data-testid="file-error">
          <div style={{ display: "flex", items: "center", gap: "8px" }}>
            <AlertCircle size={20} aria-hidden="true" />
            <span>{getErrorMessage(filesQuery.error, "Failed to load files")}</span>
          </div>
          <button type="button" onClick={() => filesQuery.refetch()} className={styles.retryButton}>
            Retry Files
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className={styles.section} data-testid="storage-loading">
          <div className={styles.folderGrid}>
            <div className={styles.folderCard} style={{ opacity: 0.6 }}>Loading folders…</div>
            <div className={styles.folderCard} style={{ opacity: 0.6 }}>Loading folders…</div>
          </div>
        </div>
      )}

      {/* Main Content Areas */}
      {!isLoading && !foldersQuery.isError && !filesQuery.isError && (
        <>
          {folders.length === 0 && files.length === 0 ? (
            <div className={styles.emptyState} data-testid="storage-empty">
              <FolderOpen size={48} aria-hidden="true" />
              <h3>This folder is empty</h3>
              <p>No subfolders or files exist in this location.</p>
            </div>
          ) : (
            <>
              {/* Folders Section */}
              {folders.length > 0 && (
                <section className={styles.section} aria-label="Folders">
                  <h2 className={styles.sectionHeader}>Folders</h2>
                  <div className={styles.folderGrid}>
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => handleOpenFolder(folder)}
                        className={styles.folderCard}
                      >
                        <FolderIcon size={24} className={styles.folderIcon} aria-hidden="true" />
                        <div className={styles.folderMeta}>
                          <span className={styles.folderName}>{folder.name}</span>
                          <span className={styles.folderDate}>
                            Updated {formatDate(folder.updatedAt || folder.createdAt)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Files Section */}
              {files.length > 0 && (
                <section className={styles.section} aria-label="Files">
                  <h2 className={styles.sectionHeader}>Files</h2>

                  {/* Desktop Table View */}
                  <div className={styles.tableWrapper}>
                    <table className={styles.fileTable}>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Type</th>
                          <th>Size</th>
                          <th>Modified</th>
                        </tr>
                      </thead>
                      <tbody>
                        {files.map((file) => (
                          <tr key={file.id}>
                            <td>
                              <div className={styles.tableNameCell}>
                                {getFileIcon(file.mimeType)}
                                <span>{file.name}</span>
                              </div>
                            </td>
                            <td>{getFileTypeLabel(file.mimeType)}</td>
                            <td>{formatBytes(file.sizeBytes)}</td>
                            <td>{formatDate(file.updatedAt || file.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Stacked Card View */}
                  <div className={styles.mobileFileList}>
                    {files.map((file) => (
                      <div key={file.id} className={styles.mobileFileCard}>
                        <div className={styles.mobileFileHeader}>
                          {getFileIcon(file.mimeType)}
                          <span className={styles.folderName}>{file.name}</span>
                        </div>
                        <div className={styles.mobileFileDetails}>
                          <span>{getFileTypeLabel(file.mimeType)}</span>
                          <span>{formatBytes(file.sizeBytes)}</span>
                          <span>{formatDate(file.updatedAt || file.createdAt)}</span>
                        </div>
                      </div>
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
