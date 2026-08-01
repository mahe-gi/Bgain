import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Keyboard,
  StyleSheet,
} from 'react-native';
import { Search as SearchIcon, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useSearch } from '../hooks/useSearch';
import { SearchResultRow } from '../components/SearchResultRow';
import { ScreenState } from '../components/ScreenState';
import { getErrorMessage } from '../api/client';
import { theme } from '../styles/theme';
import type { MainTabParamList } from '../navigation/types';

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  const [inputQuery, setInputQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useSearch(submittedQuery);

  const handleSearchSubmit = () => {
    Keyboard.dismiss();
    const trimmed = inputQuery.trim();
    if (trimmed.length < 2) {
      setValidationError('Search query must be at least 2 characters.');
      return;
    }
    if (trimmed.length > 100) {
      setValidationError('Search query must be at most 100 characters.');
      return;
    }
    setValidationError(null);
    setSubmittedQuery(trimmed);
  };

  const handleClear = () => {
    setInputQuery('');
    setSubmittedQuery('');
    setValidationError(null);
  };

  const { folders = [], files = [], total = 0 } = data || {};
  const hasSearched = Boolean(submittedQuery.trim());
  const isNoResults = hasSearched && !isLoading && !isError && total === 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            Global Search
          </Text>
          <Text style={styles.subtitle}>
            Search across all folders and files in your BGain Gateway.
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Text style={styles.inputLabel} nativeID="search-input-label">
            Search Query
          </Text>
          <View style={styles.inputWrapper}>
            <SearchIcon color={theme.colors.textMuted} size={18} style={styles.searchIcon} />
            <TextInput
              style={styles.input}
              value={inputQuery}
              onChangeText={(text) => {
                setInputQuery(text);
                if (validationError) setValidationError(null);
              }}
              placeholder="Enter folder or filename..."
              placeholderTextColor={theme.colors.textMuted}
              returnKeyType="search"
              onSubmitEditing={handleSearchSubmit}
              accessibilityLabel="Search Query Input"
              testID="search-input"
            />
            {inputQuery.length > 0 && (
              <TouchableOpacity
                onPress={handleClear}
                style={styles.clearIconBtn}
                accessibilityRole="button"
                accessibilityLabel="Clear search text"
                testID="btn-clear-search"
              >
                <X color={theme.colors.textMuted} size={18} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSearchSubmit}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Submit search"
            testID="btn-submit-search"
          >
            <Text style={styles.submitButtonText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Validation Error Message */}
        {validationError && (
          <View style={styles.validationBox} testID="search-validation-error">
            <Text style={styles.validationText}>{validationError}</Text>
          </View>
        )}

        {/* Initial State Guidance */}
        {!hasSearched && !validationError && (
          <View style={styles.guidanceBox}>
            <Text style={styles.guidanceText} testID="search-guidance">
              Enter at least 2 characters to search across all storage folders and files.
            </Text>
          </View>
        )}

        {/* Loading State */}
        {isLoading && <ScreenState type="loading" title="Searching storage..." />}

        {/* Error State */}
        {isError && (
          <ScreenState
            type="error"
            title="Search Failed"
            message={getErrorMessage(error, 'Unable to perform search.')}
            onRetry={refetch}
          />
        )}

        {/* No Results State */}
        {isNoResults && (
          <View style={styles.emptyBox} testID="search-no-results">
            <Text style={styles.emptyText}>
              No files or folders match &quot;{submittedQuery}&quot;.
            </Text>
          </View>
        )}

        {/* Search Results */}
        {hasSearched && !isLoading && !isError && total > 0 && (
          <View style={styles.resultsContainer}>
            {folders.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionHeader} accessibilityRole="header">
                  Folders ({folders.length})
                </Text>
                {folders.map((folder) => (
                  <SearchResultRow
                    key={`folder-${folder.id}`}
                    item={folder}
                    type="folder"
                    onPress={() =>
                      navigation.navigate('Storage', {
                        targetFolder: { id: folder.id, name: folder.name },
                      })
                    }
                  />
                ))}
              </View>
            )}

            {files.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionHeader} accessibilityRole="header">
                  Files ({files.length})
                </Text>
                {files.map((file) => (
                  <SearchResultRow
                    key={`file-${file.id}`}
                    item={file}
                    type="file"
                    onPress={() =>
                      navigation.navigate('FileDetails', {
                        fileId: file.id,
                      })
                    }
                  />
                ))}
              </View>
            )}
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
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.xxl,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  searchBarContainer: {
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfacePrimary,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    height: 48,
  },
  searchIcon: {
    marginRight: theme.spacing.xs,
  },
  input: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
    paddingVertical: 0,
  },
  clearIconBtn: {
    padding: theme.spacing.xs,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.sm,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: theme.colors.primaryText,
    fontSize: theme.typography.sm,
    fontWeight: '700',
  },
  validationBox: {
    backgroundColor: theme.colors.dangerBg,
    borderColor: theme.colors.dangerBorder,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  validationText: {
    color: theme.colors.danger,
    fontSize: theme.typography.xs,
  },
  guidanceBox: {
    backgroundColor: theme.colors.surfacePrimary,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  guidanceText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sm,
    textAlign: 'center',
  },
  emptyBox: {
    backgroundColor: theme.colors.surfacePrimary,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sm,
    textAlign: 'center',
  },
  resultsContainer: {
    marginTop: theme.spacing.xs,
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
});
