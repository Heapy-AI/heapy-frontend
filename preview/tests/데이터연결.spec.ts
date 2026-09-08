import { expect, test } from '@playwright/test';

test('연결을 건너뛰어 홈으로 이동하고 다시 진입할 수 있다', async ({
  page,
}) => {
  await page.goto('/#DataConnection');
  const app = page.frameLocator('iframe');
  await app.getByRole('button', { name: '나중에 하기', exact: true }).click();
  await expect(page).toHaveURL(/#Home$/);
  await app.getByRole('tab', { name: '마이', exact: true }).click();
  await app.getByRole('button', { name: '삼성헬스 연동', exact: true }).click();
  await expect(page).toHaveURL(/#DataConnection$/);
});

test('파일을 선택하고 인식 결과를 수정한 뒤 저장한다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#CheckupRegistration');
  const app = page.frameLocator('iframe');
  const picker = page.waitForEvent('filechooser');
  await app.getByRole('button', { name: 'PDF 파일 선택', exact: true }).click();
  await (
    await picker
  ).setFiles({
    name: '검진.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 preview fixture'),
  });
  await expect(app.getByText('검진.pdf', { exact: true })).toBeVisible();
  await app.getByRole('button', { name: '인식 시작하기' }).click();
  await expect(app.getByLabel('공복혈당 결과값', { exact: true })).toHaveValue(
    '102',
  );
  await app.getByLabel('공복혈당 결과값', { exact: true }).fill('100');
  await app.getByRole('button', { name: '확인한 결과 저장하기' }).click();
  await expect(
    app.getByRole('button', { name: '데이터 연결로 돌아가기' }),
  ).toBeVisible();
  await app.getByRole('button', { name: '데이터 연결로 돌아가기' }).click();
  await expect(app.getByText('검진 결과 저장 완료')).toBeVisible();
  expect(errors).toEqual([]);
});

test('미리보기 삼성헬스 권한 연결 상태와 완료 화면을 확인한다', async ({
  page,
}) => {
  await page.goto('/#ProfileComplete');
  const app = page.frameLocator('iframe');
  await expect(app.getByText(/프로필 생성이/)).toBeVisible();
  await page.screenshot({
    path: 'artifacts/preview-profile-complete.png',
    fullPage: true,
  });
  await app.getByRole('button', { name: '건강 데이터 연결하기' }).click();
  await app.getByRole('button', { name: '삼성헬스 연결하기' }).click();
  await expect(app.getByText(/읽기 권한 .*개 허용됨/)).toBeVisible();
  await expect(app.getByText('오늘 4,620걸음')).toBeVisible();
  await page.screenshot({
    path: 'artifacts/preview-data-connection.png',
    fullPage: true,
  });
});
