import { expect, test } from '@playwright/test';

test('다섯 탭의 제목과 선택 상태가 일치한다', async ({ page }) => {
  await page.goto('/?frame=1#Home');
  for (const title of ['홈', '내 건강', '챗봇', '미션', '마이']) {
    await page.getByRole('tab', { name: title, exact: true }).click();
    await expect(
      page.getByRole('tab', { name: title, exact: true }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(
      page.getByRole('heading', { name: title, exact: true }),
    ).toBeVisible();
  }
  await expect(page.getByText('등록된 질환 없음')).toBeVisible();
  await page
    .getByRole('button', { name: '복약 정보 관리', exact: true })
    .click();
  await expect(
    page.getByText('복약 정보 관리 기능은 준비 중이에요.'),
  ).toBeVisible();
  await page.getByRole('button', { name: '로그아웃', exact: true }).click();
  await expect(page).toHaveURL(/#Login$/);
});

test('프로필 오류가 나도 재시도와 로그아웃을 제공한다', async ({ page }) => {
  await page.goto('/?frame=1&scenario=error#Home');
  await page.getByRole('tab', { name: '마이', exact: true }).click();
  await expect(page.getByText('프로필을 불러오지 못했어요.')).toBeVisible();
  await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
  await page.getByRole('button', { name: '로그아웃', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: '미리보기 오류' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/#Home$/);
});

for (const width of [360, 390, 430]) {
  test(`마이 화면 ${width}px에서 하단 탭과 로그아웃이 잘리지 않는다`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?frame=1#Home');
    await page.getByRole('tab', { name: '마이', exact: true }).click();
    await expect(page.getByText('등록된 질환 없음')).toBeVisible();
    await expect(
      page.getByRole('tab', { name: '홈', exact: true }),
    ).toBeInViewport();
    await page.screenshot({
      path: 'artifacts/my-top-' + width + '.png',
      fullPage: true,
    });
    await page
      .getByRole('button', { name: '로그아웃', exact: true })
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByRole('button', { name: '로그아웃', exact: true }),
    ).toBeInViewport();
    await expect(
      page.getByRole('tab', { name: '마이', exact: true }),
    ).toBeInViewport();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `artifacts/my-${width}.png`,
      fullPage: true,
    });
  });
}
