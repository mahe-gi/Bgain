import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  FolderOpen,
  FolderPlus,
  Upload,
  Edit2,
  FolderInput,
  Trash2,
  CheckCircle,
  Lock
} from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { getFoldersApi, getFilesApi } from "../api/storage.api.js";
import { getErrorMessage } from "../api/client.js";
import { formatBytes, formatDate, getFileTypeLabel } from "../utils/formatters.js";
import type { BreadcrumbItem, SortOptionValue, StorageSortField, SortOrder, Folder } from "../types/storage.js";
import { CreateFolderDialog } from "../components/dialogs/CreateFolderDialog.js";
import { UploadFileDialog } from "../components/dialogs/UploadFileDialog.js";
import { RenameItemDialog } from "../components/dialogs/RenameItemDialog.js";
import { MoveItemDialog } from "../components/dialogs/MoveItemDialog.js";
import { DeleteConfirmDialog } from "../components/dialogs/DeleteConfirmDialog.js";
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
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state as { initialFolder?: { id: string; name: string } } | null;

  // Navigation State
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>(() => {
    if (locationState?.initialFolder) {
      return [
        { id: "root", name: "Storage" },
        { id: locationState.initialFolder.id, name: locationState.initialFolder.name }
      ];
    }
    return [{ id: "root", name: "Storage" }];
  });

  // Clear consumed navigation state
  useEffect(() => {
    if (locationState?.initialFolder) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [locationState, location.pathname, navigate]);

  const [sortOption, setSortOption] = useState<SortOptionValue>("name_asc");
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Admin Dialog States
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isUploadFileOpen, setIsUploadFileOpen] = useState(false);
  const [renameItem, setRenameItem] = useState<{ id: string; name: string; type: "folder" | "file" } | null>(null);
  const [moveItem, setMoveItem] = useState<{ id: string; name: string; type: "folder" | "file"; currentParentId: string | null } | null>(null);
  const [deleteItem, setDeleteItem] = useState<{ id: string; name: string; type: "folder" | "file" } | null>(null);

  const currentFolder = breadcrumbs[breadcrumbs.length - 1];
  const { sortBy, order } = parseSortOption(sortOption);

  // TanStack Query for Folders and Files
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

  const showSuccessMessage = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const folders = foldersQuery.data || [];
  const files = filesQuery.data || [];
  const isRoot = breadcrumbs.length === 1;

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerTitleGroup}>
          <h1 className={styles.pageTitle}>Storage</h1>
          <p className={styles.pageSubtitle}>
            {isRoot
              ? "All files and folders in root storage"
              : `Folder: ${currentFolder.name}`}
          </p>
        </div>

        <div className={styles.actionsGroup}>
          {isAdmin ? (
            <>
              <button
                type="button"
                onClick={() => setIsUploadFileOpen(true)}
                className={styles.uploadPrimaryBtn}
                aria-label="Upload file to current location"
              >
                <Upload size={16} aria-hidden="true" />
                <span>Upload File</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCreateFolderOpen(true)}
                className={styles.newFolderSecondaryBtn}
                aria-label="Create new folder in current location"
              >
                <FolderPlus size={16} aria-hidden="true" />
                <span>New Folder</span>
              </button>
            </>
          ) : (
            <div className={styles.readOnlyBadge}>
              <Lock size={14} aria-hidden="true" />
              <span>Read-Only Access</span>
            </div>
          )}

          <div className={styles.sortGroup}>
            <label htmlFor="sort-select" className={styles.sortLabel}>
              Sort by
            </label>
            <select
              id="sort-select"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOptionValue)}
              className={styles.sortSelect}
              style={{ colorScheme: "dark" }}
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
            <RefreshCw size={14} className={isRefetching ? "spinner" : ""} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Render Location Bar Only for Nested Folders */}
      {!isRoot && (
        <div className={styles.locationBar}>
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
        </div>
      )}

      {/* Success Notification Banner */}
      {successBanner && (
        <div className={styles.successBanner} role="status">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle size={18} aria-hidden="true" />
            <span>{successBanner}</span>
          </div>
          <button type="button" onClick={() => setSuccessBanner(null)} className={styles.actionBtn} aria-label="Dismiss message">
            ✕
          </button>
        </div>
      )}

      {/* Folder Error State */}
      {foldersQuery.isError && (
        <div className={styles.errorBanner} role="alert" data-testid="folder-error">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
            <div className={styles.folderCardWrapper} style={{ opacity: 0.6 }}>Loading storage…</div>
            <div className={styles.folderCardWrapper} style={{ opacity: 0.6 }}>Loading storage…</div>
          </div>
        </div>
      )}

      {/* Main Content Areas */}
      {!isLoading && !foldersQuery.isError && !filesQuery.isError && (
        <>
          {folders.length === 0 && files.length === 0 ? (
            <div className={styles.emptyState} data-testid="storage-empty">
              <FolderOpen size={40} className={styles.emptyIcon} aria-hidden="true" />
              <h3 className={styles.emptyTitle}>This folder is empty</h3>
              <p className={styles.emptyText}>No subfolders or files exist in this location.</p>
              {isAdmin ? (
                <div className={styles.emptyActions}>
                  <button
                    type="button"
                    onClick={() => setIsUploadFileOpen(true)}
                    className={styles.uploadPrimaryBtn}
                  >
                    <Upload size={14} aria-hidden="true" />
                    <span>Upload File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreateFolderOpen(true)}
                    className={styles.newFolderSecondaryBtn}
                  >
                    <FolderPlus size={14} aria-hidden="true" />
                    <span>New Folder</span>
                  </button>
                </div>
              ) : (
                <span className={styles.emptyNotice}>Read-only storage location</span>
              )}
            </div>
          ) : (
            <>
              {/* Folders Section */}
              {folders.length > 0 && (
                <section className={styles.section} aria-label="Folders">
                  <h2 className={styles.sectionHeader}>Folders ({folders.length})</h2>
                  <div className={styles.folderGrid}>
                    {folders.map((folder) => (
                      <div key={folder.id} className={styles.folderCardWrapper}>
                        <button
                          type="button"
                          onClick={() => handleOpenFolder(folder)}
                          className={styles.folderCardMain}
                        >
                          <FolderIcon size={20} className={styles.folderIcon} aria-hidden="true" />
                          <div className={styles.folderMeta}>
                            <span className={styles.folderName} title={folder.name}>{folder.name}</span>
                            <span className={styles.folderDate}>{formatDate(folder.createdAt)}</span>
                          </div>
                        </button>

                        {isAdmin && (
                          <div className={styles.itemActions}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenameItem({ id: folder.id, name: folder.name, type: "folder" });
                              }}
                              className={styles.actionBtn}
                              aria-label={`Rename folder ${folder.name}`}
                              title={`Rename ${folder.name}`}
                            >
                              <Edit2 size={18} aria-hidden="true" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMoveItem({
                                  id: folder.id,
                                  name: folder.name,
                                  type: "folder",
                                  currentParentId: currentFolder.id === "root" ? null : currentFolder.id
                                });
                              }}
                              className={styles.actionBtn}
                              aria-label={`Move folder ${folder.name}`}
                              title={`Move ${folder.name}`}
                            >
                              <FolderInput size={18} aria-hidden="true" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteItem({ id: folder.id, name: folder.name, type: "folder" });
                              }}
                              className={`${styles.actionBtn} ${styles.dangerActionBtn}`}
                              aria-label={`Delete folder ${folder.name}`}
                              title={`Delete ${folder.name}`}
                            >
                              <Trash2 size={18} aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Files Section */}
              {files.length > 0 && (
                <section className={styles.section} aria-label="Files">
                  <h2 className={styles.sectionHeader}>Files ({files.length})</h2>

                  {/* Desktop File Table */}
                  <div className={styles.tableWrapper}>
                    <table className={styles.fileTable}>
                      <thead>
                        <tr>
                          <th scope="col">Name</th>
                          <th scope="col">Size</th>
                          <th scope="col">Type</th>
                          <th scope="col">Modified</th>
                          <th scope="col" style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {files.map((file) => (
                          <tr key={file.id}>
                            <td>
                              <div className={styles.tableNameCell}>
                                <span className={styles.folderIcon}>{getFileIcon(file.mimeType)}</span>
                                <Link to={`/files/${file.id}`} className={styles.fileNameLink} title={file.name}>
                                  {file.name}
                                </Link>
                              </div>
                            </td>
                            <td>{formatBytes(file.sizeBytes)}</td>
                            <td>{getFileTypeLabel(file.mimeType)}</td>
                            <td>{formatDate(file.updatedAt || file.createdAt)}</td>
                            <td style={{ textAlign: "right" }}>
                              <div className={styles.itemActions} style={{ justifyContent: "flex-end" }}>
                                <Link
                                  to={`/files/${file.id}`}
                                  className={styles.actionBtnText}
                                  aria-label={`View details for ${file.name}`}
                                >
                                  Details
                                </Link>

                                {isAdmin && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRenameItem({ id: file.id, name: file.name, type: "file" });
                                      }}
                                      className={styles.actionBtn}
                                      aria-label={`Rename file ${file.name}`}
                                      title={`Rename ${file.name}`}
                                    >
                                      <Edit2 size={18} aria-hidden="true" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMoveItem({
                                          id: file.id,
                                          name: file.name,
                                          type: "file",
                                          currentParentId: currentFolder.id === "root" ? null : currentFolder.id
                                        });
                                      }}
                                      className={styles.actionBtn}
                                      aria-label={`Move file ${file.name}`}
                                      title={`Move ${file.name}`}
                                    >
                                      <FolderInput size={18} aria-hidden="true" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteItem({ id: file.id, name: file.name, type: "file" });
                                      }}
                                      className={`${styles.actionBtn} ${styles.dangerActionBtn}`}
                                      aria-label={`Delete file ${file.name}`}
                                      title={`Delete ${file.name}`}
                                    >
                                      <Trash2 size={18} aria-hidden="true" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
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
                          <div className={styles.tableNameCell}>
                            <span className={styles.folderIcon}>{getFileIcon(file.mimeType)}</span>
                            <Link to={`/files/${file.id}`} className={styles.fileNameLink} title={file.name}>
                              {file.name}
                            </Link>
                          </div>

                          <div className={styles.itemActions}>
                            {isAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRenameItem({ id: file.id, name: file.name, type: "file" });
                                  }}
                                  className={styles.actionBtn}
                                  aria-label={`Rename file ${file.name}`}
                                  title={`Rename ${file.name}`}
                                >
                                  <Edit2 size={18} aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMoveItem({
                                      id: file.id,
                                      name: file.name,
                                      type: "file",
                                      currentParentId: currentFolder.id === "root" ? null : currentFolder.id
                                    });
                                  }}
                                  className={styles.actionBtn}
                                  aria-label={`Move file ${file.name}`}
                                  title={`Move ${file.name}`}
                                >
                                  <FolderInput size={18} aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteItem({ id: file.id, name: file.name, type: "file" });
                                  }}
                                  className={`${styles.actionBtn} ${styles.dangerActionBtn}`}
                                  aria-label={`Delete file ${file.name}`}
                                  title={`Delete ${file.name}`}
                                >
                                  <Trash2 size={18} aria-hidden="true" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <div className={styles.mobileFileDetails}>
                          <span>{formatBytes(file.sizeBytes)}</span>
                          <span>{getFileTypeLabel(file.mimeType)}</span>
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

      {/* Admin Mutation Dialogs */}
      {isAdmin && (
        <>
          <CreateFolderDialog
            isOpen={isCreateFolderOpen}
            onClose={() => setIsCreateFolderOpen(false)}
            currentFolderId={currentFolder.id}
            onSuccessMessage={(msg) => {
              showSuccessMessage(msg);
              foldersQuery.refetch();
            }}
          />

          <UploadFileDialog
            isOpen={isUploadFileOpen}
            onClose={() => setIsUploadFileOpen(false)}
            currentFolderId={currentFolder.id}
            onSuccessMessage={(msg) => {
              showSuccessMessage(msg);
              filesQuery.refetch();
            }}
          />

          {renameItem && (
            <RenameItemDialog
              isOpen={Boolean(renameItem)}
              onClose={() => setRenameItem(null)}
              item={renameItem}
              onSuccessMessage={(msg) => {
                showSuccessMessage(msg);
                if (renameItem.type === "folder") foldersQuery.refetch();
                else filesQuery.refetch();
              }}
            />
          )}

          {moveItem && (
            <MoveItemDialog
              isOpen={Boolean(moveItem)}
              onClose={() => setMoveItem(null)}
              item={moveItem}
              onSuccessMessage={(msg) => {
                showSuccessMessage(msg);
                if (moveItem.type === "folder") foldersQuery.refetch();
                else filesQuery.refetch();
              }}
            />
          )}

          {deleteItem && (
            <DeleteConfirmDialog
              isOpen={Boolean(deleteItem)}
              onClose={() => setDeleteItem(null)}
              item={deleteItem}
              onDeletedSuccess={() => {
                showSuccessMessage(`${deleteItem.type === "folder" ? "Folder" : "File"} deleted successfully.`);
                if (deleteItem.type === "folder") foldersQuery.refetch();
                else filesQuery.refetch();
              }}
            />
          )}
        </>
      )}
    </div>
  );
};
