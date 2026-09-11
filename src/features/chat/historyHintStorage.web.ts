// 작성자: 김진우 — 웹에서도 상담 기록 안내를 처음 한 번만 표시한다.
const key = 'heapy.chat-history-hint.seen';
const browser = globalThis as typeof globalThis & {
  localStorage: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
  };
};

export const historyHintStorage = {
  async hasSeen(): Promise<boolean> {
    return browser.localStorage.getItem(key) === '1';
  },
  async markSeen(): Promise<void> {
    browser.localStorage.setItem(key, '1');
  },
};
