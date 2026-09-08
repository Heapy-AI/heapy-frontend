import { test, expect } from '@playwright/test';
import { CommonActions, StackRouter } from '@react-navigation/routers';
import { createSessionNavigationState } from '../../src/navigation/onboardingFlow';

const router = StackRouter({ initialRouteName: 'Login' });
const options = {
  routeNames: [
    'Login',
    'Signup',
    'Terms',
    'BasicProfile',
    'BodyProfile',
    'Lifestyle',
    'HealthBackground',
    'Home',
  ],
  routeParamList: {},
  routeGetIdList: {},
};
const apply = (
  state: ReturnType<typeof router.getInitialState>,
  action: Parameters<typeof router.getStateForAction>[1],
) =>
  router.getRehydratedState(
    router.getStateForAction(state, action, options)!,
    options,
  );

test('네이티브 스택은 로그인 기록을 제거하고 이전 온보딩 단계로 돌아간다', () => {
  let state = router.getRehydratedState(
    {
      stale: true,
      index: 2,
      routes: [{ name: 'Login' }, { name: 'Signup' }, { name: 'Login' }],
    },
    options,
  );
  state = apply(
    state,
    CommonActions.reset(createSessionNavigationState('BasicProfile')),
  );
  state = router.getRehydratedState(state, options);
  for (const name of ['BodyProfile', 'Lifestyle', 'HealthBackground'])
    state = apply(state, CommonActions.navigate(name));
  for (const name of ['Lifestyle', 'BodyProfile', 'BasicProfile']) {
    state = apply(state, CommonActions.goBack());
    expect(state.routes[state.index]!.name).toBe(name);
    expect(
      state.routes.some(
        route => route.name === 'Login' || route.name === 'Signup',
      ),
    ).toBe(false);
  }
  expect(
    router.getStateForAction(state, CommonActions.goBack(), options),
  ).toBeNull();
});

test('중간 단계 재진입과 온보딩 완료 후에도 로그인으로 돌아가지 않는다', () => {
  let state = router.getRehydratedState(
    { stale: true, ...createSessionNavigationState('Lifestyle') },
    options,
  );
  state = apply(state, CommonActions.goBack());
  expect(state.routes[state.index]!.name).toBe('BodyProfile');
  state = apply(
    state,
    CommonActions.reset(createSessionNavigationState('Home')),
  );
  expect(state.routes.map(route => route.name)).toEqual(['Home']);
  expect(
    router.getStateForAction(state, CommonActions.goBack(), options),
  ).toBeNull();
});

test('이전 단계로 돌아가도 저장된 입력이 복원되고 다시 진행할 수 있다', async ({
  page,
}) => {
  await page.goto('/#BodyProfile');
  const frame = page.frameLocator('iframe');
  const input = frame.getByLabel('키 (cm)', { exact: true });
  await expect(input).toHaveValue('170');
  await input.fill('182');
  await frame.getByRole('button', { name: '다음', exact: true }).click();
  await expect(page).toHaveURL(/#Lifestyle$/);
  await frame.getByRole('button', { name: '현재 흡연', exact: true }).click();
  await frame.getByRole('button', { name: '주 1~2회', exact: true }).click();
  await frame.getByRole('button', { name: '다음', exact: true }).click();
  await expect(page).toHaveURL(/#HealthBackground$/);
  await frame.getByRole('button', { name: '이전 단계', exact: true }).click();
  await expect(page).toHaveURL(/#Lifestyle$/);
  await frame.getByRole('button', { name: '이전 단계', exact: true }).click();
  await expect(page).toHaveURL(/#BodyProfile$/);
  await expect(input).toHaveValue('182');
  await input.fill('180');
  await frame.getByRole('button', { name: '다음', exact: true }).click();
  await expect(page).toHaveURL(/#Lifestyle$/);
  await expect(
    frame.getByRole('button', { name: '현재 흡연', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await frame.getByRole('button', { name: '이전 단계', exact: true }).click();
  await expect(page).toHaveURL(/#BodyProfile$/);
  await expect(input).toHaveValue('180');
});

test('로그인 후 약관을 생략하고 첫 단계에서 로그인으로 돌아가지 않는다', async ({
  page,
}) => {
  await page.goto('/#Login');
  const frame = page.frameLocator('iframe');
  await frame.getByLabel('이메일', { exact: true }).fill('preview@example.com');
  await frame.getByLabel('비밀번호', { exact: true }).fill('preview123');
  await frame.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page).toHaveURL(/#BasicProfile$/);
  const readToken = () =>
    frame.locator('body').evaluate(async () => {
      const modulePath = '/mockStorage.ts';
      return (await import(modulePath)).tokenStorage.get();
    });
  const tokens = await readToken();
  expect(tokens).not.toBeNull();
  expect(await readToken()).toEqual(tokens);
  await expect(
    frame.getByRole('button', { name: '이전 단계', exact: true }),
  ).toBeDisabled();
});

test('앞뒤 이동 중 같은 헤더를 유지하고 진행률을 늘리거나 줄인다', async ({
  page,
}) => {
  await page.goto('/#BodyProfile');
  const frame = page.frameLocator('iframe');
  const header = frame.getByTestId('onboarding-header');
  const original = await header.elementHandle();
  const position = await header.boundingBox();
  const progress = frame.getByRole('progressbar');
  const fill = frame.getByTestId('onboarding-progress-fill');
  const ratio = async () =>
    (await fill.boundingBox())!.width / (await progress.boundingBox())!.width;
  await expect.poll(ratio).toBeCloseTo(0.5, 2);
  await frame.getByRole('button', { name: '다음', exact: true }).click();
  await expect(page).toHaveURL(/#Lifestyle$/);
  expect(
    await original!.evaluate(
      node =>
        node === document.querySelector('[data-testid="onboarding-header"]'),
    ),
  ).toBe(true);
  expect(await header.boundingBox()).toEqual(position);
  await expect.poll(ratio).toBeCloseTo(0.75, 2);
  await frame.getByRole('button', { name: '이전 단계', exact: true }).click();
  await expect(page).toHaveURL(/#BodyProfile$/);
  await expect.poll(ratio).toBeCloseTo(0.5, 2);
  expect(await original!.evaluate(node => node.isConnected)).toBe(true);
});
