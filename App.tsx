// App.tsx
import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import NicknameScreen from './src/screens/NicknameScreen';
import { startBroadcasting, stopBroadcasting } from './src/ble/Broadcaster';
import useBluetoothPermissions from './src/hooks/useBluetoothPermissions';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  useBluetoothPermissions();

  useEffect(() => {
    if (isReady) {
      startBroadcasting();

      return () => {
        stopBroadcasting();
      };
    }
  }, [isReady]);

  if (!isReady) {
    return <NicknameScreen onComplete={() => setIsReady(true)} />;
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Broadcasting yourself...</Text>
    </View>
  );
}


