export const colors = {
  background: '#F6FBF9',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F7F5',
  text: '#173A31',
  textMuted: '#6D807A',
  primary: '#20BA8A',
  primaryDark: '#1F8F6B',
  blue: '#4285F4',
  line: '#DDE9E5',
  danger: '#D94C4C',
  info: '#EDF6FF',
} as const;

export const spacing = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 } as const;
// 작성자: 김진우 — 챗봇의 상태바 배경과 헤더에 같은 표면 색을 사용한다.
export const chatColors = {
  surface: '#F7F3FF',
  backgroundEnd: '#EDE6FF',
} as const;
export const radius = { sm: 12, md: 18, lg: 28, pill: 999 } as const;
