import React from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { HardDrive, Folder, FileText, ArrowRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useDashboard } from '../hooks/useDashboard';
import { StatCard } from '../components/StatCard';
import { RecentFileRow } from '../components/RecentFileRow';
import { ScreenState } from '../components/ScreenState';
import { getErrorMessage } from '../api/client';
import { formatBytes } from '../utils/formatters';
import { theme } from '../styles/theme';
import type { MainTabParamList } from '../navigation/types';

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { data, isLoading, isError, error, isRefetching, refetch } = useDashboard();

  if (isLoading && !data) {
    return <ScreenState type="loading" title="Loading Dashboard..." />;
  }

  if (isError && !data) {
    return (
      <ScreenState
        type="error"
        title="Failed to Load Dashboard"
        message={getErrorMessage(error, 'Unable to retrieve dashboard metrics.')}
        onRetry={refetch}
      />
    );
  }

  const { folderCount = 0, fileCount = 0, totalSizeBytes = 0, recentFiles = [] } = data || {};

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
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            Gateway Overview
          </Text>
          <Text style={styles.subtitle}>
            Live metrics and storage activity in your BGain Gateway.
          </Text>
        </View>

        {/* Metric Cards Grid */}
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <StatCard
              label="Storage Used"
              value={formatBytes(totalSizeBytes)}
              icon={<HardDrive color={theme.colors.primary} size={18} />}
              testID="stat-storage-used"
            />
          </View>
          <View style={styles.statRowSplit}>
            <StatCard
              label="Total Folders"
              value={folderCount}
              icon={<Folder color={theme.colors.primary} size={18} />}
              testID="stat-folder-count"
            />
            <View style={styles.statSpacer} />
            <StatCard
              label="Total Files"
              value={fileCount}
              icon={<FileText color={theme.colors.primary} size={18} />}
              testID="stat-file-count"
            />
          </View>
        </View>

        {/* Quick Storage Nav Action */}
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('Storage', { resetToRoot: true })}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Browse Storage root directory"
        >
          <Text style={styles.browseButtonText}>Browse Storage</Text>
          <ArrowRight color={theme.colors.primaryText} size={18} />
        </TouchableOpacity>

        {/* Recent Files Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Recent Files
          </Text>
        </View>

        {recentFiles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText} testID="recent-files-empty">
              No recent files stored in Gateway.
            </Text>
          </View>
        ) : (
          recentFiles.map((file) => (
            <RecentFileRow
              key={file.id}
              file={file}
              onPress={() => navigation.navigate('FileDetails', { fileId: file.id })}
            />
          ))
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
  title: {
    fontSize: theme.typography.xxl,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  statsContainer: {
    marginBottom: theme.spacing.lg,
  },
  statRow: {
    marginBottom: theme.spacing.md,
  },
  statRowSplit: {
    flexDirection: 'row',
  },
  statSpacer: {
    width: theme.spacing.md,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.md,
    height: 48,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  browseButtonText: {
    color: theme.colors.primaryText,
    fontSize: theme.typography.base,
    fontWeight: '700',
    marginRight: theme.spacing.sm,
  },
  sectionHeader: {
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.lg,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  emptyContainer: {
    backgroundColor: theme.colors.surfacePrimary,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sm,
  },
});
