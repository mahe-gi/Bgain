import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { deleteFolderApi } from '../../api/storage.api';
import { deleteFileApi } from '../../api/files.api';
import { getErrorMessage } from '../../api/client';
import { theme } from '../../styles/theme';

interface DeleteConfirmModalProps {
  visible: boolean;
  item: {
    id: string;
    name: string;
    type: 'folder' | 'file';
  } | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  visible,
  item,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!item) return null;

  const isFolder = item.type === 'folder';

  const handleClose = () => {
    if (loading) return;
    setError(null);
    onClose();
  };

  const handleDelete = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      if (isFolder) {
        await deleteFolderApi(item.id);
        queryClient.invalidateQueries({ queryKey: ['folders'] });
        queryClient.invalidateQueries({ queryKey: ['files'] });
      } else {
        await deleteFileApi(item.id);
        queryClient.invalidateQueries({ queryKey: ['files'] });
        queryClient.removeQueries({ queryKey: ['file-details', item.id] });
      }

      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['search'] });

      setLoading(false);
      onSuccess?.();
      onClose();
    } catch (err) {
      setLoading(false);
      setError(getErrorMessage(err, `Failed to delete ${item.type}.`));
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container} testID="modal-delete-confirm">
          <View style={styles.headerRow}>
            <AlertTriangle color={theme.colors.danger} size={24} style={styles.icon} />
            <Text style={styles.title} accessibilityRole="header">
              {isFolder ? 'Delete Folder' : 'Delete File'}
            </Text>
          </View>

          <Text style={styles.warningText}>
            {isFolder
              ? `Are you sure you want to delete '${item.name}'? Deleting this folder will permanently delete all nested files and subfolders within it.`
              : `Are you sure you want to delete '${item.name}'? This action cannot be undone.`}
          </Text>

          {error && (
            <View style={styles.errorBox} testID="delete-error">
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Cancel deletion"
              testID="btn-cancel-delete"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deleteButton, loading && styles.disabledButton]}
              onPress={handleDelete}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={isFolder ? 'Confirm delete folder' : 'Confirm delete file'}
              testID="btn-submit-delete"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.deleteText}>
                  {isFolder ? 'Delete Folder' : 'Delete File'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    borderColor: theme.colors.dangerBorder,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  icon: {
    marginRight: theme.spacing.xs,
  },
  title: {
    fontSize: theme.typography.lg,
    fontWeight: '700',
    color: theme.colors.danger,
  },
  warningText: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
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
  deleteButton: {
    backgroundColor: theme.colors.danger,
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
  deleteText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sm,
    fontWeight: '700',
  },
});
