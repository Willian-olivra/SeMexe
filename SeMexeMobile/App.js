import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// Importe suas telas
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
// Você precisará criar estas outras telas (Cadastro, Perfil, etc) seguindo a lógica do Login/Home
// import RegisterScreen from './src/screens/RegisterScreen'; 
// import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#1E1E1E', borderTopColor: '#333' },
        tabBarActiveTintColor: '#00E5FF',
        tabBarInactiveTintColor: '#888',
      }}
    >
      <Tab.Screen 
        name="Atividades" 
        component={HomeScreen} 
        options={{ tabBarIcon: ({color}) => <Ionicons name="list" size={24} color={color} /> }}
      />
      {/* Adicione a tela de Perfil aqui futuramente */}
      <Tab.Screen 
         name="Perfil" 
         component={HomeScreen} // Placeholder temporário
         options={{ tabBarIcon: ({color}) => <Ionicons name="person" size={24} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        {/* <Stack.Screen name="Register" component={RegisterScreen} /> */}
        <Stack.Screen name="MainTabs" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}