import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../styles/theme';

interface ScreenStateProps {
  type: 'loading' | 'error';
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ScreenState: React.FC<ScreenStateProps> = ({
  type,
  title,
  message,
  onRetry,
}) => {
  if (type === 'loading') {
    return (
      <View style={styles.container} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>{title || 'Loading…'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <Text style={styles.errorTitle}>{title || 'Something went wrong'}</Text>
      {message ? <Text style={styles.errorDescription}>{message}</Text> : null}
      {onRetry ? (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Retry loading"
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

export const RestorationScreenState: React.FC = () => {
  return (
    <View style={styles.container} accessibilityRole="header" accessibilityLabel="Restoring authentication session">
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.loadingText}>Restoring session…</Text>
    </View>
  );
};

export const ConfigErrorScreenState: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.errorTitle}>Configuration Error</Text>
      <Text style={styles.errorDescription}>
        The application API base URL is missing or malformed. Please check environment configuration.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
    marginTop: theme.spacing.md,
  },
  errorTitle: {
    color: theme.colors.danger,
    fontSize: theme.typography.xl,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  errorDescription: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  retryButton: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderFocus,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm + 2,
    marginTop: theme.spacing.sm,
  },
  retryButtonText: {
    color: theme.colors.primary,
    fontSize: theme.typography.sm,
    fontWeight: '700',
  },
});
