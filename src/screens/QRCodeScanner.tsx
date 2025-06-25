// src/screens/QRCodeScanner.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function QRCodeScanner() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>📷 QR Code Scanner Coming Soon!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: 'lime',
    fontSize: 18,
  },
});
