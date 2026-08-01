import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Folder,
  Search,
  Users,
  User,
  HardDrive
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import styles from "./Sidebar.module.css";

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  return (
    <aside className={styles.sidebar} aria-label="Main Navigation">
      <div className={styles.brand}>
        <HardDrive className={styles.brandIcon} size={24} />
        <span className={styles.brandName}>Secure Storage</span>
      </div>

      <nav className={styles.nav}>
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `${styles.navItem} ${isActive ? styles.active : ""}`
          }
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/storage"
          className={({ isActive }) =>
            `${styles.navItem} ${isActive ? styles.active : ""}`
          }
        >
          <Folder size={18} />
          <span>Storage</span>
        </NavLink>

        <NavLink
          to="/search"
          className={({ isActive }) =>
            `${styles.navItem} ${isActive ? styles.active : ""}`
          }
        >
          <Search size={18} />
          <span>Search</span>
        </NavLink>

        {isAdmin && (
          <NavLink
            to="/users"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ""}`
            }
          >
            <Users size={18} />
            <span>Users</span>
          </NavLink>
        )}

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `${styles.navItem} ${isActive ? styles.active : ""}`
          }
        >
          <User size={18} />
          <span>Profile</span>
        </NavLink>
      </nav>
    </aside>
  );
};
