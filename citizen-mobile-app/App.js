import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import ReportIncidentScreen from './src/screens/ReportIncidentScreen';
import NearbyAlertsScreen from './src/screens/NearbyAlertsScreen';
import SafetyMapScreen from './src/screens/SafetyMapScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#059669', // Emerald/Gov theme active green
        tabBarInactiveTintColor: '#94A3B8', // Slate-400 inactive
        tabBarStyle: {
          backgroundColor: '#1E293B', // Slate-800 for tab bar background
          borderTopWidth: 1,
          borderTopColor: '#334155', // Slate-700
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: '#0F172A', // Slate-900 (Main Base Color)
        },
        headerTintColor: '#F1F5F9', // Slate-100 (Text color)
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" color={color} size={size} />
          ),
          headerTitle: 'SurakshaNet',
        }}
      />
      <Tab.Screen
        name="Report"
        component={ReportIncidentScreen}
        options={{
          tabBarLabel: 'Report',
          tabBarIcon: ({ color, size }) => (
            <Icon name="file-document" color={color} size={size} />
          ),
          headerTitle: 'Report Incident',
        }}
      />
      <Tab.Screen
        name="Nearby"
        component={NearbyAlertsScreen}
        options={{
          tabBarLabel: 'Nearby',
          tabBarIcon: ({ color, size }) => (
            <Icon name="map-marker" color={color} size={size} />
          ),
          headerTitle: 'Nearby Alerts',
        }}
      />
      <Tab.Screen
        name="Map"
        component={SafetyMapScreen}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: ({ color, size }) => (
            <Icon name="shield-check" color={color} size={size} />
          ),
          headerTitle: 'Safety Map',
        }}
      />
    </Tab.Navigator>
  );
}

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={TabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
