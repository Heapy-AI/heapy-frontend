import { test, expect } from '@playwright/test';

test('모든 화면 크기와 배율에서 온보딩 하단 버튼이 화면 아래에 유지된다', async ({
  page,
}) => {
  await page.goto('/#BodyProfile');
  for (const label of [
    '02 기본 정보 ›',
    '03 신체 정보 ›',
    '04 생활 습관 ›',
    '05 건강 배경 ›',
  ]) {
    await page.getByRole('button', { name: label, exact: true }).click();
    for (const size of ['0', '1', '2']) {
      await page.getByLabel('화면 크기').selectOption(size);
      for (const zoom of ['65', '75', '85', '100']) {
        await page.getByLabel('배율').selectOption(zoom);
        const app = page.frameLocator('iframe').locator('.device-root');
        const button = app.getByRole('button').last();
        await expect(button).toBeVisible();
        await expect
          .poll(
            async () => {
              const area = (await app.boundingBox())!;
              const footer = (await button.boundingBox())!;
              return Math.abs(
                area.y +
                  area.height -
                  footer.y -
                  footer.height -
                  (16 * Number(zoom)) / 100,
              );
            },
            { message: `${label}, 크기 ${size}, 배율 ${zoom}: 하단 버튼 위치` },
          )
          .toBeLessThan(2);
      }
    }
  }
});
