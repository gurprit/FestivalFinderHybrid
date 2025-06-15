import BleAdvertiser from 'react-native-ble-advertiser';
import { Platform, PermissionsAndroid } from 'react-native';

function stringToBytes(str: string): number[] {
  return Array.from(str).map((char) => char.charCodeAt(0));
}

import { shortUuid, shortNick } from '../utils/shorten';

export async function broadcastRelayedInfo(originalNickname: string, originalUuid: string, relayerNickname: string, relayerUuid: string) {
  const truncatedOriginalUuid = shortUuid(originalUuid);
  const truncatedRelayerUuid = shortUuid(relayerUuid);
  // Sanitize after shortening, as shortNick doesn't prevent pipe characters if original had them before shortening.
  const cleanOrigNick = shortNick(originalNickname).replace(/\|/g, '');

  let payload = `MR|${truncatedOriginalUuid}|${truncatedRelayerUuid}|${cleanOrigNick}`;
  if (payload.length > 26) {
    console.warn(`⚠️ Payload too long, truncating: ${payload}`);
    payload = payload.substring(0, 26);
  }

  const payloadBytes = stringToBytes(payload);

  console.log('📢 Broadcasting relayed info:', payload, payloadBytes);

  if (Platform.OS === 'android' && Platform.Version >= 31) {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
    ]);

    if (
      granted['android.permission.BLUETOOTH_ADVERTISE'] !==
      PermissionsAndroid.RESULTS.GRANTED
    ) {
      console.warn('❌ BLUETOOTH_ADVERTISE permission not granted for relayed info');
      return;
    }
  }

  try {
    await BleAdvertiser.broadcast(
      null, // Using null for serviceUuids as in startBroadcasting
      payloadBytes,
      {
        advertiseMode: BleAdvertiser.ADVERTISE_MODE_LOW_LATENCY,
        txPowerLevel: BleAdvertiser.ADVERTISE_TX_POWER_HIGH,
        includeDeviceName: false,
        connectable: false,
        manufacturerId: 0x0059, // Same manufacturerId as in startBroadcasting
      }
    );

    console.log('✅ Relayed broadcast started');
  } catch (error) {
    console.error('❌ Relayed broadcast error:', error);
  }
}

export async function startBroadcasting(nickname: string, uuid: string) {
  const cleanNickname = nickname.replace(/\|/g, '');
  const payload = `MM|${cleanNickname}|${uuid}`.slice(0, 26);
  const payloadBytes = stringToBytes(payload);

  // Log with potentially cleaned nickname for clarity, though payload uses cleaned one.
  if (nickname !== cleanNickname) {
    console.log(`📢 Broadcasting payload (nickname sanitized from "${nickname}" to "${cleanNickname}"):`, payload, payloadBytes);
  } else {
    console.log('📢 Broadcasting payload:', payload, payloadBytes);
  }

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
      payloadBytes,
      {
        advertiseMode: BleAdvertiser.ADVERTISE_MODE_LOW_LATENCY,
        txPowerLevel: BleAdvertiser.ADVERTISE_TX_POWER_HIGH,
        includeDeviceName: false,
        connectable: false,
        manufacturerId: 0x0059,
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
