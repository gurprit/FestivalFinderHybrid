///src/screens/TestAdvertiserScreen.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, ToastAndroid, Button } from 'react-native';
import { startBroadcasting, stopBroadcasting } from '../ble/Broadcaster';

export default function TestAdvertiserScreen() {
  const [status, setStatus] = useState('⏳ Starting...');
const nickname = 'T1';
const uuid = 'U1';

  useEffect(() => {
    setStatus('🟡 Starting broadcast...');
    startBroadcasting(nickname, uuid).then(() => {
      setStatus(`✅ Broadcasting: ${nickname}:${uuid}`);
      ToastAndroid.show('Broadcasting started', ToastAndroid.SHORT);
    });

    return () => {
      stopBroadcasting();
      ToastAndroid.show('Broadcast stopped', ToastAndroid.SHORT);
      setStatus('🔴 Broadcast stopped');
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: 'black', padding: 20, justifyContent: 'center' }}>
      <Text style={{ color: 'lime', fontSize: 20, marginBottom: 20 }}>🔬 BLE Broadcast Test</Text>
      <Text style={{ color: 'cyan', fontSize: 16, marginBottom: 10 }}>{status}</Text>
      <Text style={{ color: '#999', fontSize: 12 }}>
        Use another phone with nRF Connect to scan for devices broadcasting "{nickname}:{uuid}".
      </Text>
    </View>
  );
}
