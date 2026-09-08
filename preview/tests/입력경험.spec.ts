import { test, expect } from '@playwright/test';

test('키보드처럼 뷰포트가 줄어들면 포커스된 입력칸을 보이는 영역으로 스크롤한다', async ({
  page,
}) => {
  for (const [route, label] of [
    ['Login', '비밀번호'],
    ['Signup', '비밀번호 확인'],
    ['HealthBackground', '건강 주의사항 (선택)'],
  ]) {
    await page.goto(`/#${route}`);
    const frame = page.frameLocator('iframe');
    const input = frame.getByLabel(label!, { exact: true });
    await input.fill('입력 확인');
    await page.locator('iframe').evaluate(node => {
      node.style.height = '380px';
    });
    await expect
      .poll(async () => {
        const field = (await input.boundingBox())!;
        const viewport = (await page.locator('iframe').boundingBox())!;
        return (
          field.y >= viewport.y &&
          field.y + field.height <= viewport.y + viewport.height
        );
      })
      .toBe(true);
  }
});

test('회원가입에서 비밀번호 확인 후 이메일 인증을 안내한다', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#Login');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: '처음이신가요? 회원가입' }).click();
  await expect(page).toHaveURL(/#Signup$/);
  await frame.getByLabel('이메일', { exact: true }).fill('Preview@example.com');
  await frame.getByLabel('비밀번호', { exact: true }).fill('preview123');
  await frame.getByLabel('비밀번호 확인', { exact: true }).fill('different123');
  await frame.getByRole('button', { name: '회원가입', exact: true }).click();
  await expect(frame.getByText('비밀번호가 일치하지 않습니다.')).toBeVisible();
  await frame.getByLabel('비밀번호 확인', { exact: true }).fill('preview123');
  await frame.getByRole('button', { name: '회원가입', exact: true }).click();
  await expect(frame.getByText('이메일을 확인해 주세요')).toBeVisible();
  await expect(
    frame.getByText('preview@example.com', { exact: true }),
  ).toBeVisible();
  await expect(
    frame.getByRole('button', { name: /인증 메일 재발송/ }),
  ).toBeDisabled();
  await frame.getByRole('button', { name: '인증 후 로그인하기' }).click();
  await expect(page).toHaveURL(/#Login$/);
  expect(errors).toEqual([]);
});

test('좁은 화면에서도 음주 네 개와 질환 다섯 개가 각각 한 행에 들어가고 글자가 잘리지 않는다', async ({
  page,
}) => {
  await page.goto('/#Lifestyle');
  await page.getByLabel('화면 크기').selectOption('1');
  for (const route of ['Lifestyle', 'HealthBackground']) {
    await page.goto(`/#${route}`);
    await page.getByLabel('화면 크기').selectOption('1');
    const frame = page.frameLocator('iframe');
    const labels =
      route === 'Lifestyle'
        ? [
            '비흡연',
            '과거 흡연',
            '현재 흡연',
            '안 마심',
            '월 1~2회',
            '주 1~2회',
            '주 3회+',
          ]
        : ['없음', '고혈압', '당뇨', '고지혈증', '기타'];
    const rows = new Set<number>();
    for (const label of labels) {
      const choice = frame.getByRole('button', { name: label, exact: true });
      await expect(choice).toBeVisible();
      const rect = (await choice.boundingBox())!;
      rows.add(Math.round(rect.y));
      const textMetrics = await choice.locator('div').evaluate(node => ({
        height: node.getBoundingClientRect().height,
        scroll: node.scrollWidth,
        client: node.clientWidth,
      }));
      expect(textMetrics.height).toBeLessThan(25);
      expect(textMetrics.scroll).toBeLessThanOrEqual(textMetrics.client + 1);
    }
    expect(rows.size).toBe(route === 'Lifestyle' ? 2 : 1);
    const rowLabels = route === 'Lifestyle' ? labels.slice(3) : labels;
    const choiceRows = await Promise.all(
      rowLabels.map(async label =>
        Math.round(
          (await frame
            .getByRole('button', { name: label, exact: true })
            .boundingBox())!.y,
        ),
      ),
    );
    expect(new Set(choiceRows).size).toBe(1);
    await page.screenshot({
      path: `artifacts/preview-${route}.png`,
      fullPage: true,
    });
  }
});

test('생년월일은 키보드 입력 없이 달력으로 선택하고 취소하면 유지된다', async ({
  page,
}) => {
  await page.goto('/#BasicProfile');
  const frame = page.frameLocator('iframe');
  await frame
    .getByRole('button', { name: '생년월일 선택', exact: true })
    .click();
  await frame.getByRole('button', { name: '연도 선택' }).click();
  await frame.getByRole('button', { name: '2000년', exact: true }).click();
  await frame.getByRole('button', { name: '2월', exact: true }).click();
  await frame
    .getByRole('button', { name: '2000년 2월 29일', exact: true })
    .click();
  await expect(
    frame.getByText('2000년 02월 29일', { exact: true }),
  ).toBeVisible();
  await frame
    .getByRole('button', { name: '생년월일 선택', exact: true })
    .click();
  await page.screenshot({
    path: 'artifacts/preview-calendar.png',
    animations: 'disabled',
    fullPage: true,
  });
  await frame.getByRole('button', { name: '다음 달' }).click();
  await frame.getByRole('button', { name: '달력 닫기' }).click();
  await expect(
    frame.getByText('2000년 02월 29일', { exact: true }),
  ).toBeVisible();
});
