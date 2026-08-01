import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  LayoutDashboard,
  Folder,
  Search,
  Users,
  User,
} from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import { DashboardScreen } from '../screens/DashboardScreen';
import { StorageScreen } from '../screens/StorageScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { UsersScreen } from '../screens/UsersScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import type { MainTabParamList } from './types';
import { theme } from '../styles/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

const renderHomeIcon = ({ color, size }: { color: string; size: number }) => (
  <LayoutDashboard color={color} size={size} />
);

const renderStorageIcon = ({ color, size }: { color: string; size: number }) => (
  <Folder color={color} size={size} />
);

const renderSearchIcon = ({ color, size }: { color: string; size: number }) => (
  <Search color={color} size={size} />
);

const renderUsersIcon = ({ color, size }: { color: string; size: number }) => (
  <Users color={color} size={size} />
);

const renderProfileIcon = ({ color, size }: { color: string; size: number }) => (
  <User color={color} size={size} />
);

export const MainTabNavigator: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surfacePrimary,
          borderTopColor: theme.colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        sceneStyle: {
          backgroundColor: theme.colors.canvas,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: renderHomeIcon,
        }}
      />

      <Tab.Screen
        name="Storage"
        component={StorageScreen}
        options={{
          tabBarLabel: 'Storage',
          tabBarIcon: renderStorageIcon,
        }}
      />

      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Search',
          tabBarIcon: renderSearchIcon,
        }}
      />

      {isAdmin && (
        <Tab.Screen
          name="Users"
          component={UsersScreen}
          options={{
            tabBarLabel: 'Users',
            tabBarIcon: renderUsersIcon,
          }}
        />
      )}

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: renderProfileIcon,
        }}
      />
    </Tab.Navigator>
  );
};
