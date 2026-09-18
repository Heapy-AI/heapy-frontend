export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Terms: undefined;
  BasicProfile: undefined;
  BodyProfile: undefined;
  Lifestyle: undefined;
  HealthBackground: undefined;
  ProfileComplete: undefined;
  DataConnection: { from?: 'my' } | undefined;
  CheckupRegistration: { from?: 'my' } | undefined;
  CheckupDetail: { recordId: string };
  CheckupHistory: undefined;
  MedicationManagement:
    | {
        tab?: 'medications' | 'schedule';
        notificationId?: string;
        intakeId?: string;
        scheduledAt?: string;
      }
    | undefined;
  MedicationRegistration: { medicationId?: string } | undefined;
  ProfileEdit: undefined;
  AccountWithdrawal: undefined;
  Notifications: undefined;
  Home: undefined;
};
export type RootRoute = keyof RootStackParamList;
