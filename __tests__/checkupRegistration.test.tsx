import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { CheckupRegistrationScreen } from '../src/features/dataConnection/CheckupRegistrationScreen';
import { CheckupFileSelection } from '../src/features/dataConnection/CheckupFileSelection';
import { CheckupGeneralResults } from '../src/features/dataConnection/CheckupGeneralResults';
import { PrimaryButton } from '../src/shared/components/PrimaryButton';
import { dataConnectionApi } from '../src/features/dataConnection/dataConnectionApi';
import { pickCheckupFile } from '../src/features/dataConnection/pickCheckupFile';
import { checkupV2Sample } from '../preview/checkupV2Sample';

jest.mock('../src/features/dataConnection/dataConnectionApi', () => ({
  dataConnectionApi: {
    uploadCheckup: jest.fn(),
    getJob: jest.fn(),
    confirm: jest.fn(),
    cancelJob: jest.fn(),
  },
}));
jest.mock('../src/features/dataConnection/pickCheckupFile', () => ({
  pickCheckupFile: jest.fn(),
}));
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    setQueryData: jest.fn(),
    invalidateQueries: jest.fn(),
  }),
}));
jest.mock('../src/features/dataConnection/ConnectionLayout', () => ({
  connectionStyles: {},
  ConnectionLayout: ({
    children,
    footer,
  }: {
    children: React.ReactNode;
    footer: React.ReactNode;
  }) => (
    <>
      {children}
      {footer}
    </>
  ),
}));
jest.mock('../src/shared/components/PrimaryButton', () => ({
  PrimaryButton: () => null,
}));
jest.mock('../src/shared/components/FormField', () => ({
  FormField: () => null,
}));
jest.mock('../src/features/dataConnection/CheckupGeneralResults', () => ({
  CheckupGeneralResults: () => null,
}));
jest.mock('../src/features/dataConnection/CheckupFileSelection', () => ({
  CheckupFileSelection: () => null,
}));

let screen: ReactTestRenderer;
const button = (label: string) =>
  screen.root
    .findAllByType(PrimaryButton)
    .find(node => node.props.label === label)!;
const contains = (text: string) =>
  JSON.stringify(screen.toJSON()).includes(text);
const mock = (fn: unknown) => fn as jest.Mock;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mock(dataConnectionApi.cancelJob).mockResolvedValue(undefined);
  mock(pickCheckupFile).mockResolvedValue({
    uri: 'file://synthetic.pdf',
    name: '합성.pdf',
    type: 'application/pdf',
    size: 10,
    inputType: 'pdf',
  });
  const job = {
    jobId: 'synthetic-job',
    status: 'pending',
    expiresAt: new Date(Date.now() + 600000).toISOString(),
  };
  mock(dataConnectionApi.uploadCheckup).mockResolvedValue(job);
  mock(dataConnectionApi.getJob).mockResolvedValue({
    ...job,
    status: 'completed',
    result: {
      measuredAt: '2026-01-02',
      providerName: null,
      items: [
        {
          fieldKey: 'sample',
          itemCode: 'SAMPLE_BP',
          itemName: '혈압',
          value: '123',
          unit: 'mmHg',
          status: null,
        },
      ],
    },
  });
  mock(dataConnectionApi.confirm).mockResolvedValue({
    recordId: 'synthetic-record',
  });
});

afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
  jest.useRealTimers();
});

async function enterReview() {
  const props = {
    navigation: { replace: jest.fn(), goBack: jest.fn() },
    route: { key: 'synthetic', name: 'CheckupRegistration' },
  } as unknown as React.ComponentProps<typeof CheckupRegistrationScreen>;
  await act(async () => {
    screen = create(<CheckupRegistrationScreen {...props} />);
  });
  await act(async () => {
    await screen.root.findByType(CheckupFileSelection).props.onChoose('pdf');
  });
  await act(async () => {
    await button('인식 시작하기').props.onPress();
  });
}

