// 작성자: 김진우 — 피그마에서 추출한 원본 SVG를 표시한다.
import React from 'react';
import { SvgXml } from 'react-native-svg';
export function SvgAsset({
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
