import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FolderOpen } from 'lucide-react-native';
import { theme } from '../styles/theme';
import { formatBytes, formatDate, getFileTypeLabel } from '../utils/formatters';
import type { SafeFile } from '../types/storage';

interface FileMetadataProps {
  file: SafeFile;
  onOpenFolder?: () => void;
}

export const FileMetadata: React.FC<FileMetadataProps> = ({ file, onOpenFolder }) => {
  const typeLabel = getFileTypeLabel(file.mimeType);
  const formattedSize = formatBytes(file.sizeBytes);
  const createdDate = formatDate(file.createdAt);
  const updatedDate = formatDate(file.updatedAt);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle} accessibilityRole="header">
        File Metadata
      </Text>

      <View style={styles.grid}>
        <View style={styles.row}>
          <Text style={styles.label}>Filename</Text>
          <Text style={styles.value} numberOfLines={2}>
            {file.name}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Type</Text>
          <Text style={styles.value}>{typeLabel}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>MIME Type</Text>
          <Text style={styles.value}>{file.mimeType}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Size</Text>
          <Text style={styles.value}>{formattedSize}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Created</Text>
          <Text style={styles.value}>{createdDate}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Last Modified</Text>
          <Text style={styles.value}>{updatedDate}</Text>
        </View>
      </View>

      {onOpenFolder ? (
        <TouchableOpacity
          style={styles.folderAction}
          onPress={onOpenFolder}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open containing folder"
        >
          <FolderOpen color={theme.colors.primary} size={16} />
          <Text style={styles.folderActionText}>Open containing folder</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfacePrimary,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  cardTitle: {
    fontSize: theme.typography.base,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  grid: {
    gap: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    fontWeight: '500',
    width: 100,
  },
  value: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.xs,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  folderAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  folderActionText: {
    color: theme.colors.primary,
    fontSize: theme.typography.xs,
    fontWeight: '600',
    marginLeft: theme.spacing.xs,
  },
});
