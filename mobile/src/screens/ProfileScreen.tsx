import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Shield, Eye } from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import { AppButton } from '../components/AppButton';
import { theme } from '../styles/theme';

function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

function formatDate(isoString: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  if (!user) return null;

  const isAdmin = user.role === 'ADMIN';

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Profile</Text>
      <Text style={styles.screenSubtitle}>Your account details and access level.</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatarHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
          </View>
          <View style={styles.avatarMeta}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Role Level</Text>
          <View style={[styles.badge, isAdmin ? styles.badgeAdmin : styles.badgeViewer]}>
            {isAdmin ? (
              <>
                <Shield size={14} color={theme.colors.roleAdmin} />
                <Text style={styles.badgeTextAdmin}>ADMIN</Text>
              </>
            ) : (
              <>
                <Eye size={14} color={theme.colors.roleViewer} />
                <Text style={styles.badgeTextViewer}>VIEWER</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Member Since</Text>
          <Text style={styles.metaValue}>{formatDate(user.createdAt)}</Text>
        </View>
      </View>

      <AppButton
        title={loggingOut ? 'Signing Out…' : 'Sign Out'}
        onPress={handleLogout}
        variant="danger"
        loading={loggingOut}
        disabled={loggingOut}
        style={styles.logoutButton}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  content: {
    padding: theme.spacing.lg,
  },
  screenTitle: {
    fontSize: theme.typography.xxl,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  screenSubtitle: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  profileCard: {
    backgroundColor: theme.colors.surfacePrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  avatarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    fontSize: theme.typography.lg,
    fontWeight: '700',
    color: theme.colors.primaryText,
  },
  avatarMeta: {
    flex: 1,
  },
  userName: {
    fontSize: theme.typography.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  userEmail: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: theme.spacing.xs,
  },
  metaLabel: {
    fontSize: theme.typography.xs,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: theme.typography.sm,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
    gap: 4,
  },
  badgeAdmin: {
    backgroundColor: theme.colors.roleAdminBg,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.3)',
  },
  badgeViewer: {
    backgroundColor: theme.colors.roleViewerBg,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  badgeTextAdmin: {
    fontSize: theme.typography.xs,
    fontWeight: '700',
    color: theme.colors.roleAdmin,
  },
  badgeTextViewer: {
    fontSize: theme.typography.xs,
    fontWeight: '700',
    color: theme.colors.roleViewer,
  },
  logoutButton: {
    marginTop: theme.spacing.sm,
  },
});
