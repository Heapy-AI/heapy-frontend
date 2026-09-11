// 작성자: 김진우 — 화면 너비와 글자 확대에 맞춰 공통 배치를 결정한다.
import { useWindowDimensions } from 'react-native';

export function useResponsiveLayout() {
  const { width, fontScale } = useWindowDimensions();
  const contentWidth = Math.min(width, 720);
  const compact = contentWidth < 380 || fontScale > 1.2;
  return {
    compact,
    padding: compact ? 16 : 24,
    stackCards: contentWidth < 360 || fontScale > 1.2,
  };
}
