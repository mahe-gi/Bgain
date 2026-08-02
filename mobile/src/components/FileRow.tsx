import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FileText, Image as ImageIcon, FileCode, Film, Music, File, ChevronRight, MoreVertical } from 'lucide-react-native';
import { theme } from '../styles/theme';
import { formatBytes, formatDate, getFileTypeLabel } from '../utils/formatters';
import type { SafeFile } from '../types/storage';

interface FileRowProps {
  file: SafeFile;
  onPress?: () => void;
  onActionsPress?: () => void;
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

export const FileRow: React.FC<FileRowProps> = ({ file, onPress, onActionsPress }) => {
  const typeLabel = getFileTypeLabel(file.mimeType);
  const formattedSize = formatBytes(file.sizeBytes);
  const formattedDate = formatDate(file.createdAt);
  const accessibleLabel = `Open file details for ${file.name}, ${typeLabel}, ${formattedSize}, created ${formattedDate}`;

  const content = (
    <>
      <View style={styles.iconBox}>{renderFileIcon(file.mimeType)}</View>
      <View style={styles.infoContainer}>
        <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
          {file.name}
        </Text>
        <Text style={styles.fileMeta}>
          {typeLabel} • {formattedSize} • {formattedDate}
        </Text>
      </View>
      {onActionsPress ? (
        <TouchableOpacity
          style={styles.actionTrigger}
          onPress={(e) => {
            e.stopPropagation();
            onActionsPress();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Actions menu for file ${file.name}`}
          testID={`btn-file-actions-${file.id}`}
        >
          <MoreVertical color={theme.colors.textMuted} size={20} />
        </TouchableOpacity>
      ) : onPress ? (
        <ChevronRight color={theme.colors.textMuted} size={18} accessibilityElementsHidden />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibleLabel}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${file.name}, ${typeLabel}, ${formattedSize}, created ${formattedDate}`}
    >
      {content}
    </View>
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
  fileName: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  fileMeta: {
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
