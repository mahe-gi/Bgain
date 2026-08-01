import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { FileDetailsScreen } from '../screens/FileDetailsScreen';
import type { MainTabParamList } from './types';
import { theme } from '../styles/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

const renderHomeIcon = ({ color }: { color: string; size: number }) => (
  <LayoutDashboard color={color} size={20} />
);

const renderStorageIcon = ({ color }: { color: string; size: number }) => (
  <Folder color={color} size={20} />
);

const renderSearchIcon = ({ color }: { color: string; size: number }) => (
  <Search color={color} size={20} />
);

const renderUsersIcon = ({ color }: { color: string; size: number }) => (
  <Users color={color} size={20} />
);

const renderProfileIcon = ({ color }: { color: string; size: number }) => (
  <User color={color} size={20} />
);

export const MainTabNavigator: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  let bottomInset = 0;
  try {
    const insets = useSafeAreaInsets();
    bottomInset = insets?.bottom ?? 0;
  } catch {
    bottomInset = 0;
  }

  const BASE_TAB_BAR_HEIGHT = 60;
  const bottomPadding = Math.max(bottomInset, 6);
  const tabBarHeight = BASE_TAB_BAR_HEIGHT + bottomInset;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surfacePrimary,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingTop: 6,
          paddingBottom: bottomPadding,
          elevation: 8,
        },
        tabBarItemStyle: {
          flex: 1,
          minWidth: 0,
          paddingHorizontal: 2,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: 0,
          textAlign: 'center',
        },
        tabBarIconStyle: {
          marginBottom: 0,
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

      <Tab.Screen
        name="FileDetails"
        component={FileDetailsScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
    </Tab.Navigator>
  );
};
