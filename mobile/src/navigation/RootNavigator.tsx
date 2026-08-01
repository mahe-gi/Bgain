import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import Config from 'react-native-config';
import { useAuth } from '../hooks/useAuth';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { RestorationScreenState, ConfigErrorScreenState } from '../components/ScreenState';

export const RootNavigator: React.FC = () => {
  const { status } = useAuth();
  const apiBaseUrl = Config.API_BASE_URL;

  // Validate API URL configuration
  if (!apiBaseUrl || typeof apiBaseUrl !== 'string' || !apiBaseUrl.startsWith('http')) {
    return <ConfigErrorScreenState />;
  }

  if (status === 'restoring') {
    return <RestorationScreenState />;
  }

  return (
    <NavigationContainer>
      {status === 'authenticated' ? <MainTabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};
