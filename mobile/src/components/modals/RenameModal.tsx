import React, { useState, useEffect } from 'react';
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
import { updateFolderApi } from '../../api/storage.api';
import { updateFileApi } from '../../api/files.api';
import { getErrorMessage } from '../../api/client';
import { theme } from '../../styles/theme';

interface RenameModalProps {
  visible: boolean;
  item: {
    id: string;
    name: string;
    type: 'folder' | 'file';
    mimeType?: string;
  } | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RenameModal: React.FC<RenameModalProps> = ({
  visible,
  item,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item && visible) {
      setName(item.name);
      setError(null);
      setLoading(false);
    }
  }, [item, visible]);

  if (!item) return null;

  const isFolder = item.type === 'folder';
  const trimmedName = name.trim();
  const maxLen = isFolder ? 120 : 255;
  const isChanged = trimmedName !== item.name;

  let extensionError: string | null = null;
  if (!isFolder && item.name.includes('.')) {
    const origDot = item.name.lastIndexOf('.');
    const origExt = item.name.substring(origDot).toLowerCase();
    const newDot = trimmedName.lastIndexOf('.');
    const newExt = newDot !== -1 ? trimmedName.substring(newDot).toLowerCase() : '';

    if (origExt !== newExt) {
      extensionError = `File extension must remain '${origExt}'.`;
    }
  }

  const isValid =
    trimmedName.length >= 1 &&
    trimmedName.length <= maxLen &&
    isChanged &&
    !extensionError;

  const handleClose = () => {
    if (loading) return;
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    setError(null);

    try {
      if (isFolder) {
        await updateFolderApi(item.id, { name: trimmedName });
        queryClient.invalidateQueries({ queryKey: ['folders'] });
      } else {
        await updateFileApi(item.id, { name: trimmedName });
        queryClient.invalidateQueries({ queryKey: ['files'] });
        queryClient.invalidateQueries({ queryKey: ['file-details', item.id] });
      }

      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['search'] });

      setLoading(false);
      onSuccess?.();
      onClose();
    } catch (err) {
      setLoading(false);
      setError(getErrorMessage(err, `Failed to rename ${item.type}.`));
    }
  };

  const displayError = error || extensionError;

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
        <View style={styles.container} testID="modal-rename">
          <Text style={styles.title} accessibilityRole="header">
            {isFolder ? 'Rename Folder' : 'Rename File'}
          </Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (error) setError(null);
            }}
            placeholder={isFolder ? 'Folder name' : 'Filename'}
            placeholderTextColor={theme.colors.textMuted}
            autoFocus
            maxLength={maxLen}
            editable={!loading}
            testID="input-rename-name"
            accessibilityLabel="Rename input field"
          />

          {displayError && (
            <View style={styles.errorBox} testID="rename-error">
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Cancel rename"
              testID="btn-cancel-rename"
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
              accessibilityLabel="Save rename"
              testID="btn-submit-rename"
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.colors.primaryText} />
              ) : (
                <Text style={styles.submitText}>Save</Text>
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
