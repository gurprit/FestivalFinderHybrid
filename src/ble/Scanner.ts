// src/ble/Scanner.ts

import { BleManager, BleError } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

const bleManager = new BleManager();

export async function startScanning(
  onDeviceFound: (data: {
    nickname: string;
    uuid: string;
    rawData: string;
    rawBase64: string;
    timestamp: number;
  }) => void
) {
  console.log('🔍 Starting BLE scan...');

  if (Platform.OS === 'android') {
    const permissions = [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ];

    const granted = await PermissionsAndroid.requestMultiple(permissions);
    const allGranted = permissions.every(
      (perm) => granted[perm] === PermissionsAndroid.RESULTS.GRANTED
    );

    if (!allGranted) {
      console.warn('❌ Not all scan permissions granted:', granted);
      return;
    }
  }

  bleManager.startDeviceScan(null, { allowDuplicates: true }, (error, device) => {
    if (error) {
      const bleError = error as BleError;
      console.error(
        `❌ Scan error: ${bleError.message} | Reason: ${bleError.reason} | Code: ${bleError.errorCode}`
      );
      return;
    }

    const manufacturerData = device?.manufacturerData;
    if (manufacturerData) {
      try {
        const buffer = Buffer.from(manufacturerData, 'base64');
        const try1 = buffer.slice(1).toString('utf8');
        const try2 = buffer.slice(2).toString('utf8');
        const decoded =
          try2.includes(':') && try2.indexOf(':') < 20
            ? try2
            : try1.includes(':') && try1.indexOf(':') < 20
            ? try1
            : null;

        console.log(`📡 Raw base64: ${manufacturerData}`);
        console.log(`📜 Slice[1]: ${try1}`);
        console.log(`📜 Slice[2]: ${try2}`);

        if (decoded) {
          console.log(`✅ Parsed payload: ${decoded}`);
          const [nickname, uuid] = decoded.split(':');
          if (nickname && uuid) {
            onDeviceFound({
              nickname,
              uuid,
              rawData: decoded,
              rawBase64: manufacturerData,
              timestamp: Date.now(),
            });
          }
        } else {
          console.log('⚠️ No valid nickname:uuid in payload');
        }
      } catch (e) {
        console.error('⚠️ Failed to parse manufacturerData:', e);
      }
    } else {
      console.log('🔎 No manufacturerData on device:', device?.name || device?.id);
    }
  });
}

export function stopScanning() {
  bleManager.stopDeviceScan();
  console.log('🛑 Stopped BLE scanning');
}