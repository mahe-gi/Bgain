/* eslint-env jest */

// Mock react-native-config
jest.mock('react-native-config', () => ({
  API_BASE_URL: 'http://127.0.0.1:4000/api',
}));

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn().mockResolvedValue(true),
  getGenericPassword: jest.fn().mockResolvedValue(false),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
}));

// Mock react-native-screens
jest.mock('react-native-screens', () => {
  const React = require('react');
  const View = require('react-native').View;
  return {
    enableScreens: jest.fn(),
    ScreenContainer: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    Screen: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    NativeScreen: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    NativeScreenContainer: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    ScreenStack: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    ScreenStackHeaderConfig: () => null,
    ScreenStackHeaderItem: () => null,
    ScreenStackHeaderRightView: () => null,
    ScreenStackHeaderLeftView: () => null,
    ScreenStackHeaderCenterView: () => null,
    ScreenStackHeaderTitleView: () => null,
  };
});
