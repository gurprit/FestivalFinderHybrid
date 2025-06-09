// src/ble/Scanner.ts
import { BleManager } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';

const bleManager = new BleManager();

export async function startScanning(
  onDeviceFound: (data: {
    nickname: string;
    uuid: string;
    rawData: string;
    timestamp: number;
  }) => void
  ) {
  if (Platform.OS === 'android' && Platform.Version >= 23) {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    ]);

    if (
      granted['android.permission.ACCESS_FINE_LOCATION'] !== PermissionsAndroid.RESULTS.GRANTED ||
      granted['android.permission.BLUETOOTH_SCAN'] !== PermissionsAndroid.RESULTS.GRANTED
    ) {
      console.warn('Scan permissions not granted');
      return;
    }
  }

  bleManager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
    if (error) {
      console.error('Scan error:', error);
      return;
    }

    const manufacturerData = device?.manufacturerData;
    if (manufacturerData) {
      try {
        // Convert base64 to readable string
        const buffer = Buffer.from(manufacturerData, 'base64');
        const payload = buffer.toString('utf8');

        if (payload.includes(':')) {
          const [nickname, uuid] = payload.split(':');
          console.log('Found device:', nickname, uuid);
          onDeviceFound({
            nickname,
            uuid,
            rawData: manufacturerData,
            timestamp: Date.now(),
          });
        }
      } catch (e) {
        console.error('Parse error:', e);
      }
    }
  });
}

export function stopScanning() {
  bleManager.stopDeviceScan();
  console.log('Stopped scanning');
}
