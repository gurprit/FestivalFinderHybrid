//App.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import NicknameScreen from './src/screens/NicknameScreen';
import { startBroadcasting, stopBroadcasting } from './src/ble/Broadcaster';
import useBluetoothPermissions from './src/hooks/useBluetoothPermissions';
import { BleManager } from 'react-native-ble-plx';
import AsyncStorage from '@react-native-async-storage/async-storage';

const bleManager = new BleManager();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [detectedUsers, setDetectedUsers] = useState<{ nickname: string; uuid: string; rawData: string; timestamp: number }[]>([]);
  const [allDevices, setAllDevices] = useState<any[]>([]);
  const [uuid, setUuid] = useState('');
  const [nickname, setNickname] = useState('');

  useBluetoothPermissions();

  useEffect(() => {
    if (isReady) {
      startBroadcasting();

      console.log('⚡ Broadcasting started');

      // Load and display your own info
      (async () => {
        const storedUuid = await AsyncStorage.getItem('@user_uuid');
        const storedNickname = await AsyncStorage.getItem('@nickname');
        if (storedUuid) setUuid(storedUuid);
        if (storedNickname) setNickname(storedNickname);
      })();
      return () => stopBroadcasting();
    }
  }, [isReady]);

  useEffect(() => {
    const subscription = bleManager.onStateChange((state) => {
      if (state === 'PoweredOn') {
        bleManager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
          if (error) {
            console.warn('Scan error:', error);
            return;
          }

          if (device) {
            const newEntry = {
              name: device.name ?? 'Unknown',
              id: device.id,
              rssi: device.rssi,
              manufacturerData: device.manufacturerData,
              serviceUUIDs: device.serviceUUIDs,
            };

            console.log('device .. ', device);

            setAllDevices((prev) => {
              const alreadyExists = prev.some((d) => d.id === device.id);
              if (alreadyExists) return prev;
              return [...prev, newEntry];
            });

            // Try to extract app-specific data from manufacturerData
            try {
              const data = device.manufacturerData;
              if (data) {
                const decoded = Buffer.from(data, 'base64').toString('utf8');
                if (decoded.includes(':')) {
                  const [nickname, uuid] = decoded.split(':');
                  const alreadyExists = detectedUsers.some((u) => u.uuid === uuid);
                  if (!alreadyExists) {
                    setDetectedUsers((prev) => [
                      ...prev,
                      {
                        nickname,
                        uuid,
                        rawData: data,
                        timestamp: Date.now(),
                      },
                    ]);
                  }
                }
              }
            } catch (e) {
              // ignore decoding errors
            }
          }
        });
      }
    }, true);

    return () => {
      bleManager.stopDeviceScan();
      subscription.remove();
    };
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
        <View key={index} style={{ marginBottom: 10 }}>
          <Text style={{ color: 'lime' }}>🟢 {user.nickname} ({user.uuid})</Text>
          <Text style={{ color: '#999', fontSize: 10 }}>Raw: {user.rawData}</Text>
          <Text style={{ color: '#999', fontSize: 10 }}>
            Seen at: {new Date(user.timestamp).toLocaleTimeString()}
          </Text>
        </View>
        ))}
      </ScrollView>

      <Text style={{ color: 'lime', fontWeight: 'bold', marginTop: 20, marginBottom: 5 }}>🛰 All Nearby BLE Devices:</Text>
      <ScrollView>
        {allDevices.map((device, index) => (
          <Text key={index} style={{ color: '#999', fontSize: 12, marginBottom: 5 }}>
            {device.name} ({device.id}) | RSSI: {device.rssi}{"\n"}
            Data: {device.manufacturerData}
          </Text>
        ))}
      </ScrollView>
    </View>
  );

    


}
