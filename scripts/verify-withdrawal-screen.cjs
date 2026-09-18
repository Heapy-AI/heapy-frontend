// 작성자: 김진우 — 실제 화면과 React Query를 실행하고 서버·기기 경계만 모의 처리한다.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
global.IS_REACT_ACT_ENVIRONMENT = true;
const tick = () => new Promise(resolve => setTimeout(resolve, 20));

async function mount({ remove = async () => {}, clear = async () => {} } = {}) {
  const events = [];
  let back;
  class ApiError extends Error {}
  const mocks = {
    react: React,
    'react-native': {
      ...Object.fromEntries(['ActivityIndicator', 'Pressable', 'ScrollView', 'Text', 'View'].map(name => [name, name])),
      StyleSheet: { create: value => value },
      BackHandler: { addEventListener: (_name, handler) => { back = handler; return { remove() {} }; } },
    },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@tanstack/react-query': require('@tanstack/react-query'),
    '../../navigation/onboardingFlow': { createSessionNavigationState: route => ({ routes: [{ name: route }] }) },
    '../../shared/api/heapyApi': { heapyApi: { withdrawAccount: async () => { events.push('삭제'); await remove(); } } },
    '../../shared/api/client': { ApiError },
    '../../shared/storage/tokenStorage': { tokenStorage: { clear: async () => { events.push('토큰 정리'); await clear(); } } },
    '../../shared/theme/tokens': { colors: {} },
    '../dataConnection/samsungSync': { clearSamsungSyncState: () => events.push('동기화 정리') },
    '../onboarding/onboardingDraft': { onboardingDraft: { clear: () => events.push('임시 입력 정리') } },
  };
  const filename = path.resolve(__dirname, '../src/features/my/AccountWithdrawalScreen.tsx');
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    if (!(name in mocks)) throw new Error(`모의 경계 누락: ${name}`);
    return mocks[name];
  }, module, module.exports);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(['사용자 기록'], { name: '검증용' });
  let screen;
  await act(async () => {
    screen = create(React.createElement(QueryClientProvider, { client },
      React.createElement(module.exports.AccountWithdrawalScreen, { navigation: {
        goBack: () => events.push('뒤로'),
        reset: state => events.push(state.routes[0].name),
      } })));
  });
  const button = label => screen.root.findAllByType('Pressable').find(node => node.props.accessibilityLabel === label);
  return { events, client, back: () => back(), button,
    consent: () => screen.root.findByProps({ accessibilityRole: 'checkbox' }),
    press: async node => { await act(async () => { node.props.onPress(); await tick(); }); },
    close: async () => { await act(async () => screen.unmount()); client.clear(); },
  };
}

test('동의 전 제출 차단, 체크 해제 시 비활성화, 재진입 시 동의 초기화', async () => {
  const ui = await mount();
  assert.equal(ui.button('탈퇴하기').props.disabled, true);
  await ui.press(ui.button('탈퇴하기'));
  assert.deepEqual(ui.events, []);
  await ui.press(ui.consent());
  assert.equal(ui.button('탈퇴하기').props.disabled, false);
  await ui.press(ui.consent());
  assert.equal(ui.button('탈퇴하기').props.disabled, true);
  await ui.close();
  const next = await mount();
  assert.equal(next.consent().props.accessibilityState.checked, false);
  await next.close();
});

test('연속 제출은 한 번만 실행하고 처리 중 뒤로 이동 차단, 완료 후 로그인 이동', async () => {
  let finish;
  const ui = await mount({ remove: () => new Promise(resolve => { finish = resolve; }) });
  await ui.press(ui.consent());
  const submit = ui.button('탈퇴하기').props.onPress;
  await act(async () => { submit(); submit(); await tick(); });
  assert.equal(ui.events.filter(item => item === '삭제').length, 1);
  assert.equal(ui.button('탈퇴하기').props.disabled, true);
  assert.equal(ui.back(), true);
  await ui.press(ui.button('뒤로 가기'));
  assert.ok(!ui.events.includes('뒤로'));
  await act(async () => { finish(); await tick(); });
  assert.equal(ui.events.at(-1), 'Login');
  assert.equal(ui.client.getQueryData(['사용자 기록']), undefined);
  await ui.close();
});

test('서버 실패 시 계정 상태 유지 후 재시도 허용', async () => {
  let calls = 0;
  const ui = await mount({ remove: async () => { if (++calls === 1) throw new Error('연결 실패'); } });
  await ui.press(ui.consent());
  await ui.press(ui.button('탈퇴하기'));
  assert.deepEqual(ui.events, ['삭제']);
  assert.equal(ui.back(), false);
  assert.equal(ui.button('탈퇴하기').props.disabled, false);
  await ui.press(ui.button('탈퇴하기'));
  assert.equal(ui.events.at(-1), 'Login');
  await ui.close();
});

test('서버 삭제 후 기기 정리 실패는 삭제 반복 없이 정리만 재시도', async () => {
  let calls = 0;
  const ui = await mount({ clear: async () => { if (++calls === 1) throw new Error('기기 저장소 실패'); } });
  await ui.press(ui.consent());
  await ui.press(ui.button('탈퇴하기'));
  assert.equal(ui.back(), true);
  assert.equal(ui.consent().props.disabled, true);
  await ui.press(ui.button('기기 정보 정리 재시도'));
  assert.equal(ui.events.filter(item => item === '삭제').length, 1);
  assert.equal(ui.events.at(-1), 'Login');
  await ui.close();
});
