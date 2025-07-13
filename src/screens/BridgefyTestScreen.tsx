import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  Button,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Bridgefy from 'bridgefy-react-native';

const BridgefyTestScreen = () => {
  const [log, setLog] = useState('');

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Bluetooth Friend Finder Requires Location Permission',
            message:
              'This app needs access to your location to find nearby friends.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('You can use the location');
          startBridgefy();
        } else {
          console.log('Location permission denied');
        }
      } catch (err) {
        console.warn(err);
      }
    } else {
      startBridgefy();
    }
  };

  const startBridgefy = () => {
    const apiKey = "YOUR_API_KEY"; // Replace with your actual API key
    Bridgefy.start(apiKey, (error) => {
      if (error) {
        setLog(`Error starting Bridgefy: ${error}`);
      } else {
        setLog('Bridgefy started successfully');
      }
    });
  };

  return (
    <View>
      <Text>Bridgefy Test Screen</Text>
      <Button title="Start Bridgefy" onPress={requestPermissions} />
      <Text>{log}</Text>
    </View>
  );
};

export default BridgefyTestScreen;
