import React from "react";
import styles from "./PlaceholderPage.module.css";

export const UsersPage: React.FC = () => {
  return (
    <div className={styles.container}>
      <span className={styles.badge}>Admin Only</span>
      <h2 className={styles.title}>User Management</h2>
      <p className={styles.description}>
        User management, role assignment, and user creation interface will be implemented in Phase 2.
      </p>
    </div>
  );
};
