import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Friend = {
  uuid: string;
  nickname: string;
  heading?: number; // absolute heading from their device
  distance: number;
};

type Props = {
  heading: number; // your own device heading
  friends: Friend[];
  radius?: number; // radar radius in pixels
  maxDistance?: number; // maximum distance to show on radar
};

const RadarView: React.FC<Props> = ({
  heading,
  friends,
  radius = 150,
  maxDistance = 50,
}) => {
  const center = radius;
  const diameter = radius * 2;

  return (
    <View style={[styles.radar, { width: diameter, height: diameter, borderRadius: radius }]}>
      {friends.map((friend) => {
        if (friend.heading === undefined || friend.distance > maxDistance) return null;

        // Convert to relative angle based on device heading
        const relativeAngle = ((friend.heading - heading + 360) % 360) * (Math.PI / 180);
        const normalizedDistance = Math.min(friend.distance / maxDistance, 1);
        const dotX = center + radius * normalizedDistance * Math.sin(relativeAngle) - 6;
        const dotY = center - radius * normalizedDistance * Math.cos(relativeAngle) - 6;

        return (
          <View
            key={friend.uuid}
            style={[
              styles.dot,
              { left: dotX, top: dotY },
            ]}
          >
            <Text style={styles.dotText}>📍</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  radar: {
    backgroundColor: '#111',
    borderWidth: 2,
    borderColor: 'lime',
    position: 'relative',
    marginVertical: 20,
  },
  dot: {
    position: 'absolute',
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: {
    fontSize: 12,
    color: 'lime',
  },
});

export default RadarView;
