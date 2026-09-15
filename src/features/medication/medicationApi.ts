import { apiClient } from '../../shared/api/client';
import { CheckupFile } from '../dataConnection/types';

export type MedicationInput = {
  displayName: string;
  dosageText: string;
  instructions: string | null;
  doseAmount?: number | null;
  doseUnit?: string | null;
  startDate: string;
  endDate: string | null;
  scheduledTimes: string[];
};
export type Medication = Omit<MedicationInput, 'scheduledTimes'> & {
  medicationId: string;
  status: 'active' | 'completed' | 'archived';
  schedules: { scheduleId: string; scheduledTime: string }[];
};
export type Intake = {
  intakeId: string;
  medicationId: string;
  scheduledAt: string;
  displayName: string;
  dosageText: string;
  status: 'pending' | 'taken' | 'skipped' | 'missed';
  actedAt: string | null;
  missedAt: string | null;
};
export type MedicationJob = {
  jobId: string;
  expiresAt: string;
  status: string;
  pollAfterMs: number;
  result: {
    items: {
      itemOrder: number;
      rawName: string | null;
      rawDosage: string | null;
      normalizedName: string | null;
      normalizedDosage: string | null;
      confidence: number | null;
    }[];
  } | null;
};
type Page<T> = { items: T[]; hasNext: boolean; nextCursor: string | null };
const root = '/api/users/medications';
const headers = (key: string) => ({ 'Idempotency-Key': key });

async function pages<T>(
  url: string,
  params: Record<string, string | number>,
  signal: AbortSignal,
): Promise<T[]> {
  const rows: T[] = [];
  let cursor: string | null = null;
  do {
    const page: Page<T> = (
      await apiClient.get<Page<T>>(url, {
        signal,
        params: { ...params, limit: 100, cursor },
      })
    ).data;
    rows.push(...page.items);
    cursor = page.hasNext ? page.nextCursor : null;
  } while (cursor);
  return rows;
}
export const medicationApi = {
  list: (status: string, signal: AbortSignal) =>
    pages<Medication>(root, { status }, signal),
  async detail(id: string, signal: AbortSignal) {
    return (await apiClient.get<Medication>(`${root}/${id}`, { signal })).data;
  },
  async create(body: MedicationInput, key: string) {
    return (
      await apiClient.post<Medication>(root, body, { headers: headers(key) })
    ).data;
  },
  async update(id: string, body: MedicationInput) {
    return (await apiClient.patch<Medication>(`${root}/${id}`, body)).data;
  },
  async archive(id: string) {
    await apiClient.delete(`${root}/${id}`);
  },
  async intakes(date: string, signal: AbortSignal) {
    const items = await pages<Intake>(
      '/api/users/medication-intakes',
      { from: date, to: date },
      signal,
    );
    return items.sort(
      (a, b) =>
        a.scheduledAt.localeCompare(b.scheduledAt) ||
        a.displayName.localeCompare(b.displayName),
    );
  },
  async act(
    id: string,
    action: 'complete' | 'skip',
    key: string,
    source: 'app' | 'push' = 'app',
  ) {
    return (
      await apiClient.post<Intake>(
        `/api/users/medication-intakes/${id}/${action}`,
        { actionSource: source },
        { headers: headers(key) },
      )
    ).data;
  },
  async upload(file: CheckupFile, key: string, signal: AbortSignal) {
    const body = new FormData();
    body.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);
    body.append('inputType', file.inputType);
    return (
      await apiClient.post<MedicationJob>(`${root}/ocr-jobs`, body, {
        headers: { ...headers(key), 'Content-Type': 'multipart/form-data' },
        signal,
        timeout: 60000,
      })
    ).data;
  },
  async job(id: string, signal: AbortSignal) {
    return (
      await apiClient.get<MedicationJob>(`${root}/ocr-jobs/${id}`, {
        signal,
        timeout: 25000,
      })
    ).data;
  },
  async cancel(id: string) {
    await apiClient.delete(`${root}/ocr-jobs/${id}`);
  },
  async confirm(
    id: string,
    medications: (MedicationInput & { itemOrder: number })[],
    key: string,
  ) {
    return (
      await apiClient.post(
        `${root}/ocr-jobs/${id}/confirm`,
        { medications },
        { headers: headers(key), timeout: 45000 },
      )
    ).data;
  },
};
