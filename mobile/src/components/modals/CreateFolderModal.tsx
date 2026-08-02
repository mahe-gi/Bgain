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
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { createFolderApi } from '../../api/storage.api';
import { getErrorMessage } from '../../api/client';
import { theme } from '../../styles/theme';

interface CreateFolderModalProps {
  visible: boolean;
  currentFolderId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  visible,
  currentFolderId,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedName = folderName.trim();
  const isValid = trimmedName.length >= 1 && trimmedName.length <= 120;

  const handleClose = () => {
    if (loading) return;
    setFolderName('');
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    setError(null);

    try {
      await createFolderApi(trimmedName, currentFolderId);
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['search'] });
      setFolderName('');
      setLoading(false);
      onSuccess?.();
      onClose();
    } catch (err) {
      setLoading(false);
      setError(getErrorMessage(err, 'Failed to create folder.'));
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
        <View style={styles.container} testID="modal-create-folder">
          <Text style={styles.title} accessibilityRole="header">
            New Folder
          </Text>

          <Text style={styles.label}>Folder name</Text>
          <TextInput
            style={styles.input}
            value={folderName}
            onChangeText={(text) => {
              setFolderName(text);
              if (error) setError(null);
            }}
            placeholder="e.g. Project Documents"
            placeholderTextColor={theme.colors.textMuted}
            autoFocus
            maxLength={120}
            editable={!loading}
            testID="input-folder-name"
            accessibilityLabel="Folder name input"
          />

          {error && (
            <View style={styles.errorBox} testID="create-folder-error">
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Cancel folder creation"
              testID="btn-cancel-create-folder"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!isValid || loading) && styles.disabledButton,
              ]}
              onPress={handleSubmit}
              disabled={!isValid || loading}
              accessibilityRole="button"
              accessibilityLabel="Create folder"
              testID="btn-submit-create-folder"
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.colors.primaryText} />
              ) : (
                <Text style={styles.submitText}>Create Folder</Text>
              )}
            </TouchableOpacity>
          </View>
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
    maxWidth: 400,
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
    marginBottom: theme.spacing.sm,
  },
  errorBox: {
    backgroundColor: theme.colors.dangerBg,
    borderColor: theme.colors.dangerBorder,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: theme.typography.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.md,
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
