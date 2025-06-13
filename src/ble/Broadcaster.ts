// src/ble/Broadcaster.ts
import BleAdvertiser from 'react-native-ble-advertiser';
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COMPANY_ID = 0x1234; // Use custom/reserved ID again for now

function stringToBytes(str: string): number[] {
  return Array.from(str).map((char) => char.charCodeAt(0));
}

export async function startBroadcasting(nickname: string, uuid: string) {
  const payload = `${nickname}:${uuid}`.slice(0, 26);
  const payloadBytes = stringToBytes(payload);

  console.log('📢 Broadcasting payload:', payload, payloadBytes);

  if (Platform.OS === 'android' && Platform.Version >= 31) {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
    ]);

    if (
      granted['android.permission.BLUETOOTH_ADVERTISE'] !==
      PermissionsAndroid.RESULTS.GRANTED
    ) {
      console.warn('❌ BLUETOOTH_ADVERTISE permission not granted');
      return;
    }
  }

  try {
    await BleAdvertiser.broadcast(
      null,
      stringToBytes(`${nickname}:${uuid}`.slice(0, 26)),
      {
        advertiseMode: BleAdvertiser.ADVERTISE_MODE_LOW_LATENCY,
        txPowerLevel: BleAdvertiser.ADVERTISE_TX_POWER_HIGH,
        includeDeviceName: false,
        connectable: false,
        manufacturerId: 0x0059, // Example: Nordic Semiconductor
      }
    );

    console.log('✅ Broadcasting started');
  } catch (error) {
    console.error('❌ Broadcast error:', error);
  }
}

export function stopBroadcasting() {
  BleAdvertiser.stopBroadcast()
    .then(() => console.log('🛑 Broadcast stopped'))
    .catch((err) => console.error('❌ Stop broadcast error:', err));
}
