import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserPlus, Shield, Eye, AlertCircle, Users, CheckCircle } from "lucide-react";
import { getUsersApi } from "../api/user.api.js";
import { getErrorMessage } from "../api/client.js";
import { formatDate } from "../utils/formatters.js";
import { CreateUserDialog } from "../components/dialogs/CreateUserDialog.js";
import styles from "./UsersPage.module.css";

function getInitials(name: string): string {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

export const UsersPage: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const { data: users = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: getUsersApi
  });

  const showSuccessMessage = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  return (
    <div className={styles.container}>
      {/* Header Bar */}
      <div className={styles.headerBar}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>User Management</h1>
          <p className={styles.description}>
            Manage user accounts and roles.
          </p>
        </div>

        <div className={styles.actionsGroup}>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="primary-btn"
            aria-label="Create new user account"
          >
            <UserPlus size={16} aria-hidden="true" />
            <span>Create User</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successBanner && (
        <div className={styles.successBanner} role="status">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle size={18} aria-hidden="true" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className={styles.actionBtn}
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className={styles.errorBanner} role="alert" data-testid="users-error">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={20} aria-hidden="true" />
            <span>{getErrorMessage(error, "Failed to load user accounts")}</span>
          </div>
          <button type="button" onClick={() => refetch()} className={styles.retryButton}>
            Retry Users
          </button>
        </div>
      )}

      {/* Lightweight Table Skeleton Loading State */}
      {isLoading && (
        <div className={styles.skeletonContainer} role="status" aria-live="polite" data-testid="users-loading">
          <span className="sr-only">Loading user list…</span>
          <div className={styles.tableWrapper}>
            <table className={styles.userTable}>
              <thead>
                <tr>
                  <th scope="col">User</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Created Date</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3].map((idx) => (
                  <tr key={idx}>
                    <td><div className={styles.skeletonBox} style={{ width: "120px", height: "20px" }} /></td>
                    <td><div className={styles.skeletonBox} style={{ width: "160px", height: "20px" }} /></td>
                    <td><div className={styles.skeletonBox} style={{ width: "70px", height: "20px" }} /></td>
                    <td><div className={styles.skeletonBox} style={{ width: "90px", height: "20px" }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.mobileUserList}>
            {[1, 2].map((idx) => (
              <div key={idx} className={styles.mobileUserCard} style={{ opacity: 0.7 }}>
                <div className={styles.skeletonBox} style={{ width: "140px", height: "20px" }} />
                <div className={styles.skeletonBox} style={{ width: "180px", height: "16px", marginTop: "8px" }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User List Content */}
      {!isLoading && !isError && (
        <>
          <div className={styles.summaryBar}>
            <span>
              {users.length} {users.length === 1 ? "user" : "users"} registered
            </span>
          </div>

          {users.length === 0 ? (
            <div className={styles.emptyState} data-testid="users-empty">
              <Users size={40} aria-hidden="true" />
              <h3>No users found</h3>
              <p>No user accounts exist in the system.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={styles.tableWrapper}>
                <table className={styles.userTable}>
                  <thead>
                    <tr>
                      <th scope="col">User</th>
                      <th scope="col">Email</th>
                      <th scope="col">Role</th>
                      <th scope="col">Created Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const isAdmin = u.role === "ADMIN";
                      return (
                        <tr key={u.id}>
                          <td>
                            <div className={styles.nameCell}>
                              <div className={styles.userAvatar}>{getInitials(u.name)}</div>
                              <span>{u.name}</span>
                            </div>
                          </td>
                          <td>{u.email}</td>
                          <td>
                            <span
                              className={isAdmin ? styles.badgeAdmin : styles.badgeViewer}
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
                          </td>
                          <td>
                            {formatDate(u.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className={styles.mobileUserList}>
                {users.map((u) => {
                  const isAdmin = u.role === "ADMIN";
                  return (
                    <div key={u.id} className={styles.mobileUserCard}>
                      <div className={styles.mobileHeader}>
                        <div className={styles.nameCell}>
                          <div className={styles.userAvatar}>{getInitials(u.name)}</div>
                          <span>{u.name}</span>
                        </div>
                        <span
                          className={isAdmin ? styles.badgeAdmin : styles.badgeViewer}
                        >
                          {isAdmin ? "ADMIN" : "VIEWER"}
                        </span>
                      </div>

                      <div className={styles.mobileDetails}>
                        <span><strong>Email:</strong> {u.email}</span>
                        <span><strong>Created:</strong> {formatDate(u.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* Create User Modal Dialog */}
      <CreateUserDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccessMessage={(msg) => {
          showSuccessMessage(msg);
          refetch();
        }}
      />
    </div>
  );
};
