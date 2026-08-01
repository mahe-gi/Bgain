import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import styles from "./PlaceholderPage.module.css";

export const ForbiddenPage: React.FC = () => {
  return (
    <div className={styles.container}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--color-danger)" }}>
        <ShieldAlert size={32} />
        <h2 className={styles.title} style={{ color: "var(--color-danger)" }}>403 - Access Denied</h2>
      </div>
      <p className={styles.description}>
        You do not have permission to access this page. Administrator privileges are required.
      </p>
      <Link to="/dashboard" className={styles.buttonLink}>
        Return to Dashboard
      </Link>
    </div>
  );
};
