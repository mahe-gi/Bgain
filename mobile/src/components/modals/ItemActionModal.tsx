import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Edit3, FolderInput, Trash2 } from 'lucide-react-native';
import { theme } from '../../styles/theme';

interface ItemActionModalProps {
  visible: boolean;
  item: {
    id: string;
    name: string;
    type: 'folder' | 'file';
  } | null;
  onClose: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
}

export const ItemActionModal: React.FC<ItemActionModalProps> = ({
  visible,
  item,
  onClose,
  onRename,
  onMove,
  onDelete,
}) => {
  if (!item) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.container} testID="modal-item-actions">
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
            {item.name}
          </Text>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => {
              onClose();
              onRename();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Rename ${item.type} ${item.name}`}
            testID="action-rename"
          >
            <Edit3 color={theme.colors.primary} size={20} style={styles.icon} />
            <Text style={styles.actionText}>Rename</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => {
              onClose();
              onMove();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Move ${item.type} ${item.name}`}
            testID="action-move"
          >
            <FolderInput color={theme.colors.primary} size={20} style={styles.icon} />
            <Text style={styles.actionText}>Move</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, styles.deleteActionRow]}
            onPress={() => {
              onClose();
              onDelete();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.type} ${item.name}`}
            testID="action-delete"
          >
            <Trash2 color={theme.colors.danger} size={20} style={styles.icon} />
            <Text style={styles.deleteActionText}>Delete</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelRow}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close actions menu"
            testID="action-cancel"
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: theme.colors.surfacePrimary,
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderColor: theme.colors.border,
    borderTopWidth: 1,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.typography.base,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    minHeight: 48,
  },
  deleteActionRow: {
    borderBottomWidth: 0,
  },
  icon: {
    marginRight: theme.spacing.md,
  },
  actionText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.base,
    fontWeight: '600',
  },
  deleteActionText: {
    color: theme.colors.danger,
    fontSize: theme.typography.base,
    fontWeight: '700',
  },
  cancelRow: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radii.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
    fontWeight: '600',
  },
});
