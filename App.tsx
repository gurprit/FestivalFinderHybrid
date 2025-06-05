// App.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import NicknameScreen from './src/screens/NicknameScreen';
import { startBroadcasting, stopBroadcasting } from './src/ble/Broadcaster';
import useBluetoothPermissions from './src/hooks/useBluetoothPermissions';
import { startScanning, stopScanning } from './src/ble/Scanner';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [detectedUsers, setDetectedUsers] = useState<{ nickname: string; uuid: string }[]>([]);

  useBluetoothPermissions();

  useEffect(() => {
    if (isReady) {
      startBroadcasting();
      return () => stopBroadcasting();
    }
  }, [isReady]);

  useEffect(() => {
    startScanning((nickname, uuid) => {
      setDetectedUsers((prev) => {
        const alreadyExists = prev.some((user) => user.uuid === uuid);
        if (alreadyExists) return prev;
        return [...prev, { nickname, uuid }];
      });
    });

    return () => stopScanning();
  }, []);

  if (!isReady) {
    return <NicknameScreen onComplete={() => setIsReady(true)} />;
  }

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: 'black' }}>
      <Text style={{ color: 'lime', fontSize: 18, marginBottom: 10 }}>📡 Broadcasting yourself...</Text>
      <Text style={{ color: 'lime', fontWeight: 'bold', marginBottom: 5 }}>Nearby Mesh Mates:</Text>
      <ScrollView>
        {detectedUsers.map((user, index) => (
          <Text key={index} style={{ color: 'lime', marginBottom: 3 }}>
            🟢 {user.nickname}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}
