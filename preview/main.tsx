import React, { ComponentType, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from '../src/features/auth/LoginScreen';
import { SignupScreen } from '../src/features/auth/SignupScreen';
import { BasicProfileScreen } from '../src/features/onboarding/BasicProfileScreen';
import { BodyProfileScreen } from '../src/features/onboarding/BodyProfileScreen';
import { LifestyleScreen } from '../src/features/onboarding/LifestyleScreen';
import { HealthBackgroundScreen } from '../src/features/onboarding/HealthBackgroundScreen';
import { HomeScreen } from '../src/features/home/HomeScreen';
import type { RootRoute } from '../src/navigation/routes';
import { previousOnboardingRoute } from '../src/navigation/onboardingFlow';
import { OnboardingShell } from '../src/shared/components/OnboardingShell';
import { ProfileCompleteScreen } from '../src/features/dataConnection/ProfileCompleteScreen';
import { DataConnectionScreen } from '../src/features/dataConnection/DataConnectionScreen';
import { CheckupRegistrationScreen } from '../src/features/dataConnection/CheckupRegistrationScreen';
import { resetConnectionPreview } from './mockDataConnection';
import {
  PreviewScenario,
  resetPreviewData,
  setPreviewScenario,
} from './mockApi';
import { tokenStorage } from './mockStorage';
import './styles.css';

const screens = [
  {
    route: 'Login',
    label: '로그인',
    file: 'src/features/auth/LoginScreen.tsx',
    component: LoginScreen,
  },
  {
    route: 'BasicProfile',
    label: '기본 정보',
    file: 'src/features/onboarding/BasicProfileScreen.tsx',
    component: BasicProfileScreen,
  },
  {
    route: 'BodyProfile',
    label: '신체 정보',
    file: 'src/features/onboarding/BodyProfileScreen.tsx',
    component: BodyProfileScreen,
  },
  {
    route: 'Lifestyle',
    label: '생활 습관',
    file: 'src/features/onboarding/LifestyleScreen.tsx',
    component: LifestyleScreen,
  },
  {
    route: 'HealthBackground',
    label: '건강 배경',
    file: 'src/features/onboarding/HealthBackgroundScreen.tsx',
    component: HealthBackgroundScreen,
  },
  {
    route: 'Home',
    label: '홈',
    file: 'src/features/home/HomeScreen.tsx',
    component: HomeScreen,
  },
  {
    route: 'ProfileComplete',
    label: '프로필 생성 완료',
    file: 'src/features/dataConnection/ProfileCompleteScreen.tsx',
    component: ProfileCompleteScreen,
  },
  {
    route: 'DataConnection',
    label: '데이터 연결',
    file: 'src/features/dataConnection/DataConnectionScreen.tsx',
    component: DataConnectionScreen,
  },
  {
    route: 'CheckupRegistration',
    label: '건강검진 등록',
    file: 'src/features/dataConnection/CheckupRegistrationScreen.tsx',
    component: CheckupRegistrationScreen,
  },
  {
    route: 'Signup',
    label: '회원가입',
    file: 'src/features/auth/SignupScreen.tsx',
    component: SignupScreen,
  },
] as const;
const sizes = [
  { label: '기본 · 390 × 844', width: 390, height: 844 },
  { label: '작은 화면 · 360 × 740', width: 360, height: 740 },
  { label: '큰 화면 · 430 × 932', width: 430, height: 932 },
];
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 0, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});
const routeFromHash = (): RootRoute =>
  screens.find(screen => `#${screen.route}` === window.location.hash)?.route ??
  'Login';

const parameters = new URLSearchParams(window.location.search);
const embedded = parameters.has('frame');
const providerStyle = { flex: 1, minHeight: 0 };
const initialScenario = parameters.get('scenario');
if (embedded && (initialScenario === 'slow' || initialScenario === 'error')) {
  setPreviewScenario(initialScenario);
}

