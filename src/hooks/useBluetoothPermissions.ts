import { useEffect } from 'react';
import {
  requestMultiple,
  checkMultiple,
  PERMISSIONS,
  RESULTS,
} from 'react-native-permissions';
import { Platform } from 'react-native';

export default function useBluetoothPermissions() {
  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        const permissions = [
          PERMISSIONS.ANDROID.BLUETOOTH_ADVERTISE,
          PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
          PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        ];

        const statuses = await checkMultiple(permissions);
        const toRequest = permissions.filter(
          (perm) => statuses[perm] !== RESULTS.GRANTED
        );

        if (toRequest.length > 0) {
          await requestMultiple(toRequest);
        }
      }
    };

    requestPermissions();
  }, []);
}
