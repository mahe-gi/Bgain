import React from "react";
import { useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import styles from "./Header.module.css";

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  if (pathname.startsWith("/storage")) return "Storage Management";
  if (pathname.startsWith("/search")) return "Global Search";
  if (pathname.startsWith("/users")) return "User Management";
  if (pathname.startsWith("/profile")) return "User Profile";
  return "Secure Storage";
}

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const title = getPageTitle(location.pathname);
  const isAdmin = user?.role === "ADMIN";

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>

      <div className={styles.userSection}>
        {user && (
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user.name}</span>
            <span
              className={`${styles.roleBadge} ${
                isAdmin ? styles.roleAdmin : styles.roleViewer
              }`}
            >
              {user.role}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          className={styles.logoutButton}
          aria-label="Log out"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
