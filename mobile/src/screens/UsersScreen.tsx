import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { getUsersApi } from '../api/users.api';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../utils/formatters';
import { theme } from '../styles/theme';
import { CreateUserModal } from '../components/modals/CreateUserModal';
import type { SafeUser } from '../types/auth';
import {
  UserPlus,
  Shield,
  Eye,
  AlertCircle,
  Users,
  CheckCircle,
  ShieldAlert,
} from 'lucide-react-native';

export function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

export const UsersScreen: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  let topInset = 0;
  let bottomInset = 0;
  try {
    const insets = useSafeAreaInsets();
    topInset = insets?.top ?? 0;
    bottomInset = insets?.bottom ?? 0;
  } catch {
    topInset = 0;
    bottomInset = 0;
  }

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    data: users = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['users'],
    queryFn: getUsersApi,
    enabled: isAdmin,
  });

  const showSuccessBanner = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
  };

  // Viewer Access Restriction Fallback
  if (!isAdmin) {
    return (
      <View
        style={[
          styles.restrictedContainer,
          { paddingTop: topInset + theme.spacing.lg },
        ]}
        testID="users-viewer-restricted"
      >
        <ShieldAlert size={48} color={theme.colors.danger} />
        <Text style={styles.restrictedTitle}>Access Restricted</Text>
        <Text style={styles.restrictedSubtitle}>
          Admin privileges are required to view and manage user accounts.
        </Text>
      </View>
    );
  }

  const renderUserItem = ({ item }: { item: SafeUser }) => {
    const isUserAdmin = item.role === 'ADMIN';
    return (
      <View style={styles.userCard} testID={`user-item-${item.id}`}>
        <View style={styles.cardHeader}>
          <View style={styles.userInfoGroup}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
            </View>
            <View style={styles.nameDetails}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userEmail}>{item.email}</Text>
            </View>
          </View>

          <View
            style={[
              styles.roleBadge,
              isUserAdmin ? styles.roleBadgeAdmin : styles.roleBadgeViewer,
            ]}
          >
            {isUserAdmin ? (
              <Shield size={12} color={theme.colors.roleAdmin} />
            ) : (
              <Eye size={12} color={theme.colors.roleViewer} />
            )}
            <Text
              style={[
                styles.roleBadgeText,
                isUserAdmin ? styles.roleTextAdmin : styles.roleTextViewer,
              ]}
            >
              {item.role}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.createdDate}>
            Created: {formatDate(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: topInset + theme.spacing.md },
      ]}
    >
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text style={styles.title} accessibilityRole="header">
            User Management
          </Text>
          <Text style={styles.summaryText}>
            {users.length} {users.length === 1 ? 'user' : 'users'} registered
          </Text>
        </View>

        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setIsCreateModalOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Create user"
          testID="btn-open-create-user"
        >
          <UserPlus size={18} color={theme.colors.primaryText} />
          <Text style={styles.createButtonText}>Create User</Text>
        </TouchableOpacity>
      </View>

      {/* Success Notification Banner */}
      {successMessage && (
        <View style={styles.successBanner} testID="users-success-banner">
          <CheckCircle size={18} color={theme.colors.primary} />
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      )}

      {/* Error State */}
      {isError && (
        <View style={styles.errorContainer} testID="users-error">
          <AlertCircle size={32} color={theme.colors.danger} />
          <Text style={styles.errorTitle}>Failed to Load Users</Text>
          <Text style={styles.errorSubtitle}>
            {getErrorMessage(error, 'Network error occurred while fetching users.')}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
            accessibilityRole="button"
            accessibilityLabel="Retry loading users"
            testID="btn-retry-users"
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading Skeletons */}
      {isLoading && !isError && (
        <View style={styles.loadingContainer} testID="users-loading">
          {[1, 2, 3].map((idx) => (
            <View key={idx} style={styles.skeletonCard}>
              <View style={styles.skeletonAvatar} />
              <View style={styles.skeletonTextGroup}>
                <View style={styles.skeletonLineName} />
                <View style={styles.skeletonLineEmail} />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* List / Empty State */}
      {!isLoading && !isError && (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomInset + theme.spacing.lg },
            users.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer} testID="users-empty">
              <Users size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyTitle}>No Users Found</Text>
              <Text style={styles.emptySubtitle}>
                No user accounts exist in the system.
              </Text>
            </View>
          }
        />
      )}

      {/* Create User Modal */}
      <CreateUserModal
        visible={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newUser) => {
          showSuccessBanner(`User "${newUser.name}" created successfully.`);
          refetch();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  restrictedContainer: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  restrictedTitle: {
    fontSize: theme.typography.xl,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  restrictedSubtitle: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  titleGroup: {
    flex: 1,
  },
  title: {
    fontSize: theme.typography.xl,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  summaryText: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.sm,
    minHeight: 40,
  },
  createButtonText: {
    color: theme.colors.primaryText,
    fontSize: theme.typography.sm,
    fontWeight: '700',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: 'rgba(215, 154, 121, 0.15)',
    borderColor: theme.colors.primary,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  successText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.xs,
    flex: 1,
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  errorTitle: {
    fontSize: theme.typography.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  errorSubtitle: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  retryButton: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.sm,
    minHeight: 40,
    justifyContent: 'center',
  },
  retryButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfacePrimary,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    opacity: 0.6,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.border,
  },
  skeletonTextGroup: {
    flex: 1,
    gap: 8,
  },
  skeletonLineName: {
    width: 140,
    height: 16,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
  },
  skeletonLineEmail: {
    width: 180,
    height: 12,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
  },
  listContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  userCard: {
    backgroundColor: theme.colors.surfacePrimary,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  userInfoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: theme.colors.primary,
    fontSize: theme.typography.sm,
    fontWeight: '700',
  },
  nameDetails: {
    flex: 1,
  },
  userName: {
    fontSize: theme.typography.base,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  userEmail: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
    borderWidth: 1,
  },
  roleBadgeAdmin: {
    backgroundColor: theme.colors.roleAdminBg,
    borderColor: 'rgba(192, 132, 252, 0.30)',
  },
  roleBadgeViewer: {
    backgroundColor: theme.colors.roleViewerBg,
    borderColor: 'rgba(56, 189, 248, 0.30)',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  roleTextAdmin: {
    color: theme.colors.roleAdmin,
  },
  roleTextViewer: {
    color: theme.colors.roleViewer,
  },
  cardFooter: {
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  createdDate: {
    fontSize: theme.typography.xs,
    color: theme.colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.typography.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  emptySubtitle: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
