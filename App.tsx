import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, PermissionsAndroid, Platform } from 'react-native'; // Added PermissionsAndroid, Platform
import NicknameScreen from './src/screens/NicknameScreen';
import { startBroadcasting, stopBroadcasting, broadcastRelayedInfo } from './src/ble/Broadcaster';
import { shortUuid } from '../utils/shorten';
import { startScanning, stopScanning, ScanEventType } from './src/ble/Scanner';
import useBluetoothPermissions from './src/hooks/useBluetoothPermissions';
import CompassHeading from 'react-native-compass-heading'; // Import CompassHeading
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define DetectedUser Type
export interface DetectedUser {
  id: string; // Unique identifier for the list
  type: 'direct' | 'relayed';
  nickname: string; // For direct: their actual nickname. For relayed: their original short nickname.
  uuid: string; // For direct: their full UUID. For relayed: their original short UUID.
  fullUuidDirect?: string; // Store the full UUID if we ever see this user directly

  rssi: number | null;
  timestamp: number; // When this particular piece of info was last heard by us

  // Relayed specific fields
  relayerShortUuid?: string;
  relayerNickname?: string;

  // Fields for display / logic
  displayName: string;
  displayDetail: string;
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [detectedUsers, setDetectedUsers] = useState<DetectedUser[]>([]);
  const [allDevices, setAllDevices] = useState<any[]>([]); // Kept for now, might be deprecated
  const [uuid, setUuid] = useState(''); // User's own UUID
  const [nickname, setNickname] = useState(''); // User's own Nickname
  const [relayQueue, setRelayQueue] = useState<{ originalNickname: string; originalUuid: string; }[]>([]);
  const [currentBroadcastType, setCurrentBroadcastType] = useState<'self' | 'relay'>('self');
  const [relayIndex, setRelayIndex] = useState(0);
  const [heading, setHeading] = useState<number | null>(null); // State for heading

  const nicknameRef = useRef(nickname);
  const uuidRef = useRef(uuid);
  const detectedUsersRef = useRef(detectedUsers);
  const relayQueueRef = useRef(relayQueue);
  const currentBroadcastTypeRef = useRef(currentBroadcastType);
  const relayIndexRef = useRef(relayIndex);

  useEffect(() => { nicknameRef.current = nickname; }, [nickname]);
  useEffect(() => { uuidRef.current = uuid; }, [uuid]);
  useEffect(() => { detectedUsersRef.current = detectedUsers; }, [detectedUsers]);
  useEffect(() => { relayQueueRef.current = relayQueue; }, [relayQueue]);
  useEffect(() => { currentBroadcastTypeRef.current = currentBroadcastType; }, [currentBroadcastType]);
  useEffect(() => { relayIndexRef.current = relayIndex; }, [relayIndex]);

  useBluetoothPermissions();

