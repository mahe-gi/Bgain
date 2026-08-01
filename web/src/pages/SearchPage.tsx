import React from "react";
import styles from "./PlaceholderPage.module.css";

export const SearchPage: React.FC = () => {
  return (
    <div className={styles.container}>
      <span className={styles.badge}>Phase 1 Placeholder</span>
      <h2 className={styles.title}>Global Search</h2>
      <p className={styles.description}>
        Global search across files and folders will be implemented in Phase 2.
      </p>
    </div>
  );
};
