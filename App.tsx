import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Button } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import NicknameScreen from './src/screens/NicknameScreen';
import { startBroadcasting, stopAdvertising } from './src/ble/Broadcaster';
import { startScanning, stopScanning } from './src/ble/Scanner';
import useBluetoothPermissions from './src/hooks/useBluetoothPermissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RadarView from './src/components/RadarView';

import { filter, map } from 'rxjs/operators';
import BleAdvertiser from 'react-native-ble-advertiser';

const Stack = createNativeStackNavigator();

function MainScreen() {
  const [detectedUsers, setDetectedUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [uuid, setUuid] = useState('');
  const [nickname, setNickname] = useState('');
  const [heading, setHeading] = useState<number | null>(null);
  const [headingSupported, setHeadingSupported] = useState(true);
  const [bleBusy, setBleBusy] = useState(false);

  useBluetoothPermissions();

  const safeStartBroadcasting = async (name: string, uuid: string, heading: number) => {
    let retries = 0;
    const maxRetries = 3;
    const delay = 800;
  
    while (retries < maxRetries) {
      try {
        await startBroadcasting(name, uuid, heading);
        console.log('✅ Broadcasting succeeded on attempt', retries + 1);
        return;
      } catch (e) {
        console.warn(`⚠️ Broadcast attempt ${retries + 1} failed, retrying...`, e);
        retries++;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  
    console.error('❌ Broadcasting failed after retries');
  };
  

  useEffect(() => {
    const loadAndStart = async () => {
      const storedUuid = await AsyncStorage.getItem('@user_uuid');
      const storedNickname = await AsyncStorage.getItem('@nickname');
      const storedFriends = await AsyncStorage.getItem('@friends_list');

      if (storedUuid) setUuid(storedUuid);
      if (storedNickname) setNickname(storedNickname);
      if (storedFriends) setFriends(JSON.parse(storedFriends));

      if (storedNickname && storedUuid) {

        try {
          await BleAdvertiser.setCompanyId(0x1234);
          console.log('✅ companyId set to 0x1234');
        } catch (err) {
          console.error('❌ Failed to set companyId:', err);
        }

        const waitForHeading = async () => {
          let attempts = 0;
          while (heading === null && headingSupported && attempts < 10) {
            await new Promise((resolve) => setTimeout(resolve, 200));
            attempts++;
          }

          const headingToSend = headingSupported ? heading ?? 0 : 0;
          console.log('🧭 Heading sent to broadcaster (after wait):', headingToSend);

          if (!bleBusy) {
            setBleBusy(true);
            try {
              await stopScanning();
              await new Promise((r) => setTimeout(r, 800));

              await safeStartBroadcasting(storedNickname, storedUuid, headingToSend);
              await new Promise((r) => setTimeout(r, 500));

              await stopAdvertising();
              await new Promise((r) => setTimeout(r, 500));

              await startScanning((data) => {
                setDetectedUsers((prev) => {
                  const exists = prev.find((u) => u.uuid === data.uuid);
                  return exists
                    ? prev.map((u) => (u.uuid === data.uuid ? { ...u, ...data } : u))
                    : [...prev, data];
                });
              });

              console.log('🚀 Broadcasting and scanning started');
            } catch (e) {
              console.warn('⚠️ BLE error during init:', e);
            } finally {
              setBleBusy(false);
            }
          }
        };

        waitForHeading();
      }
    };

    loadAndStart();

    return () => {
      stopScanning();
    };
  }, [heading, headingSupported]);

  useEffect(() => {
    let subscription: any;

    const setupHeadingSensor = async () => {
      try {
        const sensors = await import('react-native-sensors');
        const { SensorTypes, setUpdateIntervalForType, magnetometer } = sensors;

        let validReadingSeen = false;
        setUpdateIntervalForType(SensorTypes.magnetometer, 500);

        subscription = magnetometer
          .pipe(
            filter(({ x, y, z }) => {
              const valid = x !== 0 || y !== 0 || z !== 0;
              if (valid) validReadingSeen = true;
              return valid;
            }),
            map(({ x, y }) => {
              let angle = Math.atan2(y, x) * (180 / Math.PI);
              if (angle < 0) angle += 360;
              return Math.round(angle);
            })
          )
          .subscribe(
            (angle: number) => {
              if (validReadingSeen) {
                setHeading(angle);
                setHeadingSupported(true);
                console.log('🧭 Heading updated:', angle);
              }
            },
            (err) => {
              console.warn('⚠️ Magnetometer subscription error:', err);
              setHeadingSupported(false);
              setHeading(0);
            }
          );

        console.log('🧭 Magnetometer subscription started');
      } catch (err) {
        console.warn('⚠️ Magnetometer setup failed:', err);
        setHeadingSupported(false);
        setHeading(0);
      }
    };

    setupHeadingSensor();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
        console.log('🛑 Magnetometer unsubscribed');
      }
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
      <Text style={{ color: 'lime', fontSize: 16, marginBottom: 10 }}>
        🧍 You: {nickname || 'Unknown'} ({uuid || 'No UUID'})
      </Text>
      <Text style={{ color: 'lime', fontSize: 14, marginBottom: 10 }}>
        🧭 Heading: {heading !== null ? `${heading}°` : headingSupported ? 'Loading...' : 'Not supported'}
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
              {fullData.heading !== undefined && (
                <Text style={{ color: '#aaa', fontSize: 12 }}>🧭 Friend Heading: {fullData.heading}°</Text>
              )}
              <Text style={{ color: '#999', fontSize: 10 }}>📶 RSSI: {fullData.rssi}</Text>
              <Text style={{ color: '#999', fontSize: 20 }}>📏 Distance: ~{fullData.distance.toFixed(2)} meters</Text>
              <View style={{ height: 10, backgroundColor: '#333', marginVertical: 6, borderRadius: 5, overflow: 'hidden' }}>
                <View style={{ width: barWidth, height: '100%', backgroundColor: 'lime' }} />
              </View>
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
            {user.heading !== undefined && (
              <Text style={{ color: '#aaa', fontSize: 12 }}>🧭 Heading: {user.heading}°</Text>
            )}
            <Button title="➕ Add Friend" onPress={() => handleAddFriend(user)} color="lime" />
          </View>
        ))}
      </ScrollView>

      <RadarView
        heading={heading ?? 0}
        friends={friends.map((f) => {
          const full = detectedUsers.find((u) => u.uuid === f.uuid);
          return full ? { ...full } : null;
        }).filter(Boolean)}
      />
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
