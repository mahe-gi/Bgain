import React from "react";
import { useAuth } from "../hooks/useAuth.js";
import styles from "./PlaceholderPage.module.css";

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Authenticated User Profile</h2>
      <p className={styles.description}>
        Your account details retrieved from the authentication session.
      </p>

      <div className={styles.profileGrid}>
        <div className={styles.profileCard}>
          <div className={styles.profileLabel}>User ID</div>
          <div className={styles.profileValue}>{user.id}</div>
        </div>

        <div className={styles.profileCard}>
          <div className={styles.profileLabel}>Full Name</div>
          <div className={styles.profileValue}>{user.name}</div>
        </div>

        <div className={styles.profileCard}>
          <div className={styles.profileLabel}>Email Address</div>
          <div className={styles.profileValue}>{user.email}</div>
        </div>

        <div className={styles.profileCard}>
          <div className={styles.profileLabel}>Assigned Role</div>
          <div className={styles.profileValue}>{user.role}</div>
        </div>

        <div className={styles.profileCard}>
          <div className={styles.profileLabel}>Account Created</div>
          <div className={styles.profileValue}>
            {new Date(user.createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric"
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
