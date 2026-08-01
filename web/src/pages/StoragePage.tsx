import React from "react";
import styles from "./PlaceholderPage.module.css";

export const StoragePage: React.FC = () => {
  return (
    <div className={styles.container}>
      <span className={styles.badge}>Phase 1 Placeholder</span>
      <h2 className={styles.title}>Storage Explorer</h2>
      <p className={styles.description}>
        Folder navigation, file uploads, previews, and downloads will be enabled here in Phase 2.
      </p>
    </div>
  );
};
