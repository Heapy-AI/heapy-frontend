// 작성자: 김진우 — 원본 Figma SVG를 고정 크기로 표시한다.
import React from 'react';
import { SvgXml } from 'react-native-svg';
export function HealthIcon({
  xml,
  width,
  height,
}: {
  xml: string;
  width: number;
  height: number;
}) {
  return <SvgXml xml={xml} width={width} height={height} />;
}
