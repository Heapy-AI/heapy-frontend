import React, { CSSProperties } from 'react';
import { StyleSheet } from 'react-native';
import type { LinearGradientProps } from 'react-native-linear-gradient';

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
};

export default function LinearGradient({
  colors,
  start,
  end,
  locations,
  style,
  children,
}: LinearGradientProps) {
  const from = start ?? { x: 0.5, y: 0 };
  const to = end ?? { x: 0.5, y: 1 };
  const angle = 90 - (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  const stops = colors.map((color, index) =>
    locations?.[index] === undefined
      ? color
      : `${color} ${locations[index]! * 100}%`,
  );
  return (
    <div
      style={{
        ...containerStyle,
        ...(StyleSheet.flatten(style) as CSSProperties),
        backgroundImage: `linear-gradient(${angle}deg, ${stops.join(', ')})`,
      }}
    >
      {children}
    </div>
  );
}
