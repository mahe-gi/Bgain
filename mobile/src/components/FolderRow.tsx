import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Folder, ChevronRight, MoreVertical } from 'lucide-react-native';
import { theme } from '../styles/theme';
import { formatDate } from '../utils/formatters';
import type { SafeFolder } from '../types/storage';

interface FolderRowProps {
  folder: SafeFolder;
  onPress: () => void;
  onActionsPress?: () => void;
}

export const FolderRow: React.FC<FolderRowProps> = ({ folder, onPress, onActionsPress }) => {
  const formattedDate = formatDate(folder.createdAt);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Open folder ${folder.name}`}
    >
      <View style={styles.iconBox}>
        <Folder color={theme.colors.primary} size={20} accessibilityElementsHidden />
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.folderName} numberOfLines={1} ellipsizeMode="tail">
          {folder.name}
        </Text>
        <Text style={styles.folderMeta}>Folder • Created {formattedDate}</Text>
      </View>
      {onActionsPress ? (
        <TouchableOpacity
          style={styles.actionTrigger}
          onPress={(e) => {
            e.stopPropagation();
            onActionsPress();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Actions menu for folder ${folder.name}`}
          testID={`btn-folder-actions-${folder.id}`}
        >
          <MoreVertical color={theme.colors.textMuted} size={20} />
        </TouchableOpacity>
      ) : (
        <ChevronRight color={theme.colors.textMuted} size={18} accessibilityElementsHidden />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfacePrimary,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.sm + 2,
    marginBottom: theme.spacing.sm,
    minHeight: 56,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm + 2,
  },
  infoContainer: {
    flex: 1,
    marginRight: theme.spacing.xs,
  },
  folderName: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  folderMeta: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.xs,
  },
  actionTrigger: {
    padding: theme.spacing.xs,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
