// 작성자: 김진우 — 마이탭과 내 건강이 동일한 SDK → 서버 저장 경로를 사용한다.
import { syncSamsungHealth } from '../dataConnection/samsungSync';
export const refreshSamsungConnection = (onProgress?: (text: string) => void) =>
  syncSamsungHealth({ onProgress });
