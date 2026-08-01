import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacityProps,
} from 'react-native';
import { theme } from '../styles/theme';

export interface AppButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  loading = false,
  variant = 'primary',
  disabled,
  style,
  ...rest
}) => {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';

  const buttonStyle = [
    styles.button,
    isPrimary && styles.primaryButton,
    variant === 'secondary' && styles.secondaryButton,
    isDanger && styles.dangerButton,
    (disabled || loading) && styles.disabledButton,
    style,
  ];

  const textStyle = [
    styles.text,
    isPrimary && styles.primaryText,
    variant === 'secondary' && styles.secondaryText,
    isDanger && styles.dangerText,
  ];

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      style={buttonStyle}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading) }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isPrimary ? theme.colors.primaryText : theme.colors.primary}
        />
      ) : (
        <Text style={textStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: theme.radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dangerButton: {
    backgroundColor: theme.colors.dangerBg,
    borderWidth: 1,
    borderColor: theme.colors.dangerBorder,
  },
  disabledButton: {
    opacity: 0.5,
  },
  text: {
    fontSize: theme.typography.sm,
    fontWeight: '600',
  },
  primaryText: {
    color: theme.colors.primaryText,
  },
  secondaryText: {
    color: theme.colors.textPrimary,
  },
  dangerText: {
    color: theme.colors.danger,
  },
});
