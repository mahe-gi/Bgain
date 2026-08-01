import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  BackHandler,
  StyleSheet,
} from 'react-native';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFolderContents } from '../hooks/useFolderContents';
import { FolderRow } from '../components/FolderRow';
import { FileRow } from '../components/FileRow';
import { ScreenState } from '../components/ScreenState';
import { getErrorMessage } from '../api/client';
import { theme } from '../styles/theme';
import type { MainTabParamList } from '../navigation/types';

export interface FolderStackNode {
  id: string;
  name: string;
}

export const StorageScreen: React.FC = () => {
  const route = useRoute<RouteProp<MainTabParamList, 'Storage'>>();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  const [folderStack, setFolderStack] = useState<FolderStackNode[]>([
    { id: 'root', name: 'Storage' },
  ]);

  const currentFolder = folderStack[folderStack.length - 1];

  const {
    folders,
    files,
    isLoading,
    isError,
    error,
    isRefetching,
    refetch,
  } = useFolderContents(currentFolder.id);

  // Focus effect for Hardware Back button listener & targetFolder/resetToRoot parameter handling
  useFocusEffect(
    useCallback(() => {
      // If navigated with resetToRoot: true, reset stack to root directory
      if (route.params?.resetToRoot) {
        setFolderStack([{ id: 'root', name: 'Storage' }]);
        navigation.setParams({ resetToRoot: undefined });
      }

      // If navigated with targetFolder (e.g., from Search or File Details)
      if (route.params?.targetFolder) {
        const tf = route.params.targetFolder;
        setFolderStack([
          { id: 'root', name: 'Storage' },
          { id: tf.id, name: tf.name },
        ]);
        navigation.setParams({ targetFolder: undefined });
      }

      const onBackPress = () => {
        if (folderStack.length > 1) {
          setFolderStack((prev) => prev.slice(0, prev.length - 1));
          return true; // Intercept back button when in a subfolder
        }
        return false; // Allow default back behavior when at root
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [route.params?.resetToRoot, route.params?.targetFolder, navigation, folderStack.length])
  );

  const handleManualBack = () => {
    if (folderStack.length > 1) {
      setFolderStack((prev) => prev.slice(0, prev.length - 1));
    }
  };

  const pushFolder = (folderNode: FolderStackNode) => {
    setFolderStack((prev) => [...prev, folderNode]);
  };

  const navigateToCrumbIndex = (index: number) => {
    if (index >= 0 && index < folderStack.length - 1) {
      setFolderStack((prev) => prev.slice(0, index + 1));
    }
  };

  if (isLoading && folders.length === 0 && files.length === 0) {
    return <ScreenState type="loading" title="Loading folder contents..." />;
  }

  if (isError && folders.length === 0 && files.length === 0) {
    return (
      <ScreenState
        type="error"
        title="Failed to Load Storage"
        message={getErrorMessage(error, 'Unable to retrieve location contents.')}
        onRetry={refetch}
      />
    );
  }

  const isEmpty = folders.length === 0 && files.length === 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Header & Breadcrumbs */}
        <View style={styles.header}>
          {folderStack.length > 1 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleManualBack}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go back to parent folder"
            >
              <ArrowLeft color={theme.colors.primary} size={18} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          {/* Horizontal Breadcrumb Bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.breadcrumbBar}
          >
            {folderStack.map((crumb, index) => {
              const isLast = index === folderStack.length - 1;
              return (
                <View key={`${crumb.id}-${index}`} style={styles.crumbItem}>
                  {index > 0 && (
                    <ChevronRight
                      color={theme.colors.textMuted}
                      size={14}
                      style={styles.crumbChevron}
                    />
                  )}
                  <TouchableOpacity
                    onPress={() => navigateToCrumbIndex(index)}
                    disabled={isLast}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Navigate to folder ${crumb.name}`}
                  >
                    <Text
                      style={[
                        styles.crumbText,
                        isLast && styles.crumbTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {crumb.name}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>

          <Text style={styles.folderTitle} numberOfLines={1} accessibilityRole="header">
            {currentFolder.name}
          </Text>
          <Text style={styles.folderSubtitle}>
            {currentFolder.id === 'root'
              ? 'All files and folders in root storage'
              : `Contents of ${currentFolder.name}`}
          </Text>
        </View>

        {/* Empty State */}
        {isEmpty && !isLoading && !isError && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText} testID="storage-empty-state">
              No subfolders or files exist in this location.
            </Text>
          </View>
        )}

        {/* Folders Section */}
        {folders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader} accessibilityRole="header">
              Folders ({folders.length})
            </Text>
            {folders.map((folder) => (
              <FolderRow
                key={folder.id}
                folder={folder}
                onPress={() => pushFolder({ id: folder.id, name: folder.name })}
              />
            ))}
          </View>
        )}

        {/* Files Section */}
        {files.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader} accessibilityRole="header">
              Files ({files.length})
            </Text>
            {files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                onPress={() => navigation.navigate('FileDetails', { fileId: file.id })}
              />
            ))}
          </View>
        )}
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
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    paddingRight: theme.spacing.sm,
  },
  backButtonText: {
    color: theme.colors.primary,
    fontSize: theme.typography.sm,
    fontWeight: '600',
    marginLeft: theme.spacing.xs,
  },
  breadcrumbBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
  },
  crumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  crumbChevron: {
    marginHorizontal: theme.spacing.xs,
  },
  crumbText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    fontWeight: '500',
  },
  crumbTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  folderTitle: {
    fontSize: theme.typography.xxl,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.xs,
    marginBottom: 2,
  },
  folderSubtitle: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    fontSize: theme.typography.base,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  emptyContainer: {
    backgroundColor: theme.colors.surfacePrimary,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sm,
    textAlign: 'center',
  },
});
