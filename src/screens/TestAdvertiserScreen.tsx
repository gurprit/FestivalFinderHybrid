// TestAdvertiserScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ToastAndroid } from 'react-native';
import { startBroadcasting, stopBroadcasting } from '../ble/Broadcaster';

export default function TestAdvertiserScreen() {
  const [status, setStatus] = useState('Starting...');

  useEffect(() => {
    ToastAndroid.show('Starting test broadcast', ToastAndroid.SHORT);
    setStatus('Broadcasting test data...');
    startBroadcasting('TestUser', 'TEST-UUID-1234');
    return () => {
      stopBroadcasting();
      setStatus('Stopped');
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: 'black', padding: 20 }}>
      <Text style={{ color: 'lime' }}>🛰 Broadcast Test Screen</Text>
      <Text style={{ color: 'cyan', marginTop: 10 }}>{status}</Text>
      <Text style={{ color: '#999', fontSize: 12, marginTop: 20 }}>
        Use another phone with nRF Connect to check for 'TestUser:TEST-UUID-1234' in Manufacturer Data.
      </Text>
    </View>
  );
}
