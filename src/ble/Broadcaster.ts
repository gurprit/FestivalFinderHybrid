import BleAdvertiser from 'react-native-ble-advertiser';
import { Platform, PermissionsAndroid } from 'react-native';

function stringToBytes(str: string): number[] {
  return Array.from(str).map((char) => char.charCodeAt(0));
}

export async function startBroadcasting(nickname: string, uuid: string, heading: number) {
  const shortName = nickname.slice(0, 6);                     // 6 chars
  const shortUUID = uuid.replace(/-/g, '').slice(0, 6);       // 6 chars
  const shortHeading = heading.toString().padStart(3, '0');   // 3 chars
  const payload = `MM|${shortName}|${shortUUID}|${shortHeading}`; // ~19 chars max

  const payloadBytes = stringToBytes(payload);
  console.log('📢 Broadcasting payload:', payload, payloadBytes);

  try {
    await BleAdvertiser.broadcast(
      '00000000-0000-1000-8000-00805F9B34FB',
      payloadBytes,
      {
        advertiseMode: BleAdvertiser.ADVERTISE_MODE_LOW_LATENCY,
        txPowerLevel: BleAdvertiser.ADVERTISE_TX_POWER_HIGH,
        includeDeviceName: false,
        connectable: false,
        manufacturerId: 0x1234,  // Ensure this matches your patched native code
      }
    );
    console.log('✅ Broadcasting started');
  } catch (error) {
    console.error('❌ Broadcast error:', error);
    throw error;
  }
}

// 🔧 Add this:
export async function stopAdvertising() {
  try {
    await BleAdvertiser.stopBroadcast();
    console.log('🛑 Broadcasting stopped');
  } catch (error) {
    console.warn('⚠️ Failed to stop broadcasting:', error);
  }
}
