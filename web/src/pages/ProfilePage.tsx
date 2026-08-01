import React from "react";
import { Shield, Eye } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { formatDate } from "../utils/formatters.js";
import styles from "./PlaceholderPage.module.css";

function getInitials(name: string): string {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const isAdmin = user.role === "ADMIN";

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Profile</h1>
      <p className={styles.description}>Your account details and access level.</p>

      <div className={styles.profileCardSurface}>
        <div className={styles.avatarHeader}>
          <div className={styles.profileAvatar}>{getInitials(user.name)}</div>
          <div className={styles.avatarMeta}>
            <h2 className={styles.profileName}>{user.name}</h2>
            <span className={styles.profileEmail}>{user.email}</span>
          </div>
        </div>

        <hr className={styles.divider} />

        <div className={styles.profileMetadataGrid}>
          <div className={styles.metaItem}>
            <span className={styles.profileLabel}>Role Level</span>
            <div className={styles.profileValue}>
              {isAdmin ? (
                <span className={styles.badgeAdmin}>
                  <Shield size={12} aria-hidden="true" />
                  <span>ADMIN</span>
                </span>
              ) : (
                <span className={styles.badgeViewer}>
                  <Eye size={12} aria-hidden="true" />
                  <span>VIEWER</span>
                </span>
              )}
            </div>
          </div>

          <div className={styles.metaItem}>
            <span className={styles.profileLabel}>Member Since</span>
            <span className={styles.profileValue}>{formatDate(user.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
