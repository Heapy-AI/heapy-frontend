// 작성자: 김진우 — 상담 기록 사용 안내 여부를 인증 정보와 분리해 기기에 보관한다.
import * as Keychain from 'react-native-keychain';

const service = 'com.heapy.app.chat-history-hint';

export const historyHintStorage = {
  async hasSeen(): Promise<boolean> {
    return !!(await Keychain.getGenericPassword({ service }));
  },
  async markSeen(): Promise<void> {
    await Keychain.setGenericPassword('history-hint', 'seen', {
      service,
      storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    });
  },
};
