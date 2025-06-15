import { BleManager } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

const bleManager = new BleManager();

export type ScanEventType = {
  type: 'direct';
  nickname: string;
  uuid: string;
  rssi: number | null;
  rawData: string;
  rawBase64: string;
  timestamp: number;
} | {
  type: 'relayed';
  originalShortUuid: string;
  relayerShortUuid: string;
  originalShortNickname: string;
  rssi: number | null;
  rawData: string;
  rawBase64: string;
  timestamp: number;
};

export async function startScanning(
  onDeviceFound: (data: ScanEventType) => void
) {
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
      console.warn('❌ Not all scan permissions granted');
      return;
    }
  }

  console.log('🔍 Starting BLE scan...');

  bleManager.startDeviceScan(null, { allowDuplicates: true }, (error, device) => {
    if (error) {
      console.error('❌ Scan error:', error.message);
      return;
    }

    const manufacturerData = device?.manufacturerData;
    if (manufacturerData) {
      try {
        const buffer = Buffer.from(manufacturerData, 'base64');
        const slice1 = buffer.slice(1).toString('utf8'); // Attempt decoding from byte 1
        const slice2 = buffer.slice(2).toString('utf8'); // Attempt decoding from byte 2

        let decoded: string | null = null;

        // Prioritize MM| or MR| prefixes, trying both slices
        if (slice2.startsWith('MM|') || slice2.startsWith('MR|')) {
          decoded = slice2;
        } else if (slice1.startsWith('MM|') || slice1.startsWith('MR|')) {
          decoded = slice1;
        }
        // Add more robust check for manufacturer ID if needed in future,
        // for now, the prefix check is the primary differentiator.

        if (decoded) {
          const parts = decoded.split('|');
          const timestamp = Date.now();
          const rssi = device.rssi;

          if (decoded.startsWith('MM|') && parts.length >= 3) {
            const nickname = parts[1];
            const uuid = parts[2];
            onDeviceFound({
              type: 'direct',
              nickname,
              uuid,
              rssi,
              rawData: decoded,
              rawBase64: manufacturerData,
              timestamp,
            });
          } else if (decoded.startsWith('MR|') && parts.length >= 4) {
            const originalShortUuid = parts[1];
            const relayerShortUuid = parts[2];
            const originalShortNickname = parts[3];
            onDeviceFound({
              type: 'relayed',
              originalShortUuid,
              relayerShortUuid,
              originalShortNickname,
              rssi,
              rawData: decoded,
              rawBase64: manufacturerData,
              timestamp,
            });
          } else {
            // console.log('Unknown prefix or malformed data:', decoded);
          }
        }
      } catch (e) {
        // console.error('⚠️ Failed to parse manufacturerData:', e, manufacturerData);
      }
    }
  });
}

export function stopScanning() {
  bleManager.stopDeviceScan();
  console.log('🛑 Stopped BLE scanning');
}