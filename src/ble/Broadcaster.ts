// src/ble/Broadcaster.ts
import BleAdvertiser from 'react-native-ble-advertiser';
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MANUFACTURER_ID = 0x1234; // just a sample, should be 0x0000 - 0xFFFF

export async function startBroadcasting() {
  if (Platform.OS === 'android' && Platform.Version >= 31) {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
    ]);

    if (
      granted['android.permission.BLUETOOTH_ADVERTISE'] !==
      PermissionsAndroid.RESULTS.GRANTED
    ) {
      console.warn('BLUETOOTH_ADVERTISE permission not granted');
      return;
    }
  }

  const uuid = await AsyncStorage.getItem('@user_uuid');
  const nickname = await AsyncStorage.getItem('@nickname');

  if (!uuid || !nickname) {
    console.warn('Missing UUID or nickname');
    return;
  }

  const payload = `${nickname}:${uuid}`.slice(0, 26); // BLE safe length

  console.log('🔊 Broadcasting payload:', payload);

  BleAdvertiser.setCompanyId(MANUFACTURER_ID);

  BleAdvertiser.broadcast(payload, BleAdvertiser.ADVERTISE_MODE_BALANCED, {
    includeDeviceName: false,
    includeTxPowerLevel: false,
  })
    .then(() => console.log('✅ Advertising started'))
    .catch((err) => console.error('❌ Advertising failed:', err));
}


export function stopBroadcasting() {
  BleAdvertiser.stopBroadcast()
    .then(() => console.log('Broadcast stopped'))
    .catch((err) => console.error('Stop broadcast error:', err));
}
