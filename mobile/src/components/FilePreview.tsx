import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  StyleSheet,
} from 'react-native';
import { Eye, ExternalLink, AlertCircle } from 'lucide-react-native';
import { getPreviewUrlApi } from '../api/files.api';
import { fetchTxtPreviewContent } from '../services/file-transfer.service';
import { getErrorMessage } from '../api/client';
import { theme } from '../styles/theme';
import type { SafeFile } from '../types/storage';

interface FilePreviewProps {
  file: SafeFile;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ file }) => {
  const [previewRequested, setPreviewRequested] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txtContent, setTxtContent] = useState<string | null>(null);

  React.useEffect(() => {
    setPreviewRequested(false);
    setPreviewUrl(null);
    setLoading(false);
    setError(null);
    setTxtContent(null);
  }, [file.id]);

  const mime = file.mimeType.toLowerCase();
  const isImage = mime === 'image/jpeg' || mime === 'image/jpg' || mime === 'image/png';
  const isTxt = mime === 'text/plain';
  const isPdf = mime === 'application/pdf';
  const isSupported = isImage || isTxt || isPdf;

  const handleGeneratePreview = async () => {
    setPreviewRequested(true);
    setLoading(true);
    setError(null);
    setTxtContent(null);

    try {
      const { url } = await getPreviewUrlApi(file.id);
      setPreviewUrl(url);

      if (isTxt) {
        const text = await fetchTxtPreviewContent(url, file.sizeBytes);
        setTxtContent(text);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load preview URL.'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPdf = async () => {
    if (!previewUrl) return;
    try {
      const canOpen = await Linking.canOpenURL(previewUrl);
      if (canOpen) {
        await Linking.openURL(previewUrl);
      } else {
        setError('No PDF viewer app found to open PDF preview.');
      }
    } catch {
      setError('Unable to open PDF preview.');
    }
  };

  if (!isSupported) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          Preview
        </Text>
        <View style={styles.unsupportedBox}>
          <Text style={styles.unsupportedText} testID="preview-unsupported">
            Preview is not available for this file type.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle} accessibilityRole="header">
        Preview
      </Text>

      {!previewRequested ? (
        <TouchableOpacity
          style={styles.generateButton}
          onPress={handleGeneratePreview}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Generate preview for ${file.name}`}
          testID="btn-generate-preview"
        >
          <Eye color={theme.colors.primaryText} size={18} />
          <Text style={styles.generateButtonText}>Generate Preview</Text>
        </TouchableOpacity>
      ) : loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading preview…</Text>
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <AlertCircle color={theme.colors.danger} size={20} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleGeneratePreview}
            accessibilityRole="button"
            accessibilityLabel="Retry loading preview"
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.previewContainer}>
          {isImage && previewUrl ? (
            <Image
              source={{ uri: previewUrl }}
              style={styles.imagePreview}
              resizeMode="contain"
              accessibilityLabel={`Preview image of ${file.name}`}
              testID="preview-image"
            />
          ) : null}

          {isTxt && txtContent !== null ? (
            <ScrollView style={styles.txtScrollView} nestedScrollEnabled>
              <Text style={styles.txtContent} testID="preview-txt-content">
                {txtContent}
              </Text>
            </ScrollView>
          ) : null}

          {isPdf && previewUrl ? (
            <View style={styles.pdfBox}>
              <Text style={styles.pdfInfoText}>PDF preview generated safely.</Text>
              <TouchableOpacity
                style={styles.pdfButton}
                onPress={handleOpenPdf}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Open PDF Preview in system viewer"
                testID="btn-open-pdf"
              >
                <ExternalLink color={theme.colors.primary} size={16} />
                <Text style={styles.pdfButtonText}>Open PDF Preview</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}
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
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.sm,
    height: 44,
  },
  generateButtonText: {
    color: theme.colors.primaryText,
    fontSize: theme.typography.sm,
    fontWeight: '700',
    marginLeft: theme.spacing.xs,
  },
  unsupportedBox: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.sm,
    alignItems: 'center',
  },
  unsupportedText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sm,
  },
  centerBox: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
    marginTop: theme.spacing.sm,
  },
  errorBox: {
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: theme.typography.sm,
    textAlign: 'center',
    marginVertical: theme.spacing.xs,
  },
  retryButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderFocus,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    marginTop: theme.spacing.xs,
  },
  retryText: {
    color: theme.colors.primary,
    fontSize: theme.typography.xs,
    fontWeight: '700',
  },
  previewContainer: {
    borderRadius: theme.radii.sm,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 260,
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radii.sm,
  },
  txtScrollView: {
    maxHeight: 260,
    backgroundColor: theme.colors.canvas,
    padding: theme.spacing.sm,
    borderRadius: theme.radii.sm,
  },
  txtContent: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.xs,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  pdfBox: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radii.sm,
    alignItems: 'center',
  },
  pdfInfoText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    marginBottom: theme.spacing.sm,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.primary,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  pdfButtonText: {
    color: theme.colors.primary,
    fontSize: theme.typography.xs,
    fontWeight: '700',
    marginLeft: theme.spacing.xs,
  },
});
