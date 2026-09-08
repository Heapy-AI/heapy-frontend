import type { dataConnectionApi as liveApi } from '../src/features/dataConnection/dataConnectionApi';
import type {
  HealthConnection,
  OcrJob,
} from '../src/features/dataConnection/types';
import { respond } from './mockApi';
let connections: HealthConnection[] = [];
let polls = 0;
export function resetConnectionPreview() {
  connections = [];
  polls = 0;
}
const job = (): OcrJob => ({
  jobId: 'preview-checkup',
  status: 'pending',
  expiresAt: new Date(Date.now() + 600000).toISOString(),
  pollAfterMs: 1000,
});
export const dataConnectionApi: typeof liveApi = {
  cancelJob: async () => undefined,
  getConnections: () => respond(() => connections),
  connectSamsung: payload =>
    respond(() => {
      const connection = {
        connectionId: 'preview-samsung',
        status: 'connected',
        grantedDataTypes: payload.grantedDataTypes,
        lastSyncedAt: null,
      };
      connections = [connection];
      return connection;
    }),
  uploadCheckup: () =>
    respond(() => {
      polls = 0;
      return job();
    }),
  getJob: () =>
    respond(() => ({
      ...job(),
      status: ++polls < 2 ? 'processing' : 'completed',
      result: {
        measuredAt: '2026-08-12',
        providerName: '미리보기 검진센터',
        items: [
          {
            fieldKey: 'result-1',
            itemCode: 'fasting_glucose',
            itemName: '공복혈당',
            value: '102',
            numericValue: 102,
            unit: 'mg/dL',
            status: '경계',
            confidence: 0.96,
          },
          {
            fieldKey: 'result-2',
            itemCode: 'total_cholesterol',
            itemName: '총콜레스테롤',
            value: '180',
            numericValue: 180,
            unit: 'mg/dL',
            status: '정상',
            confidence: 0.7,
          },
        ],
      },
    })),
  confirm: () => respond(() => ({ recordId: 'preview-record' })),
};