test('연속 확정은 한 번만 보내고 실패 후 같은 키로 입력을 재전송한다', async () => {
  await enterReview();
  await act(async () =>
    screen.root
      .findByType(CheckupGeneralResults)
      .props.onChange('sample', 'value', '121'),
  );
  let reject: (reason: Error) => void = () => {};
  mock(dataConnectionApi.confirm).mockImplementationOnce(
    () =>
      new Promise((_, fail) => {
        reject = fail;
      }),
  );
  const save = button('확인한 결과 저장하기').props.onPress;
  let request: Promise<void>;
  await act(async () => {
    request = save();
    await save();
  });
  expect(dataConnectionApi.confirm).toHaveBeenCalledTimes(1);
  await act(async () => {
    reject(new Error('합성 네트워크 실패'));
    await request;
  });
  expect(
    screen.root.findByType(CheckupGeneralResults).props.items[0].value,
  ).toBe('121');
  await act(async () => {
    await button('확인한 결과 저장하기').props.onPress();
  });
  const calls = mock(dataConnectionApi.confirm).mock.calls;
  expect(calls[0]).toEqual(calls[1]);
  expect(screen.root.findAllByType(CheckupGeneralResults)).toHaveLength(0);
  expect(button('데이터 연결로 돌아가기')).toBeDefined();
  expect(dataConnectionApi.cancelJob).not.toHaveBeenCalled();
});

test('600초가 지나면 검수 입력을 제거하고 정리 API를 호출한다', async () => {
  await enterReview();
  await act(async () => {
    jest.advanceTimersByTime(600001);
  });
  expect(screen.root.findAllByType(CheckupGeneralResults)).toHaveLength(0);
  expect(contains('검수 시간이 만료')).toBe(true);
  expect(dataConnectionApi.cancelJob).toHaveBeenCalledWith('synthetic-job');
  expect(dataConnectionApi.confirm).not.toHaveBeenCalled();
});

test('확정 중 서버가 만료를 응답하면 입력을 제거한다', async () => {
  await enterReview();
  mock(dataConnectionApi.confirm).mockRejectedValueOnce({ status: 410 });
  await act(async () => {
    await button('확인한 결과 저장하기').props.onPress();
  });
  expect(screen.root.findAllByType(CheckupGeneralResults)).toHaveLength(0);
  expect(button('파일 다시 등록하기')).toBeDefined();
});

test('검수 화면 이탈 시 미확정 작업을 한 번 정리한다', async () => {
  await enterReview();
  await act(async () => {
    screen.unmount();
  });
  expect(dataConnectionApi.cancelJob).toHaveBeenCalledTimes(1);
  expect(dataConnectionApi.cancelJob).toHaveBeenCalledWith('synthetic-job');
});

test('확정 응답 대기 중 만료되어도 임시 입력을 지우고 늦은 응답으로 검수를 되살리지 않는다', async () => {
  await enterReview();
  let finish: (value: { recordId: string }) => void = () => {};
  mock(dataConnectionApi.confirm).mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  );
  let request: Promise<void>;
  await act(async () => {
    request = button('확인한 결과 저장하기').props.onPress();
  });
  await act(async () => {
    jest.advanceTimersByTime(600001);
  });
  expect(screen.root.findAllByType(CheckupGeneralResults)).toHaveLength(0);
  await act(async () => {
    finish({ recordId: 'late-record' });
    await request;
  });
  expect(button('저장한 결과 상세 보기')).toBeUndefined();
  expect(contains('검수 시간이 만료')).toBe(true);
});

test('버전 2 확정 수량이 요청과 다르면 전체 성공으로 표시하지 않는다', async () => {
  mock(dataConnectionApi.getJob).mockResolvedValueOnce({
    status: 'completed',
    result: checkupV2Sample(),
  });
  await enterReview();
  mock(dataConnectionApi.confirm).mockResolvedValueOnce({
    recordId: 'partial-record',
    resultCount: 2,
    findingCount: 0,
    overallOpinionCount: 0,
  });
  await act(async () => {
    await button('확인한 결과 저장하기').props.onPress();
  });
  expect(button('저장한 결과 상세 보기')).toBeUndefined();
  expect(contains('전체 저장 여부')).toBe(true);
});

test('서버가 빈 결과를 주면 확정 화면을 노출하지 않는다', async () => {
  mock(dataConnectionApi.getJob).mockResolvedValueOnce({
    status: 'completed',
    result: { measuredAt: null, providerName: null, items: [] },
  });
  await enterReview();
  expect(button('확인한 결과 저장하기')).toBeUndefined();
  expect(contains('인식한 검진 항목이 없어요')).toBe(true);
});

test('확정 응답에 기록 식별자가 없으면 전체 성공으로 표시하지 않는다', async () => {
  await enterReview();
  mock(dataConnectionApi.confirm).mockResolvedValueOnce({});
  await act(async () => {
    await button('확인한 결과 저장하기').props.onPress();
  });
  expect(screen.root.findAllByType(CheckupGeneralResults)).toHaveLength(1);
  expect(button('데이터 연결로 돌아가기')).toBeUndefined();
  expect(contains('저장 결과를 확인할 수 없어요')).toBe(true);
});
