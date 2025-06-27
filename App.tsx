import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Button } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import NicknameScreen from './src/screens/NicknameScreen';

import { startBroadcasting, stopBroadcasting } from './src/ble/Broadcaster';
import { startScanning, stopScanning } from './src/ble/Scanner';
import useBluetoothPermissions from './src/hooks/useBluetoothPermissions';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Stack = createNativeStackNavigator();

function MainScreen({ navigation }: any) {
  const [detectedUsers, setDetectedUsers] = useState<
    { nickname: string; uuid: string; rawData: string; rawBase64: string; timestamp: number; rssi: number; distance: number }[]
  >([]);
  const [friends, setFriends] = useState<{ nickname: string; uuid: string }[]>([]);
  const [uuid, setUuid] = useState('');
  const [nickname, setNickname] = useState('');

  useBluetoothPermissions();

  useEffect(() => {
    const loadAndStart = async () => {
      const storedUuid = await AsyncStorage.getItem('@user_uuid');
      const storedNickname = await AsyncStorage.getItem('@nickname');
      const storedFriends = await AsyncStorage.getItem('@friends_list');

      if (storedUuid) setUuid(storedUuid);
      if (storedNickname) setNickname(storedNickname);
      if (storedFriends) setFriends(JSON.parse(storedFriends));

      if (storedNickname && storedUuid) {
        await startBroadcasting(storedNickname, storedUuid);
        startScanning((data) => {
          setDetectedUsers((prev) => {
            const exists = prev.find((u) => u.uuid === data.uuid);
            if (exists) {
              return prev.map((u) => (u.uuid === data.uuid ? { ...u, ...data } : u));
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

  const handleAddFriend = async (user: { uuid: string; nickname: string }) => {
    const updated = [...friends, { uuid: user.uuid, nickname: user.nickname }];
    setFriends(updated);
    await AsyncStorage.setItem('@friends_list', JSON.stringify(updated));
  };

  const handleRemoveFriend = async (uuidToRemove: string) => {
    const updated = friends.filter((f) => f.uuid !== uuidToRemove);
    setFriends(updated);
    await AsyncStorage.setItem('@friends_list', JSON.stringify(updated));
  };

  const isFriend = (uuid: string) => friends.some((f) => f.uuid === uuid);
  const nearbyNotFriends = detectedUsers.filter((user) => !isFriend(user.uuid));

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: 'black' }}>
      <Text style={{ color: 'lime', fontSize: 18, marginBottom: 10 }}>📡 Broadcasting yourself...</Text>
      <Text style={{ color: 'lime', fontSize: 16, marginBottom: 10 }}>
        🧍 You: {nickname || 'Unknown'} ({uuid || 'No UUID'})
      </Text>

      <Text style={{ color: 'lime', fontWeight: 'bold', marginTop: 20 }}>✅ Added Friends:</Text>
      <ScrollView style={{ maxHeight: 200 }}>
        {friends.map((friend) => {
          const fullData = detectedUsers.find((u) => u.uuid === friend.uuid);
          if (!fullData) return null;
          const proximityPercent = Math.max(0, Math.min(1, 1 - fullData.distance / 50));
          const barWidth = `${Math.round(proximityPercent * 100)}%`;

          return (
            <View key={friend.uuid} style={{ marginBottom: 20 }}>
              <Text style={{ color: '#9f9' }}>🧑‍🤝‍🧑 {friend.nickname} ({friend.uuid})</Text>
              <Text style={{ color: '#999', fontSize: 10 }}>📶 RSSI: {fullData.rssi}</Text>
              <Text style={{ color: '#999', fontSize: 20 }}>📏 Distance: ~{fullData.distance.toFixed(2)} meters</Text>
              <View style={{ height: 10, backgroundColor: '#333', marginTop: 6, marginBottom: 6, borderRadius: 5, overflow: 'hidden' }}>
                <View style={{ width: barWidth, height: '100%', backgroundColor: 'lime' }} />
              </View>
              <Text style={{ color: '#666', fontSize: 10 }}>Raw: {fullData.rawData}</Text>
              <Text style={{ color: '#666', fontSize: 10 }}>Seen at: {new Date(fullData.timestamp).toLocaleTimeString()}</Text>
              <Button title="❌ Remove Friend" onPress={() => handleRemoveFriend(friend.uuid)} color="#f66" />
            </View>
          );
        })}
      </ScrollView>

      <Text style={{ color: 'lime', fontWeight: 'bold', marginVertical: 10 }}>Nearby Mesh Mates:</Text>
      <ScrollView style={{ maxHeight: 200 }}>
        {nearbyNotFriends.map((user) => (
          <View key={user.uuid} style={{ marginBottom: 20 }}>
            <Text style={{ color: 'lime' }}>🟢 {user.nickname}</Text>
            <Button title="➕ Add Friend" onPress={() => handleAddFriend(user)} color="lime" />
          </View>
        ))}
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
