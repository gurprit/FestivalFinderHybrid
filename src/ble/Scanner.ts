import { BleManager } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

const bleManager = new BleManager();

function estimateDistance(rssi: number, txPower = -59): number {
  if (rssi === 0) return -1.0;
  const ratio = rssi * 1.0 / txPower;
  if (ratio < 1.0) return Math.pow(ratio, 10);
  else return 0.89976 * Math.pow(ratio, 7.7095) + 0.111;
}

export async function startScanning(
  onDeviceFound: (data: {
    nickname: string;
    uuid: string;
    rawData: string;
    rawBase64: string;
    timestamp: number;
    rssi: number;
    distance: number;
  }) => void
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
        const slice1 = buffer.slice(1).toString('utf8');
        const slice2 = buffer.slice(2).toString('utf8');
        const decoded =
          slice2.startsWith('MM|') ? slice2 :
          slice1.startsWith('MM|') ? slice1 :
          null;

        if (decoded) {
          const parts = decoded.split('|');
          if (parts.length >= 3) {
            const nickname = parts[1];
            const uuid = parts[2];
            const rssi = device.rssi ?? -100;
            const distance = estimateDistance(rssi);

            onDeviceFound({
              nickname,
              uuid,
              rawData: decoded,
              rawBase64: manufacturerData,
              timestamp: Date.now(),
              rssi,
              distance,
            });
          }
        }
      } catch (e) {
        console.error('⚠️ Failed to parse manufacturerData:', e);
      }
    }
  });
}

export function stopScanning() {
  bleManager.stopDeviceScan();
  console.log('🛑 Stopped BLE scanning');
}
