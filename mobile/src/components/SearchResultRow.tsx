import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import {
  Folder,
  FileText,
  Image as ImageIcon,
  FileCode,
  Film,
  Music,
  File,
  ChevronRight,
} from 'lucide-react-native';
import { theme } from '../styles/theme';
import { formatBytes, formatDate, getFileTypeLabel } from '../utils/formatters';
import type { SafeFolder, SafeFile } from '../types/storage';

interface SearchResultRowProps {
  item: SafeFolder | SafeFile;
  type: 'folder' | 'file';
  onPress: () => void;
}

function renderFileIcon(mimeType: string) {
  const lower = mimeType.toLowerCase();
  if (lower.startsWith('image/')) {
    return <ImageIcon color={theme.colors.primary} size={20} accessibilityElementsHidden />;
  }
  if (lower === 'application/pdf' || lower.startsWith('text/')) {
    return <FileText color={theme.colors.primary} size={20} accessibilityElementsHidden />;
  }
  if (lower.startsWith('video/')) {
    return <Film color={theme.colors.primary} size={20} accessibilityElementsHidden />;
  }
  if (lower.startsWith('audio/')) {
    return <Music color={theme.colors.primary} size={20} accessibilityElementsHidden />;
  }
  if (lower.includes('word') || lower.includes('sheet') || lower.includes('xml')) {
    return <FileCode color={theme.colors.primary} size={20} accessibilityElementsHidden />;
  }
  return <File color={theme.colors.primary} size={20} accessibilityElementsHidden />;
}

export const SearchResultRow: React.FC<SearchResultRowProps> = ({ item, type, onPress }) => {
  const isFolder = type === 'folder';
  const folder = isFolder ? (item as SafeFolder) : null;
  const file = !isFolder ? (item as SafeFile) : null;

  const accessibleLabel = isFolder
    ? `Open folder ${item.name}`
    : `Open file details for ${item.name}`;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibleLabel}
    >
      <View style={styles.iconBox}>
        {isFolder ? (
          <Folder color={theme.colors.primary} size={20} accessibilityElementsHidden />
        ) : (
          renderFileIcon(file!.mimeType)
        )}
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.nameText} numberOfLines={1} ellipsizeMode="middle">
          {item.name}
        </Text>
        <Text style={styles.metaText}>
          {isFolder
            ? `Folder • Created ${formatDate(folder!.createdAt)}`
            : `${getFileTypeLabel(file!.mimeType)} • ${formatBytes(file!.sizeBytes)} • ${formatDate(file!.createdAt)}`}
        </Text>
      </View>
      <ChevronRight color={theme.colors.textMuted} size={18} accessibilityElementsHidden />
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
  nameText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  metaText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.xs,
  },
});
