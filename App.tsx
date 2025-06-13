import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import NicknameScreen from './src/screens/NicknameScreen';
import { startBroadcasting, stopBroadcasting } from './src/ble/Broadcaster';
import useBluetoothPermissions from './src/hooks/useBluetoothPermissions';
import { BleManager } from 'react-native-ble-plx';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

const bleManager = new BleManager();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [detectedUsers, setDetectedUsers] = useState([]);
  const [allDevices, setAllDevices] = useState([]);
  const [uuid, setUuid] = useState('');
  const [nickname, setNickname] = useState('');

  useBluetoothPermissions();

  useEffect(() => {
    const loadAndBroadcast = async () => {
      const storedUuid = await AsyncStorage.getItem('@user_uuid');
      const storedNickname = await AsyncStorage.getItem('@nickname');

      if (storedUuid) setUuid(storedUuid);
      if (storedNickname) setNickname(storedNickname);

      if (storedNickname && storedUuid) {
        await startBroadcasting(storedNickname, storedUuid);
        console.log('⚡ Broadcasting started');
      } else {
        console.warn('❌ Missing nickname or UUID for broadcasting');
      }
    };

    if (isReady) {
      loadAndBroadcast();
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
            setAllDevices((prev) => {
              const alreadyExists = prev.some((d) => d.id === device.id);
              if (alreadyExists) return prev;
              return [...prev, device];
            });

            const data = device.manufacturerData;
            if (data) {
              try {
                const buffer = Buffer.from(data, 'base64');
                const try1 = buffer.slice(1).toString('utf8');
                const try2 = buffer.slice(2).toString('utf8');

                const decoded =
                  try2.includes(':') && try2.indexOf(':') < 20
                    ? try2
                    : try1.includes(':') && try1.indexOf(':') < 20
                    ? try1
                    : null;

                if (decoded) {
                  const [name, id] = decoded.split(':');
                  if (name && id && !detectedUsers.some((u) => u.uuid === id)) {
                    setDetectedUsers((prev) => [
                      ...prev,
                      {
                        nickname: name,
                        uuid: id,
                        rawData: decoded,
                        timestamp: Date.now(),
                      },
                    ]);
                  }
                }
              } catch (e) {
                console.warn('❌ Decoding error:', e);
              }
            }
          }
        });
      }
    }, true);

    return () => {
      bleManager.stopDeviceScan();
      subscription.remove();
    };
  }, [isReady, detectedUsers]);

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
    </View>
  );
}