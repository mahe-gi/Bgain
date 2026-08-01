import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserPlus, Shield, Eye, AlertCircle, RefreshCw, Users, CheckCircle } from "lucide-react";
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

  const { data: users = [], isLoading, isError, error, refetch, isRefetching } = useQuery({
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
            Manage application user accounts, roles, and security permissions.
          </p>
        </div>

        <div className={styles.actionsGroup}>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching || isLoading}
            className="secondary-btn"
            aria-label="Refresh user list"
          >
            <RefreshCw size={16} className={isRefetching ? "spinner" : ""} aria-hidden="true" />
            <span>Refresh</span>
          </button>

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

      {/* Success Notification Banner */}
      {successBanner && (
        <div className={styles.successBanner} role="status">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle size={18} aria-hidden="true" />
            <span>{successBanner}</span>
          </div>
          <button type="button" onClick={() => setSuccessBanner(null)} className="secondary-btn" aria-label="Dismiss message">
            ✕
          </button>
        </div>
      )}

      {/* Summary Bar */}
      {!isLoading && !isError && (
        <div className={styles.summaryBar}>
          <span>
            {users.length} {users.length === 1 ? "user" : "users"} registered
          </span>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className={styles.errorBanner} role="alert" data-testid="users-error">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={20} aria-hidden="true" />
            <span>{getErrorMessage(error, "Failed to load user list")}</span>
          </div>
          <button type="button" onClick={() => refetch()} className="primary-btn">
            Retry Users
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className={styles.tableWrapper} data-testid="users-loading" style={{ padding: "24px", opacity: 0.6 }}>
          Loading registered users…
        </div>
      )}

      {/* Success / Data Render */}
      {!isLoading && !isError && (
        <>
          {users.length === 0 ? (
            <div className={styles.emptyState} data-testid="users-empty">
              <Users size={48} aria-hidden="true" />
              <h3>No users found</h3>
              <p>Click &quot;Create User&quot; above to register a new Admin or Viewer account.</p>
              <button type="button" onClick={() => setIsCreateOpen(true)} className="primary-btn" style={{ marginTop: "12px" }}>
                <UserPlus size={16} aria-hidden="true" />
                <span>Create User</span>
              </button>
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
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div className={styles.nameCell}>
                            <div className={styles.userAvatar}>{getInitials(u.name)}</div>
                            <span>{u.name}</span>
                          </div>
                        </td>
                        <td>{u.email}</td>
                        <td>
                          {u.role === "ADMIN" ? (
                            <span className={styles.badgeAdmin}>
                              <Shield size={12} aria-hidden="true" />
                              ADMIN
                            </span>
                          ) : (
                            <span className={styles.badgeViewer}>
                              <Eye size={12} aria-hidden="true" />
                              VIEWER
                            </span>
                          )}
                        </td>
                        <td>{formatDate(u.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Stack View */}
              <div className={styles.mobileUserList}>
                {users.map((u) => (
                  <div key={u.id} className={styles.mobileUserCard}>
                    <div className={styles.mobileHeader}>
                      <div className={styles.nameCell}>
                        <div className={styles.userAvatar}>{getInitials(u.name)}</div>
                        <span>{u.name}</span>
                      </div>
                      {u.role === "ADMIN" ? (
                        <span className={styles.badgeAdmin}>
                          <Shield size={12} aria-hidden="true" />
                          ADMIN
                        </span>
                      ) : (
                        <span className={styles.badgeViewer}>
                          <Eye size={12} aria-hidden="true" />
                          VIEWER
                        </span>
                      )}
                    </div>

                    <div className={styles.mobileDetails}>
                      <span>Email: {u.email}</span>
                      <span>Created: {formatDate(u.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Create User Modal Dialog */}
      <CreateUserDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccessMessage={showSuccessMessage}
      />
    </div>
  );
};
