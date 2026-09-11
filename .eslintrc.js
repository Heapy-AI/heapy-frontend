module.exports = {
  root: true,
  extends: '@react-native',
  // 작성자: 김진우 — 로컬 개발 자료는 앱 문법 검증에서 제외한다.
  ignorePatterns: [
    'artifacts/',
    'preview/',
    '__tests__/',
    'jest.config.js',
    'docs/',
    'Reference/',
    'fixtures/',
    'screenshots/',
    'reports/',
    'tmp/',
    'temp/',
    'scratch/',
    'dev-tools/',
  ],
};
