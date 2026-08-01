import React from "react";
import styles from "./PlaceholderPage.module.css";

export const DashboardPage: React.FC = () => {
  return (
    <div className={styles.container}>
      <span className={styles.badge}>Phase 1 Placeholder</span>
      <h2 className={styles.title}>Dashboard Overview</h2>
      <p className={styles.description}>
        Welcome to Secure Storage. Detailed metrics and summary statistics will be displayed here in Phase 2.
      </p>
    </div>
  );
};
