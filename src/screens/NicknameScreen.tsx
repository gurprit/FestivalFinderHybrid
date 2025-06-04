// src/screens/NicknameScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

const STORAGE_KEY_NICKNAME = '@nickname';
const STORAGE_KEY_UUID = '@user_uuid';

export default function NicknameScreen({ onComplete }: { onComplete: () => void }) {
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadNickname = async () => {
      const savedName = await AsyncStorage.getItem(STORAGE_KEY_NICKNAME);
      const savedUUID = await AsyncStorage.getItem(STORAGE_KEY_UUID);

      if (savedName && savedUUID) {
        setNickname(savedName);
        onComplete(); // Skip this screen if already setup
      } else {
        // Generate UUID if not stored
        if (!savedUUID) {
          const newUUID = uuid.v4().toString();
          await AsyncStorage.setItem(STORAGE_KEY_UUID, newUUID);
        }
      }

      setIsLoading(false);
    };

    loadNickname();
  }, []);

  const handleSave = async () => {
    if (nickname.trim().length === 0) {
      Alert.alert('Please enter a nickname.');
      return;
    }

    await AsyncStorage.setItem(STORAGE_KEY_NICKNAME, nickname);
    onComplete();
  };

  if (isLoading) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Enter your nickname:</Text>
      <TextInput
        value={nickname}
        onChangeText={setNickname}
        placeholder="Nickname"
        style={styles.input}
      />
      <Button title="Continue" onPress={handleSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    fontSize: 18,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
});
