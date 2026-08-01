import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';

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
  },
  errorDescription: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
    textAlign: 'center',
  },
});
