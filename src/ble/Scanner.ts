// Scanner.ts
import { BleManager } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';
import { Buffer } from 'buffer';

global.Buffer = Buffer;

let bleManager = new BleManager();
let isScanning = false;

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
    heading: number | null;
    rawData: string;
    rawBase64: string;
    timestamp: number;
    rssi: number;
    distance: number;
  }) => void
) {
  if (isScanning) {
    console.warn('⚠️ startScanning called but scan already in progress. Skipping.');
    return;
  }

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
  isScanning = true;

  try {
    // 👉 Fully recreate the BleManager before scanning
    bleManager.destroy();
    bleManager = new BleManager();

    bleManager.startDeviceScan(null, { allowDuplicates: true }, (error, device) => {
      if (error) {
        console.error('❌ Scan error callback:', error.message);
        isScanning = false;
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
            if (parts.length >= 4) {
              const nickname = parts[1];
              const uuid = parts[2];
              const heading = parseInt(parts[3], 10);
              const rssi = device.rssi ?? -100;
              const distance = estimateDistance(rssi);

              onDeviceFound({
                nickname,
                uuid,
                heading: isNaN(heading) ? null : heading,
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
  } catch (e) {
    console.error('❌ startDeviceScan threw immediately:', e);
    isScanning = false;
  }
}

export async function stopScanning() {
  try {
    bleManager.stopDeviceScan();
    console.log('🛑 Stopped BLE scanning');
  } catch (e) {
    console.warn('⚠️ stopDeviceScan threw an error:', e);
  }
  isScanning = false;
}
