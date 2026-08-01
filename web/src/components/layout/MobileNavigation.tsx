import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Folder,
  Search,
  Users,
  User
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import styles from "./MobileNavigation.module.css";

export const MobileNavigation: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  return (
    <nav className={styles.mobileNav} aria-label="Mobile Bottom Navigation">
      <ul className={styles.navList}>
        <li className={styles.navItem}>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ""}`
            }
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
        </li>

        <li className={styles.navItem}>
          <NavLink
            to="/storage"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ""}`
            }
          >
            <Folder size={20} />
            <span>Storage</span>
          </NavLink>
        </li>

        <li className={styles.navItem}>
          <NavLink
            to="/search"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ""}`
            }
          >
            <Search size={20} />
            <span>Search</span>
          </NavLink>
        </li>

        {isAdmin && (
          <li className={styles.navItem}>
            <NavLink
              to="/users"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ""}`
              }
            >
              <Users size={20} />
              <span>Users</span>
            </NavLink>
          </li>
        )}

        <li className={styles.navItem}>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ""}`
            }
          >
            <User size={20} />
            <span>Profile</span>
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};
