import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { Modal } from "./Modal.js";
import { createUserApi } from "../../api/user.api.js";
import { getErrorMessage } from "../../api/client.js";
import type { Role } from "../../types/user.js";

export interface CreateUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessMessage?: (msg: string) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CreateUserDialog: React.FC<CreateUserDialogProps> = ({
  isOpen,
  onClose,
  onSuccessMessage
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("VIEWER");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen) {
      setName("");
      setEmail("");
      setPassword("");
      setRole("VIEWER");
      setErrorMsg(null);
    } else {
      setPassword("");
    }
  }, [isOpen]);

  const mutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => createUserApi(payload),
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      if (onSuccessMessage) {
        onSuccessMessage(`User "${newUser.name}" (${newUser.role}) created successfully.`);
      }
      setPassword("");
      onClose();
    },
    onError: (err) => {
      setErrorMsg(getErrorMessage(err, "Failed to create user"));
    }
  });

  const handleSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 100) {
      setErrorMsg("Full name must be between 2 and 100 characters.");
      return;
    }

    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (!password || password.length < 8 || password.length > 72) {
      setErrorMsg("Password must be between 8 and 72 characters.");
      return;
    }

    setErrorMsg(null);
    mutation.mutate({
      name: trimmedName,
      email: trimmedEmail,
      password,
      role
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setPassword("");
        onClose();
      }}
      title="Create New User"
      isSubmitting={mutation.isPending}
      footer={
        <>
          <button
            type="button"
            onClick={() => {
              setPassword("");
              onClose();
            }}
            disabled={mutation.isPending}
            className="secondary-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="primary-btn"
            data-testid="create-user-submit-btn"
          >
            {mutation.isPending ? "Creating…" : "Create User"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {errorMsg && (
          <div role="alert" className="error-banner">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label htmlFor="create-user-name" style={{ fontSize: "14px", fontWeight: 600 }}>
            Full Name
          </label>
          <input
            id="create-user-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="e.g. Alex Morgan"
            maxLength={100}
            autoFocus
            disabled={mutation.isPending}
            className="dialog-input"
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label htmlFor="create-user-email" style={{ fontSize: "14px", fontWeight: 600 }}>
            Email Address
          </label>
          <input
            id="create-user-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="e.g. alex@example.com"
            disabled={mutation.isPending}
            className="dialog-input"
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label htmlFor="create-user-password" style={{ fontSize: "14px", fontWeight: 600 }}>
            Password
          </label>
          <input
            id="create-user-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="At least 8 characters"
            maxLength={72}
            disabled={mutation.isPending}
            className="dialog-input"
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label htmlFor="create-user-role" style={{ fontSize: "14px", fontWeight: 600 }}>
            Role
          </label>
          <select
            id="create-user-role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            disabled={mutation.isPending}
            className="dialog-input"
            style={{ cursor: "pointer" }}
          >
            <option value="VIEWER">VIEWER (Read-only)</option>
            <option value="ADMIN">ADMIN (Full access)</option>
          </select>
        </div>
      </form>
    </Modal>
  );
};
