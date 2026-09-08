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
  Home: undefined;
};
export type RootRoute = keyof RootStackParamList;
