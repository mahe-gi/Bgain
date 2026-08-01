import * as Keychain from 'react-native-keychain';

const KEYCHAIN_SERVICE = 'com.securestoragemobile.auth';

let inMemoryToken: string | null = null;

export const setMemoryAccessToken = (token: string | null): void => {
  inMemoryToken = token;
};

export const getMemoryAccessToken = (): string | null => {
  return inMemoryToken;
};

export const saveAccessToken = async (token: string): Promise<void> => {
  setMemoryAccessToken(token);
  try {
    await Keychain.setGenericPassword('auth_token', token, {
      service: KEYCHAIN_SERVICE,
    });
  } catch {
    throw new Error('Failed to save secure session credentials');
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (inMemoryToken) {
    return inMemoryToken;
  }
  try {
    const credentials = await Keychain.getGenericPassword({
      service: KEYCHAIN_SERVICE,
    });
    if (credentials && credentials.password) {
      setMemoryAccessToken(credentials.password);
      return credentials.password;
    }
    return null;
  } catch {
    return null;
  }
};

export const clearAccessToken = async (): Promise<void> => {
  setMemoryAccessToken(null);
  try {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
  } catch {
    // Ignore clear failure
  }
};
