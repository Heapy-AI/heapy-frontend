// 작성자: 김진우 — 원형 그라데이션과 맥박선을 벡터로 그려 크기에 관계없이 선명한 앱 로고를 표시한다.
import React, { useId } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

export function HeapyLogo({ size = 40 }: { size?: number }) {
  const gradientId = `heapy-${useId().replace(/:/g, '')}`;
  return (
    <View accessibilityRole="image" accessibilityLabel="HEAPY 로고">
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="15%" x2="100%" y2="85%">
            <Stop offset="0%" stopColor="#20C1AD" />
            <Stop offset="100%" stopColor="#269EDB" />
          </LinearGradient>
        </Defs>
        <Circle cx={32} cy={32} r={31} fill={`url(#${gradientId})`} />
        <Path
          d="M12 32H21L26 21L34 42L40 28L45 34H53"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={3.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
