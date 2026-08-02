import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  BackHandler,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { uploadFileApi } from '../../api/files.api';
import { getErrorMessage } from '../../api/client';
import { theme } from '../../styles/theme';
import { ALLOWED_FILE_TYPES } from '../../types/storage';
import { pickDocumentService } from '../../services/document-picker.service';

interface UploadFileModalProps {
  visible: boolean;
  currentFolderId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export interface PickedDocument {
  uri: string;
  name: string;
  type: string | null;
  size: number | null;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const UploadFileModal: React.FC<UploadFileModalProps> = ({
  visible,
  currentFolderId,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<PickedDocument | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [loadedBytes, setLoadedBytes] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!visible) return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (uploading) {
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [visible, uploading]);

  const validateDocument = (file: PickedDocument): string | null => {
    const filename = file.name || '';
    const size = file.size;
    const mimeType = file.type || '';

    if (size != null && size > MAX_FILE_SIZE_BYTES) {
      return `File size (${formatBytes(size)}) exceeds maximum limit of 10 MB.`;
    }

    const dotIndex = filename.lastIndexOf('.');
    if (dotIndex === -1) {
      return 'File must have a valid extension (.pdf, .jpg, .png, .txt, .docx, .xlsx).';
    }
    const ext = filename.substring(dotIndex).toLowerCase();

    const allowedExts = ALLOWED_FILE_TYPES[mimeType];
    const isSupportedExt = [
      '.pdf',
      '.jpg',
      '.jpeg',
      '.png',
      '.txt',
      '.docx',
      '.xlsx',
    ].includes(ext);

    if (!isSupportedExt || (allowedExts && !allowedExts.includes(ext))) {
      return `File type '${ext}' is not allowed. Supported types: PDF, JPG, PNG, TXT, DOCX, XLSX.`;
    }

    return null;
  };

  const handlePickDocument = async () => {
    if (uploading) return;
    try {
      setError(null);
      const picked = await pickDocumentService();
      setSelectedFile(picked);
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to select document.');
      if (!msg.includes('canceled') && !msg.includes('CANCELED')) {
        setError(msg);
      }
    }
  };

  const handleClose = () => {
    if (uploading) return;
    setSelectedFile(null);
    setProgressPercent(0);
    setLoadedBytes(0);
    setTotalBytes(0);
    setError(null);
    onClose();
  };

  const handleUpload = async () => {
    if (!selectedFile || uploading) return;

    const validationError = validateDocument(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setError(null);
    setProgressPercent(0);
    setLoadedBytes(0);
    setTotalBytes(selectedFile.size || 0);

    try {
      await uploadFileApi(
        {
          uri: selectedFile.uri,
          name: selectedFile.name || 'file',
          type: selectedFile.type || 'application/octet-stream',
        },
        currentFolderId,
        (percent, loaded, total) => {
          setProgressPercent(percent);
          setLoadedBytes(loaded);
          setTotalBytes(total);
        }
      );

      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['search'] });

      setUploading(false);
      setSelectedFile(null);
      setProgressPercent(0);
      onSuccess?.();
      onClose();
    } catch (err) {
      setUploading(false);
      setError(getErrorMessage(err, 'Failed to upload file.'));
    }
  };

  const isUploadDisabled =
    !selectedFile ||
    uploading ||
    Boolean(error && error.includes('not allowed')) ||
    Boolean(error && error.includes('exceeds')) ||
    Boolean(error && error.includes('match'));

  const progressLabel =
    progressPercent === 100 ? 'Processing upload…' : `Uploading... ${progressPercent}%`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container} testID="modal-upload-file">
          <Text style={styles.title} accessibilityRole="header">
            Upload File
          </Text>

          <TouchableOpacity
            style={[styles.pickButton, uploading && styles.disabledButton]}
            onPress={handlePickDocument}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel="Select document to upload"
            testID="btn-select-document"
          >
            <Text style={styles.pickButtonText}>
              {selectedFile ? 'Change Document' : 'Choose Document'}
            </Text>
          </TouchableOpacity>

          {selectedFile && (
            <View style={styles.fileDetailsCard} testID="selected-file-details">
              <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                {selectedFile.name || 'Selected Document'}
              </Text>
              <Text style={styles.fileMeta}>
                Type: {selectedFile.type || 'Unknown'} | Size:{' '}
                {selectedFile.size != null ? formatBytes(selectedFile.size) : 'Unknown'}
              </Text>
            </View>
          )}

          {uploading && (
            <View style={styles.progressCard} testID="upload-progress-container">
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>{progressLabel}</Text>
                {totalBytes > 0 && (
                  <Text style={styles.bytesText}>
                    {formatBytes(loadedBytes)} / {formatBytes(totalBytes)}
                  </Text>
                )}
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
                />
              </View>
            </View>
          )}

          {error && (
            <View style={styles.errorBox} testID="upload-error">
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={uploading}
              accessibilityRole="button"
              accessibilityLabel="Cancel file upload"
              testID="btn-cancel-upload"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, isUploadDisabled && styles.disabledButton]}
              onPress={handleUpload}
              disabled={isUploadDisabled}
              accessibilityRole="button"
              accessibilityLabel={selectedFile && error ? 'Retry upload' : 'Upload file'}
              testID="btn-submit-upload"
            >
              {uploading ? (
                <ActivityIndicator size="small" color={theme.colors.primaryText} />
              ) : (
                <Text style={styles.submitText}>
                  {selectedFile && error ? 'Retry Upload' : 'Upload File'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: theme.colors.surfacePrimary,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  pickButton: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    minHeight: 44,
  },
  pickButtonText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: theme.typography.sm,
  },
  fileDetailsCard: {
    backgroundColor: theme.colors.canvas,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  fileName: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
    fontSize: theme.typography.sm,
    marginBottom: 2,
  },
  fileMeta: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.xs,
  },
  progressCard: {
    marginBottom: theme.spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: theme.typography.xs,
  },
  bytesText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.xs,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: theme.colors.canvas,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  errorBox: {
    backgroundColor: theme.colors.dangerBg,
    borderColor: theme.colors.dangerBorder,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: theme.typography.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.sm,
  },
  cancelButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.sm,
    marginRight: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  cancelText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitText: {
    color: theme.colors.primaryText,
    fontSize: theme.typography.sm,
    fontWeight: '700',
  },
});
