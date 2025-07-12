import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Friend = {
  uuid: string;
  nickname: string;
  heading?: number;
  distance: number;
};

type Props = {
  heading: number; // Your device's current heading (0-360)
  friends: Friend[];
};

const RadarView: React.FC<Props> = ({ heading, friends }) => {
  return (
    <View style={styles.container}>
      {friends.map((friend) => {
        if (friend.heading === undefined) return null;

        // Calculate relative angle: difference between your heading and friend's heading
        const relativeAngle = ((friend.heading - heading + 360) % 360);

        return (
          <View key={friend.uuid} style={styles.friendContainer}>
            <Text style={styles.arrow} transform={[{ rotate: `${relativeAngle}deg` }]}>➡️</Text>
            <Text style={styles.nickname}>{friend.nickname} ({Math.round(relativeAngle)}°)</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    alignItems: 'center',
  },
  friendContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  arrow: {
    fontSize: 32,
    color: 'lime',
  },
  nickname: {
    color: 'lime',
    fontSize: 14,
    marginTop: 4,
  },
});

export default RadarView;