  // Effect for loading initial data and managing broadcast interval
  useEffect(() => {
    let broadcastInterval: NodeJS.Timeout | null = null;

    const loadInitialDataAndStartBroadcastCycle = async () => {
      const storedUuid = await AsyncStorage.getItem('@user_uuid');
      let currentNickname = nicknameRef.current; // Start with ref's current value

      const tempStoredNickname = await AsyncStorage.getItem('@nickname');
      if (tempStoredNickname) {
        const sanitized = tempStoredNickname.replace(/\|/g, '');
        if (sanitized !== tempStoredNickname) {
          await AsyncStorage.setItem('@nickname', sanitized);
          console.log('Sanitized stored nickname:', sanitized);
        }
        setNickname(sanitized); // Update state
        currentNickname = sanitized; // Ensure currentNickname is the sanitized one
      } else {
        // If nothing in storage, ensure the current state (e.g. from default or earlier input) is sanitized
        // This case is less likely if NicknameScreen always saves a value.
        const sanitizedCurrent = nickname.replace(/\|/g, '');
        if (sanitizedCurrent !== nickname) {
            setNickname(sanitizedCurrent);
            currentNickname = sanitizedCurrent;
        }
      }

      if (storedUuid) setUuid(storedUuid);
      // Nickname state is now set by the block above, ref will update via its useEffect.

      const initialUuid = storedUuid || uuidRef.current; // Use ref as fallback if somehow still needed

      if (currentNickname && initialUuid) {
        await startBroadcasting(currentNickname, initialUuid); // Use sanitized currentNickname
        setCurrentBroadcastType('self');
        console.log('🚀 Initial self-broadcast started with Nick:', currentNickname, 'UUID:', initialUuid);

        broadcastInterval = setInterval(async () => {
          await stopBroadcasting();
          const currentRelayQueue = relayQueueRef.current;
          const currentRelayIndex = relayIndexRef.current;
          const currentOwnNickname = nicknameRef.current;
          const currentOwnUuid = uuidRef.current;

          if (currentBroadcastTypeRef.current === 'self' && currentRelayQueue.length > 0) {
            const relayData = currentRelayQueue[currentRelayIndex];
            if (relayData && currentOwnNickname && currentOwnUuid) {
              await broadcastRelayedInfo(relayData.originalNickname, relayData.originalUuid, currentOwnNickname, currentOwnUuid);
              setCurrentBroadcastType('relay');
              setRelayIndex(prevIndex => (prevIndex + 1) % currentRelayQueue.length);
            } else {
              if (currentOwnNickname && currentOwnUuid) await startBroadcasting(currentOwnNickname, currentOwnUuid);
              setCurrentBroadcastType('self');
            }
          } else {
            if (currentOwnNickname && currentOwnUuid) await startBroadcasting(currentOwnNickname, currentOwnUuid);
            setCurrentBroadcastType('self');
            if (currentRelayQueue.length === 0) setRelayIndex(0);
          }
        }, 5000);
      } else {
        console.warn('❌ Missing nickname or UUID for starting broadcast cycle.');
      }
    };

    const requestCompassPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, // Compass may need location
            {
              title: "Location Permission for Compass",
              message: "This app needs access to your location to provide compass functionality.",
              buttonNeutral: "Ask Me Later",
              buttonNegative: "Cancel",
              buttonPositive: "OK"
            }
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
          console.warn(err);
          return false;
        }
      }
      // iOS permissions are typically handled via Info.plist or implicitly by CoreLocation when used.
      // For react-native-compass-heading, iOS might "just work" if location services are on.
      // If specific location permission is strictly required by the library for compass,
      // it would need react-native-permissions or similar for explicit iOS requests.
      // Assuming useBluetoothPermissions might cover some general location aspects on iOS or it's not strictly needed.
      return true;
    };

    if (isReady) {
      loadInitialDataAndStartBroadcastCycle();

      requestCompassPermission().then(granted => {
        if (granted) {
          const degree_update_rate = 3; // Angle change sensitivity
          CompassHeading.start(degree_update_rate, ({ heading, accuracy }) => {
            // console.log('Compass accuracy', accuracy); // accuracy is -1 on Android
            setHeading(heading);
          });
          console.log('🧭 Compass started.');
        } else {
          console.warn('Compass permission denied.');
        }
      });
    }

    return () => {
      if (broadcastInterval) clearInterval(broadcastInterval);
      CompassHeading.stop();
      console.log('🧭 Compass stopped.');
    };
  }, [isReady]);

  // Effect for managing BLE scanning (remains largely the same)
  useEffect(() => {
    if (isReady) {
      startScanning((data: ScanEventType) => {
        const currentTimestamp = Date.now();
        const myNickname = nicknameRef.current;
        const myUuid = uuidRef.current;
        let newDetectedUsersList = [...detectedUsersRef.current];
        let newRelayQueue = [...relayQueueRef.current];

        if (data.type === 'direct') {
          const existingUserIndex = newDetectedUsersList.findIndex(u => u.uuid === data.uuid || u.fullUuidDirect === data.uuid);
          if (existingUserIndex !== -1) {
            newDetectedUsersList[existingUserIndex] = {
              ...newDetectedUsersList[existingUserIndex],
              type: 'direct', nickname: data.nickname, uuid: data.uuid, fullUuidDirect: data.uuid,
              rssi: data.rssi, timestamp: currentTimestamp,
              displayName: data.nickname, displayDetail: '(direct)',
              relayerShortUuid: undefined, relayerNickname: undefined,
            };
          } else {
            newDetectedUsersList.push({
              id: data.uuid, type: 'direct', nickname: data.nickname, uuid: data.uuid, fullUuidDirect: data.uuid,
              rssi: data.rssi, timestamp: currentTimestamp,
              displayName: data.nickname, displayDetail: '(direct)',
            });
          }
          if (myNickname && myUuid && !newRelayQueue.some(item => item.originalUuid === data.uuid)) {
            newRelayQueue.push({ originalNickname: data.nickname, originalUuid: data.uuid });
          }
        } else if (data.type === 'relayed') {
          if (myUuid && data.relayerShortUuid === shortUuid(myUuid)) {
            // console.log('Skipping self-relayed message for:', data.originalShortNickname);
          } else {
            const relayer = newDetectedUsersList.find(u => u.type === 'direct' && u.fullUuidDirect && shortUuid(u.fullUuidDirect) === data.relayerShortUuid);
            const relayerDisplayName = relayer ? relayer.nickname : data.relayerShortUuid;
            const existingUserIndex = newDetectedUsersList.findIndex(u =>
              (u.type === 'direct' && u.fullUuidDirect?.startsWith(data.originalShortUuid)) ||
              (u.type === 'relayed' && u.uuid === data.originalShortUuid)
            );

            if (existingUserIndex !== -1) {
              const existingUser = newDetectedUsersList[existingUserIndex];
              if (existingUser.type === 'direct') { /* Direct is better, ignore */ }
              else if (currentTimestamp > existingUser.timestamp || existingUser.relayerShortUuid !== data.relayerShortUuid) {
                newDetectedUsersList[existingUserIndex] = {
                  ...existingUser, rssi: data.rssi, timestamp: currentTimestamp,
                  relayerShortUuid: data.relayerShortUuid, relayerNickname: relayerDisplayName,
                  displayName: data.originalShortNickname, displayDetail: `(via ${relayerDisplayName})`,
                };
              }
            } else {
              newDetectedUsersList.push({
                id: `${data.originalShortUuid}_${data.relayerShortUuid}`, type: 'relayed',
                nickname: data.originalShortNickname, uuid: data.originalShortUuid,
                rssi: data.rssi, timestamp: currentTimestamp,
                relayerShortUuid: data.relayerShortUuid, relayerNickname: relayerDisplayName,
                displayName: data.originalShortNickname, displayDetail: `(via ${relayerDisplayName})`,
              });
            }
          }
        }

        if (JSON.stringify(newDetectedUsersList) !== JSON.stringify(detectedUsersRef.current)) {
          setDetectedUsers(newDetectedUsersList);
        }
        if (JSON.stringify(newRelayQueue) !== JSON.stringify(relayQueueRef.current)) {
          setRelayQueue(newRelayQueue);
        }
      });
      console.log('🔍 Scanner started with comprehensive handler.');
      return () => {
        stopScanning();
        console.log('🛑 Scanning stopped.');
      };
    }
  }, [isReady]);

  // Effect for cleaning up old entries (remains the same)
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      const currentUsers = detectedUsersRef.current;
      const usersToKeep = currentUsers.filter(user => (now - user.timestamp) < fiveMinutes);
      if (usersToKeep.length !== currentUsers.length) {
        setDetectedUsers(usersToKeep);
        console.log(`🧹 Cleaned up ${currentUsers.length - usersToKeep.length} old user entries.`);
      }
    }, 60 * 1000); // Every minute
    return () => clearInterval(cleanupInterval);
  }, []); // Runs once

  if (!isReady) {
    return <NicknameScreen onComplete={() => setIsReady(true)} />;
  }

  // UI Rendering
  const currentOwnNickname = nicknameRef.current;
  const currentOwnUuid = uuidRef.current;
  const currentRelayData = relayQueueRef.current[relayIndexRef.current];
  const broadcastingStatusText = currentBroadcastTypeRef.current === 'self' || !currentRelayData
    ? `Self (${currentOwnNickname || 'You'})`
    : `Relaying ${currentRelayData.originalNickname}`;

