import * as Keychain from 'react-native-keychain';
import { Tokens } from '../types/api';

const SERVICE = 'com.heapy.app.auth';

export const tokenStorage = {
  async get(): Promise<Tokens | null> {
    const value = await Keychain.getGenericPassword({ service: SERVICE });
    if (!value) return null;
    try {
      return JSON.parse(value.password) as Tokens;
    } catch {
      await this.clear();
      return null;
    }
  },
  async save(tokens: Tokens): Promise<void> {
    await Keychain.setGenericPassword('heapy-session', JSON.stringify(tokens), {
      service: SERVICE,
      storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    });
  },
  async clear(): Promise<void> {
    await Keychain.resetGenericPassword({ service: SERVICE });
  },
};
