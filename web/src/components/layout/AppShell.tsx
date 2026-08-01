import React from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar.js";
import { Header } from "./Header.js";
import { MobileNavigation } from "./MobileNavigation.js";
import styles from "./AppShell.module.css";

export const AppShell: React.FC = () => {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.mainWrapper}>
        <Header />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
      <MobileNavigation />
    </div>
  );
};
