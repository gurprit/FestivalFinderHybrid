import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import NicknameScreen from './src/screens/NicknameScreen';
import { startBroadcasting, stopBroadcasting } from './src/ble/Broadcaster';
import { startScanning, stopScanning } from './src/ble/Scanner';
import useBluetoothPermissions from './src/hooks/useBluetoothPermissions';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [detectedUsers, setDetectedUsers] = useState<
    { nickname: string; uuid: string; rawData: string; rawBase64: string; timestamp: number }[]
  >([]);
  const [allDevices, setAllDevices] = useState<any[]>([]);
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
            const exists = prev.some((u) => u.uuid === data.uuid);
            if (exists) return prev;
            return [...prev, data];
          });
        });
        console.log('🚀 Broadcasting and scanning started');
      } else {
        console.warn('❌ Missing nickname or UUID');
      }
    };

    if (isReady) {
      loadAndStart();
      return () => {
        stopBroadcasting();
        stopScanning();
      };
    }
  }, [isReady]);

  if (!isReady) {
    return <NicknameScreen onComplete={() => setIsReady(true)} />;
  }

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: 'black' }}>
      <Text style={{ color: 'lime', fontSize: 18, marginBottom: 10 }}>📡 Broadcasting yourself...</Text>
      <Text style={{ color: 'lime', fontSize: 16, marginBottom: 10 }}>
        🧍 You: {nickname || 'Unknown'} ({uuid || 'No UUID'})
      </Text>

      <Text style={{ color: 'lime', fontWeight: 'bold', marginBottom: 5 }}>Nearby Mesh Mates:</Text>
      <ScrollView style={{ maxHeight: 200 }}>
        {detectedUsers.map((user, index) => (
          <View key={user.uuid} style={{ marginBottom: 10 }}>
            <Text style={{ color: 'lime' }}>🟢 {user.nickname} ({user.uuid})</Text>
            <Text style={{ color: '#999', fontSize: 10 }}>Raw: {user.rawData}</Text>
            <Text style={{ color: '#999', fontSize: 10 }}>
              Seen at: {new Date(user.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}