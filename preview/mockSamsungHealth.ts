import { respond } from './mockApi';
export const requestSamsungPermissions = () =>
  respond(() => ({
    deviceInstallationId: 'preview-device',
    grantedDataTypes: ['steps'],
    sdkVersion: 'preview',
    permissionCheckedAt: new Date().toISOString(),
  }));

export const readSamsungTodaySteps = () =>
  respond(() => ({
    date: '2026-09-07',
    steps: 4620,
    hasData: true,
    readAt: new Date().toISOString(),
  }));