// Helper function to get 8-direction string from heading
function getDirectionFromHeading(degree: number): string {
  if (degree >= 337.5 || degree < 22.5) return "N";
  if (degree >= 22.5 && degree < 67.5) return "NE";
  if (degree >= 67.5 && degree < 112.5) return "E";
  if (degree >= 112.5 && degree < 157.5) return "SE";
  if (degree >= 157.5 && degree < 202.5) return "S";
  if (degree >= 202.5 && degree < 247.5) return "SW";
  if (degree >= 247.5 && degree < 292.5) return "W";
  if (degree >= 292.5 && degree < 337.5) return "NW";
  return "N/A";
}

// Helper function to get compact 0-7 representation for heading
export function getCompactHeadingEncoding(degree: number | null): number | null {
  if (degree === null) return null;
  if (degree >= 337.5 || degree < 22.5) return 0; // N
  if (degree >= 22.5 && degree < 67.5) return 1;  // NE
  if (degree >= 67.5 && degree < 112.5) return 2; // E
  if (degree >= 112.5 && degree < 157.5) return 3; // SE
  if (degree >= 157.5 && degree < 202.5) return 4; // S
  if (degree >= 202.5 && degree < 247.5) return 5; // SW
  if (degree >= 247.5 && degree < 292.5) return 6; // W
  if (degree >= 292.5 && degree < 337.5) return 7; // NW
  return null; // Should not happen if degree is not null
}


  const direction = heading !== null ? getDirectionFromHeading(heading) : "N/A";

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: '#121212', paddingTop: 40 }}>
      <Text style={{ color: '#4CAF50', fontSize: 18, marginBottom: 5 }}>
        📡 Broadcasting: {broadcastingStatusText}
      </Text>
      <Text style={{ color: '#2196F3', fontSize: 16, marginBottom: 5 }}>
        🧍 You: {currentOwnNickname || 'Unknown'} ({shortUuid(currentOwnUuid) || 'No UUID'})
      </Text>
      <Text style={{ color: '#FFC107', fontSize: 14, marginBottom: 15 }}>
        🧭 Heading: {heading !== null ? `${heading.toFixed(0)}° (${direction})` : 'N/A'}
      </Text>

      <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>
        Nearby Mesh Mates ({detectedUsers.length}):
      </Text>
      <ScrollView style={{ maxHeight: 350, marginBottom: 10, borderWidth: 1, borderColor: '#333', borderRadius: 5 }}>
        {detectedUsers.length === 0 && (
          <Text style={{ color: '#777', fontStyle: 'italic', textAlign: 'center', padding: 20}}>No mates detected yet...</Text>
        )}
        {detectedUsers.map((user) => (
          <View key={user.id} style={{
            marginBottom: 8, padding: 10,
            backgroundColor: user.type === 'direct' ? '#2E7D32' : '#1565C0', // Darker green/blue
            borderRadius: 4,
            marginHorizontal: 5,
          }}>
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>
              {user.type === 'direct' ? '🟢' : '🔵'} {user.displayName}
              <Text style={{ fontWeight: 'normal', color: '#E0E0E0' }}> {user.displayDetail}</Text>
            </Text>
            <Text style={{ color: '#BDBDBD', fontSize: 11 }}>
              ID: {user.type === 'direct' && user.fullUuidDirect ? shortUuid(user.fullUuidDirect) : user.uuid}
            </Text>
            <Text style={{ color: '#BDBDBD', fontSize: 11 }}>
              RSSI: {user.rssi ?? 'N/A'} | Last seen: {new Date(user.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        ))}
      </ScrollView>

      <Text style={{ color: '#FF9800', fontWeight: 'bold', fontSize: 16, marginTop: 10, marginBottom: 5 }}>
        Relay Queue ({relayQueue.length}):
      </Text>
      <ScrollView style={{ maxHeight: 150, borderWidth: 1, borderColor: '#333', borderRadius: 5 }}>
        {relayQueue.length === 0 && (
          <Text style={{ color: '#777', fontStyle: 'italic', textAlign: 'center', padding: 20}}>Relay queue is empty.</Text>
        )}
        {relayQueue.map((item, index) => (
          <View key={item.originalUuid + "_" + index} style={{ padding: 8, backgroundColor: '#424242', borderRadius: 4, marginHorizontal:5, marginBottom: 5}}>
            <Text style={{ color: '#FFCA28', fontSize: 13 }}>
              {index + 1}. {item.originalNickname} ({shortUuid(item.originalUuid)})
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}