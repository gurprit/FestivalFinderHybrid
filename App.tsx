// App.tsx
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import NicknameScreen from './src/screens/NicknameScreen';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  if (!isReady) {
    return <NicknameScreen onComplete={() => setIsReady(true)} />;
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Welcome to FestivalFinder!</Text>
    </View>
  );
}
