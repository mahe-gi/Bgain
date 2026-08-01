import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Folder, FileText, HardDrive, File, Image, FileCode, AlertCircle, ArrowUpRight } from "lucide-react";
import { AuthContext } from "../context/auth-context.js";
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
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboardApi
  });

  if (isLoading) {
    return (
      <div className={styles.dashboard} data-testid="dashboard-loading">
        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.skeleton}`} style={{ height: "110px" }} />
          <div className={`${styles.statCard} ${styles.skeleton}`} style={{ height: "110px" }} />
          <div className={`${styles.statCard} ${styles.skeleton}`} style={{ height: "110px" }} />
        </div>
        <div className={`${styles.section} ${styles.skeleton}`} style={{ height: "260px" }} />
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
  const userGreeting = user?.name ? `Welcome back, ${user.name}` : "System Overview";

  return (
    <div className={styles.dashboard}>
      {/* Page Header Greeting */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{userGreeting}</h1>
        <p className={styles.pageSubtitle}>Your storage overview and recent files.</p>
      </div>

      {/* Storage Metrics Grid */}
      <section className={styles.statsGrid} aria-label="Storage Statistics">
        <div className={`${styles.statCard} ${styles.primaryStatCard}`}>
          <div className={styles.primaryStatHeader}>
            <div className={styles.statIconContainerPrimary}>
              <HardDrive size={22} aria-hidden="true" />
            </div>
            <span className={styles.statLabelPrimary}>Storage Used</span>
          </div>
          <div className={styles.statValuePrimary}>{formatBytes(totalSizeBytes)}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconContainer}>
            <Folder size={20} aria-hidden="true" />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Total Folders</span>
            <span className={styles.statValue}>{folderCount}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconContainer}>
            <FileText size={20} aria-hidden="true" />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Total Files</span>
            <span className={styles.statValue}>{fileCount}</span>
          </div>
        </div>
      </section>

      {/* Main Content Area: Recent Files */}
      <section className={styles.section} aria-label="Recent Files">
        <div className={styles.sectionTitleRow}>
          <h2 className={styles.sectionTitle}>Recent Files</h2>
          <Link to="/storage" className={styles.viewStorageLink}>
            <span>Browse Storage</span>
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>

        {recentFiles.length === 0 ? (
          <div className={styles.emptyState}>
            <FileText size={36} aria-hidden="true" />
            <p>No recent files uploaded yet.</p>
          </div>
        ) : (
          <div className={styles.fileList}>
            {recentFiles.slice(0, 5).map((file) => (
              <Link key={file.id} to={`/files/${file.id}`} className={styles.fileItem}>
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
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
