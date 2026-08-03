import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { createUserApi } from '../../api/users.api';
import { getErrorMessage } from '../../api/client';
import { theme } from '../../styles/theme';
import type { Role, SafeUser } from '../../types/auth';
import { Shield, Eye, AlertCircle } from 'lucide-react-native';

interface CreateUserModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (user: SafeUser) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('VIEWER');

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
  });

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();

  const isNameValid = trimmedName.length >= 2 && trimmedName.length <= 100;
  const isEmailValid = trimmedEmail.length > 0 && EMAIL_REGEX.test(trimmedEmail);
  const isPasswordValid = password.length >= 8 && password.length <= 72;
  const isFormValid = isNameValid && isEmailValid && isPasswordValid;

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('VIEWER');
    setTouched({ name: false, email: false, password: false });
    setApiError(null);
    setLoading(false);
  };

  const handleSubmit = async () => {
    setTouched({ name: true, email: true, password: true });
    if (!isFormValid || loading) return;

    setLoading(true);
    setApiError(null);

    try {
      const newUser = await createUserApi({
        name: trimmedName,
        email: trimmedEmail,
        password,
        role,
      });

      queryClient.invalidateQueries({ queryKey: ['users'] });
      resetForm();
      onSuccess?.(newUser);
      onClose();
    } catch (err) {
      setLoading(false);
      setApiError(getErrorMessage(err, 'Failed to create user account.'));
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container} testID="modal-create-user">
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title} accessibilityRole="header">
              Create New User
            </Text>
            <Text style={styles.subtitle}>
              Add a new user account with specified role access.
            </Text>

            {/* Name Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={[
                  styles.input,
                  touched.name && !isNameValid && styles.inputError,
                ]}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (apiError) setApiError(null);
                }}
                onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                placeholder="e.g. Jane Doe"
                placeholderTextColor={theme.colors.textMuted}
                maxLength={100}
                editable={!loading}
                testID="input-user-name"
                accessibilityLabel="Full name input"
              />
              {touched.name && !isNameValid && (
                <Text style={styles.fieldErrorText} testID="error-user-name">
                  Name must be at least 2 characters
                </Text>
              )}
            </View>

            {/* Email Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[
                  styles.input,
                  touched.email && !isEmailValid && styles.inputError,
                ]}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (apiError) setApiError(null);
                }}
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                placeholder="user@example.com"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                testID="input-user-email"
                accessibilityLabel="Email address input"
              />
              {touched.email && !isEmailValid && (
                <Text style={styles.fieldErrorText} testID="error-user-email">
                  Please enter a valid email address
                </Text>
              )}
            </View>

            {/* Password Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[
                  styles.input,
                  touched.password && !isPasswordValid && styles.inputError,
                ]}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (apiError) setApiError(null);
                }}
                onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                placeholder="Minimum 8 characters"
                placeholderTextColor={theme.colors.textMuted}
                secureTextEntry
                maxLength={72}
                editable={!loading}
                testID="input-user-password"
                accessibilityLabel="Password input"
              />
              {touched.password && !isPasswordValid && (
                <Text style={styles.fieldErrorText} testID="error-user-password">
                  Password must be at least 8 characters
                </Text>
              )}
            </View>

            {/* Role Selector */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Account Role</Text>
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    role === 'VIEWER' && styles.roleOptionActiveViewer,
                  ]}
                  onPress={() => !loading && setRole('VIEWER')}
                  disabled={loading}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: role === 'VIEWER' }}
                  accessibilityLabel="Role Viewer"
                  testID="role-option-viewer"
                >
                  <Eye
                    size={16}
                    color={role === 'VIEWER' ? theme.colors.roleViewer : theme.colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.roleText,
                      role === 'VIEWER' && styles.roleTextActiveViewer,
                    ]}
                  >
                    VIEWER
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    role === 'ADMIN' && styles.roleOptionActiveAdmin,
                  ]}
                  onPress={() => !loading && setRole('ADMIN')}
                  disabled={loading}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: role === 'ADMIN' }}
                  accessibilityLabel="Role Admin"
                  testID="role-option-admin"
                >
                  <Shield
                    size={16}
                    color={role === 'ADMIN' ? theme.colors.roleAdmin : theme.colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.roleText,
                      role === 'ADMIN' && styles.roleTextActiveAdmin,
                    ]}
                  >
                    ADMIN
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* API Error Box */}
            {apiError && (
              <View style={styles.errorBox} testID="create-user-error">
                <AlertCircle size={16} color={theme.colors.danger} />
                <Text style={styles.errorText}>{apiError}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Cancel user creation"
                testID="btn-cancel-create-user"
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!isFormValid || loading) && styles.disabledButton,
                ]}
                onPress={handleSubmit}
                disabled={!isFormValid || loading}
                accessibilityRole="button"
                accessibilityLabel="Create user account"
                testID="btn-submit-create-user"
              >
                {loading ? (
                  <ActivityIndicator size="small" color={theme.colors.primaryText} />
                ) : (
                  <Text style={styles.submitText}>Create User</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: theme.colors.surfacePrimary,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  fieldContainer: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.sm,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.canvas,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.base,
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  fieldErrorText: {
    color: theme.colors.danger,
    fontSize: theme.typography.xs,
    marginTop: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.canvas,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  roleOptionActiveViewer: {
    backgroundColor: theme.colors.roleViewerBg,
    borderColor: theme.colors.roleViewer,
  },
  roleOptionActiveAdmin: {
    backgroundColor: theme.colors.roleAdminBg,
    borderColor: theme.colors.roleAdmin,
  },
  roleText: {
    fontSize: theme.typography.sm,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  roleTextActiveViewer: {
    color: theme.colors.roleViewer,
  },
  roleTextActiveAdmin: {
    color: theme.colors.roleAdmin,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.dangerBg,
    borderColor: theme.colors.dangerBorder,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: theme.typography.xs,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.sm,
  },
  cancelButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.sm,
    marginRight: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  cancelText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitText: {
    color: theme.colors.primaryText,
    fontSize: theme.typography.sm,
    fontWeight: '700',
  },
});
