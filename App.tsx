// App.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Button } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import NicknameScreen from './src/screens/NicknameScreen';
import QRCodeScanner from './src/screens/QRCodeScanner';

import { startBroadcasting, stopBroadcasting } from './src/ble/Broadcaster';
import { startScanning, stopScanning } from './src/ble/Scanner';
import useBluetoothPermissions from './src/hooks/useBluetoothPermissions';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Stack = createNativeStackNavigator();

function MainScreen({ navigation }: any) {
  const [detectedUsers, setDetectedUsers] = useState<
    { nickname: string; uuid: string; rawData: string; rawBase64: string; timestamp: number; rssi: number; distance: number }[]
  >([]);
  const [uuid, setUuid] = useState('');
  const [nickname, setNickname] = useState('');

  useBluetoothPermissions();

  useEffect(() => {
    const loadAndStart = async () => {
      const storedUuid = await AsyncStorage.getItem('@user_uuid');
      const storedNickname = await AsyncStorage.getItem('@nickname');

      if (storedUuid) setUuid(storedUuid);
      if (storedNickname) setNickname(storedNickname);

      if (storedNickname && storedUuid) {
        await startBroadcasting(storedNickname, storedUuid);
        startScanning((data) => {
          setDetectedUsers((prev) => {
            const existingIndex = prev.findIndex((u) => u.uuid === data.uuid);
            if (existingIndex !== -1) {
              const updated = [...prev];
              updated[existingIndex] = { ...prev[existingIndex], ...data };
              return updated;
            } else {
              return [...prev, data];
            }
          });
        });
        console.log('🚀 Broadcasting and scanning started');
      } else {
        console.warn('❌ Missing nickname or UUID');
      }
    };

    loadAndStart();

    return () => {
      stopBroadcasting();
      stopScanning();
    };
  }, []);

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: 'black' }}>
      <Text style={{ color: 'lime', fontSize: 18, marginBottom: 10 }}>📡 Broadcasting yourself...</Text>
      <Text style={{ color: 'lime', fontSize: 16, marginBottom: 10 }}>
        🧍 You: {nickname || 'Unknown'} ({uuid || 'No UUID'})
      </Text>

      <Button title="➕ Add Friend" onPress={() => navigation.navigate('QRCodeScanner')} color="lime" />

      <Text style={{ color: 'lime', fontWeight: 'bold', marginVertical: 10 }}>Nearby Mesh Mates:</Text>
      <ScrollView style={{ maxHeight: 300 }}>
        {detectedUsers.map((user) => {
          const distance = user.distance;
          const proximityPercent = Math.max(0, Math.min(1, 1 - distance / 50));
          const barWidth = `${Math.round(proximityPercent * 100)}%`;

          return (
            <View key={user.uuid} style={{ marginBottom: 20 }}>
              <Text style={{ color: 'lime' }}>🟢 {user.nickname} ({user.uuid})</Text>
              <Text style={{ color: '#999', fontSize: 10 }}>📶 RSSI: {user.rssi}</Text>
              <Text style={{ color: '#999', fontSize: 20 }}>📏 Distance: ~{user.distance.toFixed(2)} meters</Text>
              <View style={{ height: 10, backgroundColor: '#333', marginTop: 6, marginBottom: 6, borderRadius: 5, overflow: 'hidden' }}>
                <View style={{ width: barWidth, height: '100%', backgroundColor: 'lime' }} />
              </View>
              <Text style={{ color: '#666', fontSize: 10 }}>Raw: {user.rawData}</Text>
              <Text style={{ color: '#666', fontSize: 10 }}>Seen at: {new Date(user.timestamp).toLocaleTimeString()}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);

  if (!isReady) {
    return <NicknameScreen onComplete={() => setIsReady(true)} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: true, headerStyle: { backgroundColor: 'black' }, headerTintColor: 'lime' }}>
        <Stack.Screen name="FestivalFinder" component={MainScreen} />
        <Stack.Screen name="QRCodeScanner" component={QRCodeScanner} options={{ title: 'Scan QR Code' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
