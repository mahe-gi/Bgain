import React from "react";
import { Link } from "react-router-dom";
import { HelpCircle } from "lucide-react";
import styles from "./PlaceholderPage.module.css";

export const NotFoundPage: React.FC = () => {
  return (
    <div className={styles.container}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--color-text-secondary)" }}>
        <HelpCircle size={32} />
        <h2 className={styles.title}>404 - Page Not Found</h2>
      </div>
      <p className={styles.description}>
        The requested page does not exist or has been moved.
      </p>
      <Link to="/dashboard" className={styles.buttonLink}>
        Return to Dashboard
      </Link>
    </div>
  );
};
