// 작성자: 김진우 — 미리보기에서도 동일한 원본 SVG를 표시한다.
import React from 'react';
import { Image } from 'react-native';
export function HealthIcon({
  xml,
  width,
  height,
}: {
  xml: string;
  width: number;
  height: number;
}) {
  return (
    <Image
      accessible={false}
      source={{
        uri: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml),
      }}
      style={{ width, height }}
    />
  );
}
