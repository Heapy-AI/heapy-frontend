// 작성자: 김진우 — 수치 카드용 둥근 이중 색상 벡터 아이콘. 색과 크기는 카드 의미에 맞춘다.
import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
export function MetricIcon({ field, color }: { field: string; color: string }) {
  let graphic;
  if (field.includes('sleep'))
    graphic = (
      <>
        <Path
          d="M21 15.7A9 9 0 0 1 8.3 3a9 9 0 1 0 12.7 12.7Z"
          fill={color}
          fillOpacity={0.16}
          stroke={color}
          strokeWidth={1.7}
          strokeLinejoin="round"
        />
        <Path
          d="m17 2 .8 2.2L20 5l-2.2.8L17 8l-.8-2.2L14 5l2.2-.8Z"
          fill={color}
        />
      </>
    );
  else if (field.includes('heart'))
    graphic = (
      <>
        <Path
          d="M12 20S3 14.4 3 8.8C3 4.4 8.4 2.5 12 6.3c3.6-3.8 9-1.9 9 2.5C21 14.4 12 20 12 20Z"
          fill={color}
          fillOpacity={0.16}
          stroke={color}
          strokeWidth={1.7}
        />
        <Path
          d="M5.5 11h3l1.5-3 3 6 1.5-3h4"
          fill="none"
          stroke={color}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    );
  else if (field === 'amount_ml')
    graphic = (
      <>
        <Path
          d="M12 2.5S5 10.4 5 15a7 7 0 0 0 14 0c0-4.6-7-12.5-7-12.5Z"
          fill={color}
          fillOpacity={0.16}
          stroke={color}
          strokeWidth={1.7}
        />
        <Path
          d="M8.4 14.7c-.5 2 1.1 3.7 3 3.7"
          fill="none"
          stroke={color}
          strokeWidth={1.7}
          strokeLinecap="round"
        />
      </>
    );
  else if (field === 'steps')
    graphic = (
      <>
        <Path
          d="M8 4c-2 0-3 2.6-2.2 5.1.5 1.8 2.4 3 3.9 2.1s1.3-3 .9-4.5C10.2 5.2 9.3 4 8 4Zm8 7c-2 0-3 2.6-2.2 5.1.5 1.8 2.4 3 3.9 2.1s1.3-3 .9-4.5c-.4-1.5-1.3-2.7-2.6-2.7Z"
          fill={color}
          fillOpacity={0.16}
          stroke={color}
          strokeWidth={1.6}
        />
        <Path
          d="m9 15 1 2m7 4 .3 1"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
        />
      </>
    );
  else if (field === 'activity')
    // 작성자: 고수연 — 영역 목록의 활동 아이콘. 원래 20×20 좌표라 24 박스 가운데에 둔다.
    graphic = (
      <G transform="translate(2 2)">
        <Path
          d="M10.6667 5.33333C11.5871 5.33333 12.3333 4.58714 12.3333 3.66667C12.3333 2.74619 11.5871 2 10.6667 2C9.74619 2 9 2.74619 9 3.66667C9 4.58714 9.74619 5.33333 10.6667 5.33333Z"
          fill="none"
          stroke={color}
          strokeWidth={1.8}
        />
        <Path
          d="M7.5 19.25L8.75 14.6667L6.66667 12.1667L8.5 8M5 11.3333L8.5 8L11.1667 10.3333L14 11.3333M11.0833 10.5L9.41667 14.25L12.9167 16.9167"
          fill="none"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
    );
  else if (field === 'nutrition')
    // 작성자: 고수연 — 영역 목록의 영양 아이콘. 위와 같은 이유로 가운데에 둔다.
    graphic = (
      <G transform="translate(2 2)">
        <Path
          d="M10 5.83333C8.41667 4.08333 5.58333 4.5 4.41667 6.5C2.83333 9.16667 4.58333 14.1667 7.08333 15.9167C8 16.5833 8.83333 16.1667 10 16.1667C11.1667 16.1667 12 16.5833 12.9167 15.9167C15.4167 14.1667 17.1667 9.16667 15.5833 6.5C14.4167 4.5 11.5833 4.08333 10 5.83333Z"
          fill="none"
          stroke={color}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
        <Path
          d="M10 5.83333C10 4.16667 10.9167 3 12.75 2.5M10.1667 4.41667C9 3.08333 7.66667 2.83333 6.25 3.25"
          fill="none"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </G>
    );
  else if (field === 'weight_kg')
    graphic = (
      <>
        <Rect
          x={3}
          y={3}
          width={18}
          height={18}
          rx={5}
          fill={color}
          fillOpacity={0.12}
          stroke={color}
          strokeWidth={1.7}
        />
        <Path
          d="M7 8a7 7 0 0 1 10 0l-2 4H9Z"
          fill="white"
          stroke={color}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <Path
          d="m12 10 1.5-3"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </>
    );
  else
    graphic = (
      <>
        <Path
          d="M13 2c1 5-4 6-2 10 2-1 3-3 3-5 4 4 6 6 5 10a7.2 7.2 0 0 1-14-2c0-3 2-5 3-6 0 3 1 4 2 4-2-5 3-6 3-11Z"
          fill={color}
          fillOpacity={0.16}
          stroke={color}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
        <Circle cx={12} cy={17} r={2} fill={color} fillOpacity={0.5} />
      </>
    );
  return (
    <Svg width={25} height={25} viewBox="0 0 24 24" accessible={false}>
      {graphic}
    </Svg>
  );
}
