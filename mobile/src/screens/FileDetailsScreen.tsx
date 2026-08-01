import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { ArrowLeft, Download, CheckCircle, AlertCircle } from 'lucide-react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFileDetails } from '../hooks/useFileDetails';
import { FileMetadata } from '../components/FileMetadata';
import { FilePreview } from '../components/FilePreview';
import { ScreenState } from '../components/ScreenState';
import { downloadFileSecurely } from '../services/file-transfer.service';
import { getErrorMessage } from '../api/client';
import { theme } from '../styles/theme';
import type { MainTabParamList } from '../navigation/types';

export const FileDetailsScreen: React.FC = () => {
  const route = useRoute<RouteProp<MainTabParamList, 'FileDetails'>>();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  const { fileId } = route.params || {};

  const { data: file, isLoading, isError, error, refetch } = useFileDetails(fileId);

  const [downloading, setDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDownloadState = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    setDownloading(false);
    setDownloadStatus(null);
    setDownloadError(null);
  }, []);

  // Clear download state whenever fileId changes
  useEffect(() => {
    clearDownloadState();
  }, [fileId, clearDownloadState]);

  // Clear download status when File Details screen loses focus or unmounts
  useFocusEffect(
    useCallback(() => {
      return () => {
        clearDownloadState();
      };
    }, [clearDownloadState])
  );

  // Clean up dismissal timer on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, []);

  const handleDownload = async () => {
    if (!file || !fileId || downloading) return;
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    setDownloading(true);
    setDownloadStatus(null);
    setDownloadError(null);

    try {
      await downloadFileSecurely(fileId, file.name);
      setDownloadStatus('Download started. Check your Downloads folder.');
      dismissTimerRef.current = setTimeout(() => {
        setDownloadStatus(null);
        dismissTimerRef.current = null;
      }, 4500);
    } catch (err) {
      setDownloadError(getErrorMessage(err, 'Failed to initiate file download.'));
      setDownloadStatus(null);
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenContainingFolder = () => {
    if (!file) return;
    if (file.folderId) {
      navigation.navigate('Storage', {
        targetFolder: { id: file.folderId, name: 'Containing Folder' },
      });
    } else {
      navigation.navigate('Storage', { resetToRoot: true });
    }
  };

  if (isLoading) {
    return <ScreenState type="loading" title="Loading file details..." />;
  }

  if (isError || !file) {
    return (
      <ScreenState
        type="error"
        title="File Not Found"
        message={getErrorMessage(error, 'Unable to load file details.')}
        onRetry={refetch}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            testID="btn-back-file-details"
          >
            <ArrowLeft color={theme.colors.primary} size={18} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
            {file.name}
          </Text>
        </View>

        {/* Primary Download Action Card */}
        <View style={styles.actionCard}>
          <TouchableOpacity
            style={[styles.downloadButton, downloading && styles.downloadButtonDisabled]}
            onPress={handleDownload}
            disabled={downloading}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Download file ${file.name}`}
            testID="btn-download-file"
          >
            {downloading ? (
              <ActivityIndicator size="small" color={theme.colors.primaryText} />
            ) : (
              <Download color={theme.colors.primaryText} size={18} />
            )}
            <Text style={styles.downloadButtonText}>
              {downloading ? 'Preparing Download…' : 'Download File'}
            </Text>
          </TouchableOpacity>

          {downloadStatus && (
            <View style={styles.statusBox} testID="download-status-success">
              <CheckCircle color={theme.colors.primary} size={16} />
              <Text style={styles.statusText}>{downloadStatus}</Text>
            </View>
          )}

          {downloadError && (
            <View style={styles.errorBox} testID="download-status-error">
              <AlertCircle color={theme.colors.danger} size={16} />
              <Text style={styles.errorText}>{downloadError}</Text>
            </View>
          )}
        </View>

        {/* File Metadata */}
        <FileMetadata file={file} onOpenFolder={handleOpenContainingFolder} />

        {/* File Preview */}
        <FilePreview file={file} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    paddingRight: theme.spacing.sm,
  },
  backText: {
    color: theme.colors.primary,
    fontSize: theme.typography.sm,
    fontWeight: '600',
    marginLeft: theme.spacing.xs,
  },
  title: {
    fontSize: theme.typography.xl,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  actionCard: {
    backgroundColor: theme.colors.surfacePrimary,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.sm,
    height: 48,
  },
  downloadButtonDisabled: {
    opacity: 0.7,
  },
  downloadButtonText: {
    color: theme.colors.primaryText,
    fontSize: theme.typography.base,
    fontWeight: '700',
    marginLeft: theme.spacing.xs,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderFocus,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  statusText: {
    color: theme.colors.primary,
    fontSize: theme.typography.xs,
    marginLeft: theme.spacing.xs,
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.dangerBg,
    borderColor: theme.colors.dangerBorder,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: theme.typography.xs,
    marginLeft: theme.spacing.xs,
    flex: 1,
  },
});
