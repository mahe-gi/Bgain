import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  BackHandler,
} from 'react-native';
import { Folder, ChevronRight, ArrowLeft } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { getFoldersApi, updateFolderApi } from '../../api/storage.api';
import { updateFileApi } from '../../api/files.api';
import { getErrorMessage } from '../../api/client';
import { theme } from '../../styles/theme';
import type { SafeFolder } from '../../types/storage';

interface MoveModalProps {
  visible: boolean;
  item: {
    id: string;
    name: string;
    type: 'folder' | 'file';
    currentFolderId: string | null;
  } | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface PickerBreadcrumb {
  id: string | null;
  name: string;
}

export const MoveModal: React.FC<MoveModalProps> = ({
  visible,
  item,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [navStack, setNavStack] = useState<PickerBreadcrumb[]>([
    { id: null, name: 'Root' },
  ]);
  const [childFolders, setChildFolders] = useState<SafeFolder[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPickerFolder = navStack[navStack.length - 1];
  const currentTargetId = currentPickerFolder.id;

  const loadChildFolders = useCallback(async (parentId: string | null) => {
    setLoadingList(true);
    setError(null);
    try {
      const folders = await getFoldersApi({ parentId: parentId || 'root' });
      setChildFolders(folders);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load folders.'));
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (visible && item) {
      setNavStack([{ id: null, name: 'Root' }]);
      setError(null);
      setMoving(false);
      loadChildFolders(null);
    }
  }, [visible, item, loadChildFolders]);

  const handleGoUp = useCallback(() => {
    if (navStack.length > 1) {
      const newStack = navStack.slice(0, navStack.length - 1);
      setNavStack(newStack);
      loadChildFolders(newStack[newStack.length - 1].id);
      return true;
    }
    return false;
  }, [navStack, loadChildFolders]);

  useEffect(() => {
    if (!visible) return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navStack.length > 1) {
        handleGoUp();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [visible, navStack, handleGoUp]);

  if (!item) return null;

  const isFolder = item.type === 'folder';
  const isCurrentLocation = currentTargetId === item.currentFolderId;
  const isMovingIntoSelf = isFolder && currentTargetId === item.id;
  const isMoveDisabled = isCurrentLocation || isMovingIntoSelf || moving;

  const handleNavigateDown = (folder: SafeFolder) => {
    // Prevent navigating into the folder itself if moving a folder
    if (isFolder && folder.id === item.id) return;
    const newStack = [...navStack, { id: folder.id, name: folder.name }];
    setNavStack(newStack);
    loadChildFolders(folder.id);
  };

  const handleClose = () => {
    if (moving) return;
    setError(null);
    onClose();
  };

  const handleConfirmMove = async () => {
    if (isMoveDisabled || moving) return;
    setMoving(true);
    setError(null);

    try {
      if (isFolder) {
        await updateFolderApi(item.id, { parentId: currentTargetId });
        queryClient.invalidateQueries({ queryKey: ['folders'] });
      } else {
        await updateFileApi(item.id, { folderId: currentTargetId });
        queryClient.invalidateQueries({ queryKey: ['files'] });
        queryClient.invalidateQueries({ queryKey: ['file-details', item.id] });
      }

      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['search'] });

      setMoving(false);
      onSuccess?.();
      onClose();
    } catch (err) {
      setMoving(false);
      setError(getErrorMessage(err, `Failed to move ${item.type}.`));
    }
  };

  const pathLabel = navStack.map((b) => b.name).join(' / ');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container} testID="modal-move">
          <Text style={styles.title} accessibilityRole="header">
            Move {isFolder ? 'Folder' : 'File'}
          </Text>

          <Text style={styles.itemNameText} numberOfLines={1}>
            Moving: '{item.name}'
          </Text>

          <View style={styles.pathHeader}>
            {navStack.length > 1 && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleGoUp}
                accessibilityRole="button"
                accessibilityLabel="Go to parent folder in picker"
                testID="btn-picker-go-up"
              >
                <ArrowLeft color={theme.colors.textPrimary} size={18} />
              </TouchableOpacity>
            )}
            <Text
              style={styles.pathText}
              numberOfLines={1}
              ellipsizeMode="head"
              testID="move-path-text"
            >
              Destination: {pathLabel}
            </Text>
          </View>

          <View style={styles.listContainer}>
            {loadingList ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.primary}
                style={styles.loader}
              />
            ) : childFolders.length === 0 ? (
              <Text style={styles.emptyText}>No subfolders here.</Text>
            ) : (
              <FlatList
                data={childFolders}
                keyExtractor={(f) => f.id}
                renderItem={({ item: f }) => {
                  const isSelf = isFolder && f.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[styles.folderRow, isSelf && styles.disabledFolderRow]}
                      onPress={() => handleNavigateDown(f)}
                      disabled={isSelf}
                      accessibilityRole="button"
                      accessibilityLabel={`Open subfolder ${f.name}`}
                      testID={`move-folder-item-${f.id}`}
                    >
                      <Folder
                        color={
                          isSelf ? theme.colors.textMuted : theme.colors.primary
                        }
                        size={20}
                        style={styles.folderIcon}
                      />
                      <Text
                        style={[
                          styles.folderName,
                          isSelf && styles.disabledFolderName,
                        ]}
                        numberOfLines={1}
                      >
                        {f.name} {isSelf ? '(Self)' : ''}
                      </Text>
                      {!isSelf && (
                        <ChevronRight
                          color={theme.colors.textMuted}
                          size={18}
                        />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>

          {error && (
            <View style={styles.errorBox} testID="move-error">
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={moving}
              accessibilityRole="button"
              accessibilityLabel="Cancel move"
              testID="btn-cancel-move"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, isMoveDisabled && styles.disabledButton]}
              onPress={handleConfirmMove}
              disabled={isMoveDisabled}
              accessibilityRole="button"
              accessibilityLabel="Move item to current destination"
              testID="btn-submit-move"
            >
              {moving ? (
                <ActivityIndicator size="small" color={theme.colors.primaryText} />
              ) : (
                <Text style={styles.submitText}>
                  {isCurrentLocation ? 'Current Location' : 'Move Here'}
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
    maxHeight: '80%',
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
    marginBottom: 4,
  },
  itemNameText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.xs,
    marginBottom: theme.spacing.md,
  },
  pathHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.canvas,
    padding: theme.spacing.sm,
    borderRadius: theme.radii.sm,
    marginBottom: theme.spacing.sm,
  },
  backButton: {
    marginRight: theme.spacing.xs,
    padding: 4,
  },
  pathText: {
    flex: 1,
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: theme.typography.xs,
  },
  listContainer: {
    height: 180,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.canvas,
    marginBottom: theme.spacing.sm,
  },
  loader: {
    marginTop: theme.spacing.lg,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.xs,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    minHeight: 44,
  },
  disabledFolderRow: {
    opacity: 0.4,
  },
  folderIcon: {
    marginRight: theme.spacing.xs,
  },
  folderName: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
  },
  disabledFolderName: {
    color: theme.colors.textMuted,
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
