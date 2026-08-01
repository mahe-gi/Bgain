import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Folder as FolderIcon, ChevronRight, ArrowLeft, AlertCircle } from "lucide-react";
import { Modal } from "./Modal.js";
import { getFoldersApi, updateFolderApi } from "../../api/storage.api.js";
import { updateFileApi } from "../../api/file.api.js";
import { getErrorMessage } from "../../api/client.js";
import type { BreadcrumbItem } from "../../types/storage.js";
import styles from "./MoveItemDialog.module.css";

export interface MoveItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    name: string;
    type: "folder" | "file";
    currentParentId: string | null; // null for root, or folder UUID
  } | null;
  onSuccessMessage?: (msg: string) => void;
}

export const MoveItemDialog: React.FC<MoveItemDialogProps> = ({
  isOpen,
  onClose,
  item,
  onSuccessMessage
}) => {
  const [pickerBreadcrumbs, setPickerBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: "root", name: "Storage (Root)" }
  ]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const currentPickerFolder = pickerBreadcrumbs[pickerBreadcrumbs.length - 1];
  const destFolderId = currentPickerFolder.id === "root" ? null : currentPickerFolder.id;

  useEffect(() => {
    if (isOpen) {
      setPickerBreadcrumbs([{ id: "root", name: "Storage (Root)" }]);
      setErrorMsg(null);
    }
  }, [isOpen]);

  // Fetch direct child folders for the picker's current location
  const { data: rawFolders = [], isLoading: isPickerLoading } = useQuery({
    queryKey: ["picker-folders", currentPickerFolder.id],
    queryFn: () => getFoldersApi({ parentId: currentPickerFolder.id }),
    enabled: isOpen
  });

  // Filter out the source folder if moving a folder (prevents self/child cycle navigation)
  const pickerFolders = rawFolders.filter((f) => {
    if (item?.type === "folder" && f.id === item.id) return false;
    return true;
  });

  // Disable "Move Here" if currently viewing the item's existing parent folder
  const isSameLocation = destFolderId === (item?.currentParentId ?? null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!item) throw new Error("No item selected");
      if (item.type === "folder") {
        return updateFolderApi(item.id, { parentId: destFolderId });
      } else {
        return updateFileApi(item.id, { folderId: destFolderId });
      }
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
      if (item) {
        queryClient.invalidateQueries({ queryKey: ["file", item.id] });
      }
      const destName = currentPickerFolder.name;
      if (onSuccessMessage) {
        onSuccessMessage(`Moved "${updated.name}" to ${destName}.`);
      }
      onClose();
    },
    onError: (err) => {
      setErrorMsg(getErrorMessage(err, "Failed to move item"));
    }
  });

  const handleOpenPickerFolder = (folder: { id: string; name: string }) => {
    setPickerBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleNavigatePickerBreadcrumb = (idx: number) => {
    setPickerBreadcrumbs((prev) => prev.slice(0, idx + 1));
  };

  const handlePopBreadcrumb = () => {
    if (pickerBreadcrumbs.length > 1) {
      setPickerBreadcrumbs((prev) => prev.slice(0, prev.length - 1));
    }
  };

  if (!item) return null;

  const hasParentFolder = pickerBreadcrumbs.length > 1;
  const parentFolderName = hasParentFolder
    ? pickerBreadcrumbs[pickerBreadcrumbs.length - 2].name
    : "";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={item.type === "folder" ? `Move Folder "${item.name}"` : `Move File "${item.name}"`}
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
            disabled={mutation.isPending || isSameLocation}
            className="primary-btn"
          >
            {mutation.isPending ? "Moving…" : isSameLocation ? "Already here" : "Move Here"}
          </button>
        </>
      }
    >
      <div className={styles.container}>
        {errorMsg && (
          <div role="alert" className="error-banner">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Destination Banner */}
        <div className={styles.destBanner}>
          <span className={styles.destLabel}>Current Destination</span>
          <span className={styles.destValue}>{currentPickerFolder.name}</span>
        </div>

        {/* Navigation Header: Back Button & Breadcrumbs */}
        <div className={styles.navHeader}>
          {hasParentFolder && (
            <button
              type="button"
              onClick={handlePopBreadcrumb}
              className={styles.backButton}
              aria-label={`Back to ${parentFolderName}`}
            >
              <ArrowLeft size={14} aria-hidden="true" />
              <span>Back to {parentFolderName}</span>
            </button>
          )}

          {/* Clickable Breadcrumbs */}
          <nav aria-label="Picker Breadcrumb" className={styles.breadcrumbNav}>
            {pickerBreadcrumbs.map((crumb, idx) => {
              const isLast = idx === pickerBreadcrumbs.length - 1;
              return (
                <span key={crumb.id} className={styles.breadcrumbItem}>
                  {isLast ? (
                    <strong className={styles.breadcrumbCurrent}>{crumb.name}</strong>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleNavigatePickerBreadcrumb(idx)}
                        className={styles.breadcrumbButton}
                      >
                        {crumb.name}
                      </button>
                      <ChevronRight size={12} className={styles.separator} aria-hidden="true" />
                    </>
                  )}
                </span>
              );
            })}
          </nav>
        </div>

        {/* Scrollable Folder List */}
        <div className={styles.folderListContainer}>
          {isPickerLoading ? (
            <div className={styles.loadingText}>Loading folders…</div>
          ) : pickerFolders.length === 0 ? (
            <div className={styles.emptyText}>No subfolders in this location.</div>
          ) : (
            pickerFolders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => handleOpenPickerFolder(folder)}
                className={styles.folderRow}
                aria-label={`Open folder ${folder.name}`}
              >
                <div className={styles.folderRowLeft}>
                  <FolderIcon size={18} className={styles.folderIcon} aria-hidden="true" />
                  <span className={styles.folderName}>{folder.name}</span>
                </div>
                <ChevronRight size={16} className={styles.chevronIcon} aria-hidden="true" />
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
