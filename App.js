import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AppProvider, useApp } from './src/context/AppContext';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import OnboardingPermissionsScreen from './src/screens/OnboardingPermissionsScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import FuelScreen from './src/screens/FuelScreen';
import LiveLocationScreen from './src/screens/LiveLocationScreen';
import CallsMapScreen from './src/screens/CallsMapScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import MyShiftScreen from './src/screens/MyShiftScreen';
import ChatScreen from './src/screens/ChatScreen';
import ConversationScreen from './src/screens/ConversationScreen';
import NewGroupScreen from './src/screens/NewGroupScreen';
import EmployeesScreen from './src/screens/EmployeesScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import VehicleScreen from './src/screens/VehicleScreen';
import VehiclesAdminScreen from './src/screens/VehiclesAdminScreen';
import StockLogScreen from './src/screens/StockLogScreen';
import MyStockScreen from './src/screens/MyStockScreen';
import ToolAllocationScreen from './src/screens/ToolAllocationScreen';
import EmployeeReportScreen from './src/screens/EmployeeReportScreen';
import AdminReportsScreen from './src/screens/AdminReportsScreen';
import SiteWorkScreen from './src/screens/SiteWorkScreen';
import EmployeeDirectoryScreen from './src/screens/EmployeeDirectoryScreen';
import ChatArchiveScreen from './src/screens/ChatArchiveScreen';
import AddGroupMembersScreen from './src/screens/AddGroupMembersScreen';
import LocationTracker from './src/components/LocationTracker';
import SiteVisitVerifier from './src/components/SiteVisitVerifier';
import IncomingCallManager from './src/components/IncomingCallManager';
import PushNotificationManager from './src/components/PushNotificationManager';
import TabBar from './src/components/TabBar';
import { colors } from './src/theme';
import { navigationRef } from './src/lib/navigationRef';
import { ONBOARDING_KEY } from './src/services/permissionsService';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Нүүр' }} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Ирц' }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ title: 'Чат' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Профайл' }} />
    </Tab.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Inventory" component={InventoryScreen} initialParams={{ category: 'material' }} />
      <Stack.Screen name="Tools" component={InventoryScreen} initialParams={{ category: 'tool' }} />
      <Stack.Screen name="Fuel" component={FuelScreen} />
      <Stack.Screen name="Live" component={LiveLocationScreen} />
      <Stack.Screen name="Calls" component={CallsMapScreen} />
      <Stack.Screen name="Vehicle" component={VehicleScreen} />
      <Stack.Screen name="VehiclesAdmin" component={VehiclesAdminScreen} />
      <Stack.Screen name="Conversation" component={ConversationScreen} />
      <Stack.Screen name="NewGroup" component={NewGroupScreen} />
      <Stack.Screen name="Employees" component={EmployeesScreen} />
      <Stack.Screen name="StockLog" component={StockLogScreen} />
      <Stack.Screen name="ToolAllocation" component={ToolAllocationScreen} initialParams={{ category: 'tool' }} />
      <Stack.Screen name="MyStock" component={MyStockScreen} initialParams={{ category: 'material' }} />
      <Stack.Screen name="MyTools" component={MyStockScreen} initialParams={{ category: 'tool' }} />
      <Stack.Screen name="EmployeeReport" component={EmployeeReportScreen} />
      <Stack.Screen name="MyShift" component={MyShiftScreen} />
      <Stack.Screen name="AdminReports" component={AdminReportsScreen} />
      <Stack.Screen name="SiteWork" component={SiteWorkScreen} />
      <Stack.Screen name="EmployeeDirectory" component={EmployeeDirectoryScreen} />
      <Stack.Screen name="ChatArchive" component={ChatArchiveScreen} />
      <Stack.Screen name="AddGroupMembers" component={AddGroupMembersScreen} />
    </Stack.Navigator>
  );
}

function Splash() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Image source={require('./assets/logo.png')} style={{ width: 180, height: 150, marginBottom: 24 }} resizeMode="contain" />
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

function Root() {
  const { isCloud, authLoading, session, mustChangePassword } = useApp();
  const [onboarded, setOnboarded] = useState(null);

  useEffect(() => {
    if (!isCloud || !session) {
      setOnboarded(null);
      return;
    }
    let active = true;
    AsyncStorage.getItem(ONBOARDING_KEY).then((v) => {
      if (active) setOnboarded(v === '1');
    });
    return () => {
      active = false;
    };
  }, [isCloud, session?.user?.id]);

  // Supabase холбогдоогүй бол шууд апп (локал горим)
  if (isCloud) {
    if (authLoading) return <Splash />;
    if (!session) return <LoginScreen />;
    if (mustChangePassword) return <ChangePasswordScreen />;
    if (onboarded === null) return <Splash />;
    if (!onboarded) {
      return <OnboardingPermissionsScreen onComplete={() => setOnboarded(true)} />;
    }
  }
  return (
    <>
      <LocationTracker />
      <SiteVisitVerifier />
      <IncomingCallManager />
      <PushNotificationManager />
      <AppStack />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <NavigationContainer ref={navigationRef} theme={navTheme}>
            <StatusBar style="dark" />
            <Root />
          </NavigationContainer>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
