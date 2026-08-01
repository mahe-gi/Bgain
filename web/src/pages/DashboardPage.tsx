import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Folder, FileText, HardDrive, File, Image, FileCode, AlertCircle } from "lucide-react";
import { getDashboardApi } from "../api/dashboard.api.js";
import { getErrorMessage } from "../api/client.js";
import { formatBytes, formatDate, getFileTypeLabel } from "../utils/formatters.js";
import styles from "./DashboardPage.module.css";

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image size={18} aria-hidden="true" />;
  if (mimeType.includes("pdf") || mimeType.includes("document")) return <FileText size={18} aria-hidden="true" />;
  if (mimeType.includes("json") || mimeType.includes("javascript") || mimeType.includes("text")) return <FileCode size={18} aria-hidden="true" />;
  return <File size={18} aria-hidden="true" />;
}

export const DashboardPage: React.FC = () => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboardApi
  });

  if (isLoading) {
    return (
      <div className={styles.dashboard} data-testid="dashboard-loading">
        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.skeleton}`} style={{ height: "90px" }} />
          <div className={`${styles.statCard} ${styles.skeleton}`} style={{ height: "90px" }} />
          <div className={`${styles.statCard} ${styles.skeleton}`} style={{ height: "90px" }} />
        </div>
        <div className={`${styles.section} ${styles.skeleton}`} style={{ height: "240px" }} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.dashboard} data-testid="dashboard-error">
        <div className={styles.errorBanner} role="alert">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={20} aria-hidden="true" />
            <span>{getErrorMessage(error, "Failed to load dashboard data")}</span>
          </div>
          <button type="button" onClick={() => refetch()} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { folderCount = 0, fileCount = 0, totalSizeBytes = 0, recentFiles = [] } = data || {};

  return (
    <div className={styles.dashboard}>
      {/* Three Statistic Cards (No totalUsers) */}
      <section className={styles.statsGrid} aria-label="Storage Statistics">
        <div className={styles.statCard}>
          <div className={styles.statIconContainer}>
            <Folder size={24} aria-hidden="true" />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Total Folders</span>
            <span className={styles.statValue}>{folderCount}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconContainer}>
            <FileText size={24} aria-hidden="true" />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Total Files</span>
            <span className={styles.statValue}>{fileCount}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconContainer}>
            <HardDrive size={24} aria-hidden="true" />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Storage Used</span>
            <span className={styles.statValue}>{formatBytes(totalSizeBytes)}</span>
          </div>
        </div>
      </section>

      {/* Recent Files Section */}
      <section className={styles.section} aria-label="Recent Files">
        <h2 className={styles.sectionTitle}>Recent Files</h2>

        {recentFiles.length === 0 ? (
          <div className={styles.emptyState}>
            <FileText size={36} aria-hidden="true" />
            <p>No recent files uploaded yet.</p>
          </div>
        ) : (
          <div className={styles.fileList}>
            {recentFiles.slice(0, 5).map((file) => (
              <div key={file.id} className={styles.fileItem}>
                <div className={styles.fileMain}>
                  <span className={styles.fileIcon}>{getFileIcon(file.mimeType)}</span>
                  <div className={styles.fileInfo}>
                    <span className={styles.fileName}>{file.name}</span>
                    <span className={styles.fileMeta}>{getFileTypeLabel(file.mimeType)}</span>
                  </div>
                </div>

                <div className={styles.fileSizeDate}>
                  <span>{formatBytes(file.sizeBytes)}</span>
                  <span>{formatDate(file.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
