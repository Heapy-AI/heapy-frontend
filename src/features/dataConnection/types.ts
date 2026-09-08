export type InputType = 'pdf' | 'image' | 'camera';
export type CheckupFile = {
  uri: string;
  name: string;
  type: string;
  size: number;
  inputType: InputType;
};
export type CheckupItem = {
  fieldKey: string;
  itemCode: string | null;
  itemName: string;
  value: string;
  numericValue?: number | null;
  unit: string | null;
  status: string | null;
  confidence?: number | null;
};
export type CheckupResult = {
  measuredAt: string | null;
  providerName: string | null;
  items: CheckupItem[];
};
export type OcrJob = {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  expiresAt: string;
  pollAfterMs?: number;
  errorCode?: string | null;
  result?: CheckupResult;
};
export type ConfirmCheckup = {
  measuredAt: string | null;
  providerName: string | null;
  results: Array<Omit<CheckupItem, 'fieldKey' | 'itemName' | 'confidence'>>;
  corrections: Array<{
    fieldKey: string;
    itemCode: string | null;
    originalValue: string;
    correctedValue: string;
    correctionType: 'value' | 'unit' | 'excluded';
  }>;
};
export type HealthConnection = {
  connectionId: string;
  status: string;
  grantedDataTypes: string[];
  lastSyncedAt: string | null;
};
export type SamsungPermission = {
  deviceInstallationId: string;
  grantedDataTypes: string[];
  sdkVersion: string;
  permissionCheckedAt: string;
};

export type SamsungSteps = {
  date: string;
  steps: number;
  hasData: boolean;
  readAt: string;
};
