import React from "react";
import { LogOut, Shield, Eye } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import styles from "./Header.module.css";

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  // Prevent redundant "Admin ADMIN" text when user.name equals user.role
  const showName = user?.name && user.name.toLowerCase() !== user.role.toLowerCase();

  return (
    <header className={styles.header}>
      {/* Mobile Brand Identity */}
      <div className={styles.mobileBrand}>Secure Storage</div>

      {/* Empty Spacer on Desktop */}
      <div className={styles.desktopSpacer} />

      <div className={styles.userSection}>
        {user && (
          <div className={styles.userInfo}>
            {showName && <span className={styles.userName}>{user.name}</span>}
            <span
              className={`${styles.roleBadge} ${
                isAdmin ? styles.roleAdmin : styles.roleViewer
              }`}
            >
              {isAdmin ? (
                <>
                  <Shield size={12} aria-hidden="true" />
                  <span>ADMIN</span>
                </>
              ) : (
                <>
                  <Eye size={12} aria-hidden="true" />
                  <span>VIEWER</span>
                </>
              )}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          className={styles.logoutButton}
          aria-label="Log out"
        >
          <LogOut size={14} aria-hidden="true" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