function Preview() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [route, setRoute] = useState<RootRoute>(routeFromHash);
  const [sizeIndex, setSizeIndex] = useState(0);
  const [zoom, setZoom] = useState(85);
  const [revision, setRevision] = useState(0);
  const [scenario, setScenario] = useState<PreviewScenario>('success');
  const screen = screens.find(item => item.route === route)!;
  const size = sizes[sizeIndex]!;
  useEffect(() => {
    const update = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  useEffect(() => {
    if (embedded) return;
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frameRef.current?.contentWindow
      )
        return;
      if (
        event.data?.type !== 'heapy-preview-route' ||
        !screens.some(item => item.route === event.data.route)
      )
        return;
      setRoute(event.data.route);
      window.history.replaceState(null, '', `#${event.data.route}`);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  const select = (next: RootRoute) => {
    window.location.hash = next;
    setRoute(next);
    if (embedded)
      window.parent.postMessage(
        { type: 'heapy-preview-route', route: next },
        window.location.origin,
      );
  };
  const navigation = {
    replace: select,
    navigate: select,
    goBack: () => {
      const previous = previousOnboardingRoute(route);
      if (previous) select(previous);
    },
    reset: (state: { index: number; routes: Array<{ name: RootRoute }> }) =>
      select(state.routes[state.index]!.name),
  };
  // 작성자: 김진우 — 현재 화면들이 사용하는 이동 메서드만 브라우저 미리보기에 연결한다.
  const Screen = screen.component as unknown as ComponentType<{
    navigation: typeof navigation;
  }>;
  const reset = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    resetPreviewData();
    resetConnectionPreview();
    await tokenStorage.clear();
    setRevision(value => value + 1);
  };
  const changeScenario = async (value: PreviewScenario) => {
    setScenario(value);
    setPreviewScenario(value);
    await reset();
  };
  if (embedded) {
    return (
      <div className="device-root">
        <SafeAreaProvider
          style={providerStyle}
          initialMetrics={{
            frame: {
              x: 0,
              y: 0,
              width: window.innerWidth,
              height: window.innerHeight,
            },
            insets: { top: 0, bottom: 0, left: 0, right: 0 },
          }}
        >
          <QueryClientProvider client={queryClient}>
            <OnboardingShell route={route} onBack={navigation.goBack}>
              <Screen key={route} navigation={navigation} />
            </OnboardingShell>
          </QueryClientProvider>
        </SafeAreaProvider>
      </div>
    );
  }
  if (new URLSearchParams(window.location.search).has('terms')) {
    return (
      <article className="terms-preview">
        <h1>미리보기용 약관</h1>
        <p>
          약관 상세 화면 이동을 확인하기 위한 예시입니다. 실제 약관이 아니며
          동의 내역은 서버에 저장되지 않습니다.
        </p>
      </article>
    );
  }
  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">♥</span> HEAPY{' '}
          <span className="badge">개발</span>
        </div>
        <h1>화면 개발실</h1>
        <p className="intro">
          화면을 고르고, 코드를 수정하고,
          <br />
          변화를 바로 확인하세요.
        </p>
        <nav aria-label="미리보기 화면">
          {screens.map((item, order) => (
            <button
              key={item.route}
              className={
                route === item.route ? 'screen-link active' : 'screen-link'
              }
              aria-current={route === item.route ? 'page' : undefined}
              onClick={() => select(item.route)}
            >
              <span className="screen-number">
                {String(order + 1).padStart(2, '0')}
              </span>
              {item.label}
              <span className="screen-arrow">›</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="live-dot" /> 저장하면 자동 반영
          <p>앱에서 사용하는 화면과 스타일을 그대로 불러옵니다.</p>
        </div>
      </aside>
      <main className="main">
        <header className="toolbar">
          <div>
            <span className="eyebrow">로그인 → 온보딩 → 홈</span>
            <h2>{screen.label}</h2>
          </div>
          <div className="controls">
            <label>
              화면 크기
              <select
                value={sizeIndex}
                onChange={event => setSizeIndex(Number(event.target.value))}
              >
                {sizes.map((item, order) => (
                  <option key={item.width} value={order}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              배율
              <select
                value={zoom}
                onChange={event => setZoom(Number(event.target.value))}
              >
                {[65, 75, 85, 100].map(value => (
                  <option key={value} value={value}>
                    {value}%
                  </option>
                ))}
              </select>
            </label>
            <button className="reset" onClick={() => reset()}>
              화면 초기화
            </button>
          </div>
        </header>
        <section className="stage" aria-label="앱 미리보기">
          <div
            className="phone-scale"
            style={{
              width: ((size.width + 16) * zoom) / 100,
              height: ((size.height + 16) * zoom) / 100,
            }}
          >
            <div
              className="phone-wrap"
              style={{ transform: `scale(${zoom / 100})` }}
            >
              <div
                className="phone"
                style={{ width: size.width, height: size.height }}
              >
                <div className="status-bar" aria-hidden="true">
                  <span>9:41</span>
                  <span>● ▰</span>
                </div>
                <div className="app-screen">
                  <iframe
                    ref={frameRef}
                    title="HEAPY 앱 화면"
                    className="device-frame"
                    src={`/?frame=1&scenario=${scenario}&reset=${revision}#${route}`}
                  />
                </div>
                <div className="home-indicator" aria-hidden="true">
                  <span />
                </div>
              </div>
            </div>
          </div>
          <aside className="inspector">
            <h3>화면 확인</h3>
            <p>
              좌측 메뉴로 바로 이동하거나 앱 안의 버튼으로 순서대로 진행하세요.
            </p>
            <label className="scenario-label">
              응답 상태
              <select
                value={scenario}
                onChange={event =>
                  changeScenario(event.target.value as PreviewScenario)
                }
              >
                <option value="success">정상 응답</option>
                <option value="slow">느린 응답 · 3초</option>
                <option value="error">오류 응답</option>
              </select>
            </label>
            <div className="divider" />
            <h3>수정할 파일</h3>
            <code>{screen.file}</code>
            <p>공통 색상과 간격</p>
            <code>src/shared/theme/tokens.ts</code>
            <p>공통 입력·버튼·레이아웃</p>
            <code>src/shared/components/</code>
            <div className="divider" />
            <h3>테스트 입력</h3>
            <p>
              이메일: preview@example.com
              <br />
              비밀번호: 8자 이상 아무 값<br />
              생년월일: 달력에서 선택
            </p>
            <p className="muted">
              예시 데이터로 동작합니다. 새로고침하면 입력한 데이터가
              초기화됩니다.
            </p>
          </aside>
        </section>
        <footer className="footnote">
          브라우저 미리보기 · 글꼴, 키보드, 안전 영역은 실기기에서 최종
          확인하세요.
        </footer>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Preview />);
