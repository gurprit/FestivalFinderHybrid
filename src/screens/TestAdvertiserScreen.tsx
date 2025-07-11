import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ToastAndroid } from 'react-native';
import { startBroadcasting } from '../ble/Broadcaster';
import { startScanning, stopScanning } from '../ble/Scanner';

export default function TestAdvertiserScreen() {
  const nickname = 'T1';
  const uuid = 'U1';
  const [status, setStatus] = useState('⏳ Starting...');
  const [devices, setDevices] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;

    setStatus('🟡 Starting broadcast and scan...');

    startScanning((device) => {
      const entry = `📶 ${device.nickname}:${device.uuid}\n📡 Raw Base64: ${device.rawBase64}\n📜 Raw Text: ${device.rawData}`;
      console.log('🎯 Detected:', entry);
      if (mounted) {
        setDevices((prev) => [entry, ...prev]);
      }
    });

    return () => {
      mounted = false;
      stopScanning();
      ToastAndroid.show('Broadcast & Scan stopped', ToastAndroid.SHORT);
      setStatus('🔴 Broadcast & Scan stopped');
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: 'black', padding: 20 }}>
      <Text style={{ color: 'lime', fontSize: 20, marginBottom: 10 }}>🧪 BLE Test Screen</Text>
      <Text style={{ color: 'cyan', marginBottom: 10 }}>{status}</Text>
      <Text style={{ color: 'gray', marginBottom: 10 }}>
        Open nRF Connect or another instance of this app to see BLE broadcasts.
      </Text>
      <ScrollView style={{ marginTop: 10 }}>
        {devices.map((entry, index) => (
          <Text key={index} style={{ color: 'white', marginBottom: 10 }}>
            {entry}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}
