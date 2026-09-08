import { test, expect } from '@playwright/test';

test('실제 화면으로 로그인부터 홈까지 진행하고 외부 API를 호출하지 않는다', async ({
  page,
}) => {
  const errors: string[] = [];
  const externalRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (
      !request.url().startsWith('http://127.0.0.1:5173/') &&
      !request.url().startsWith('data:')
    )
      externalRequests.push(request.url());
  });
  await page.goto('/');
  const app = page.frameLocator('iframe').locator('.device-root');
  await expect(app.getByText('이메일 로그인')).toBeVisible();
  await expect(app.locator('img').first()).toBeVisible();
  await page.screenshot({
    path: 'artifacts/preview-login.png',
    fullPage: true,
  });
  await app.getByRole('textbox').nth(0).fill('preview@example.com');
  await app.locator('input[type="password"]').fill('preview123');
  await app.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page).toHaveURL(/#BasicProfile$/);
  await app.getByRole('textbox').nth(0).fill('미리보기');
  await app.getByRole('button', { name: '생년월일 선택', exact: true }).click();
  const calendar = page.frameLocator('iframe');
  await calendar.getByRole('button', { name: '연도 선택' }).click();
  await calendar.getByRole('button', { name: '2001년', exact: true }).click();
  await calendar.getByRole('button', { name: '5월', exact: true }).click();
  await calendar
    .getByRole('button', { name: '2001년 5월 18일', exact: true })
    .click();
  await app.getByRole('button', { name: '다음', exact: true }).click();
  await expect(page).toHaveURL(/#BodyProfile$/);
  await app.getByRole('button', { name: '다음', exact: true }).click();
  await expect(page).toHaveURL(/#Lifestyle$/);
  await app.getByRole('button', { name: '다음', exact: true }).click();
  await expect(page).toHaveURL(/#HealthBackground$/);
  await app.getByRole('button', { name: '완료하고 시작하기' }).click();
  await expect(page).toHaveURL(/#ProfileComplete$/);
  await app.getByRole('button', { name: '건강 데이터 연결하기' }).click();
  await expect(page).toHaveURL(/#DataConnection$/);
  await app.getByRole('button', { name: '나중에 하기', exact: true }).click();
  await expect(page).toHaveURL(/#Home$/);
  await expect(
    app.getByRole('heading', { name: '홈', exact: true }),
  ).toBeVisible();
  await app.getByRole('tab', { name: '마이', exact: true }).click();
  await expect(app.getByText('미리보기 님')).toBeVisible();
  await expect(app.getByText('2001.05.18 · 남성')).toBeVisible();
  await expect(app.getByText('170 cm', { exact: true })).toBeVisible();
  await expect(app.getByText('65 kg', { exact: true })).toBeVisible();
  await app.screenshot({ path: 'artifacts/my-profile.png' });
  expect(errors).toEqual([]);
  expect(externalRequests).toEqual([]);
});

test('화면 바로가기와 크기 변경 및 오류·로딩 상태를 확인한다', async ({
  page,
}) => {
  await page.goto('/#BasicProfile');
  const app = page.frameLocator('iframe').locator('.device-root');
  await expect(app.getByText('프로필 설정 1/4')).toBeVisible();
  await page.goto('/#Home');
  await app.getByRole('tab', { name: '마이', exact: true }).click();
  await page.getByLabel('응답 상태').selectOption('error');
  await expect(
    app.getByRole('heading', { name: '홈', exact: true }),
  ).toBeVisible();
  await app.getByRole('tab', { name: '마이', exact: true }).click();
  await expect(app.getByText('프로필을 불러오지 못했어요.')).toBeVisible();
  await page.getByLabel('응답 상태').selectOption('slow');
  await expect(
    app.getByRole('heading', { name: '홈', exact: true }),
  ).toBeVisible();
  await app.getByRole('tab', { name: '마이', exact: true }).click();
  await expect(app.getByText('프로필을 불러오고 있어요.')).toBeVisible();
  await expect(app.getByText('등록된 질환 없음')).toBeVisible({
    timeout: 8000,
  });
  await page.getByLabel('응답 상태').selectOption('success');
  await page.getByRole('button', { name: '03 신체 정보 ›' }).click();
  await expect(page).toHaveURL(/#BodyProfile$/);
  await page.getByLabel('화면 크기').selectOption('1');
  await expect(page.locator('.phone')).toHaveCSS('width', '360px');
  await app.getByRole('textbox').nth(0).fill('200');
  await expect(app.getByText('16.3', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '화면 초기화' }).click();
  await expect(app.getByRole('textbox').nth(0)).toHaveValue('170');
  await page.screenshot({
    path: 'artifacts/preview-onboarding.png',
    fullPage: true,
  });
});
