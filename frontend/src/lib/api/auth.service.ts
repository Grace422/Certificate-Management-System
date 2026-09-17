import { api, unwrap, tokenStore, primeCsrfToken } from './client';
import { ENDPOINTS } from './endpoints';
import { config } from '@/lib/config';
import type { AuthSession, LoginResult, MfaSetupInfo, User } from '@/lib/types';

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  dateOfBirth: string;
  placeOfBirth: string;
  nationalId?: string;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<{ message: string }> {
    await primeCsrfToken();
    const { data } = await api.post(ENDPOINTS.auth.register, payload);
    return unwrap(data);
  },

  /** Step 1. Returns either a session or an MFA challenge. */
  async login(email: string, password: string): Promise<LoginResult> {
    await primeCsrfToken();
    const { data } = await api.post(ENDPOINTS.auth.login, { email, password });
    const result = unwrap<LoginResult>(data);
    if (!result.mfaRequired && result.accessToken && config.authMode === 'bearer') {
      tokenStore.set(result.accessToken);
    }
    return result;
  },

  /** Step 2. `mfaToken` comes from login(); `code` is the 6-digit OTP. */
  async verifyMfa(mfaToken: string, code: string): Promise<AuthSession> {
    const { data } = await api.post(ENDPOINTS.auth.verifyMfa, { mfaToken, code });
    const session = unwrap<AuthSession>(data);
    if (session.accessToken && config.authMode === 'bearer') {
      tokenStore.set(session.accessToken);
    }
    return session;
  },

  async resendOtp(mfaToken: string): Promise<void> {
    await api.post(ENDPOINTS.auth.resendOtp, { mfaToken });
  },

  /** Begin authenticator-app enrolment. */
  async setupMfa(): Promise<MfaSetupInfo> {
    const { data } = await api.post(ENDPOINTS.auth.mfaSetup, {});
    return unwrap(data);
  },

  async enableMfa(code: string): Promise<{ recoveryCodes?: string[] }> {
    const { data } = await api.post(ENDPOINTS.auth.mfaEnable, { code });
    return unwrap(data);
  },

  async disableMfa(password: string, code: string): Promise<void> {
    await api.post(ENDPOINTS.auth.mfaDisable, { password, code });
  },

  /** Restore the session on page load (cookie mode) or after refresh. */
  async me(): Promise<User> {
    const { data } = await api.get(ENDPOINTS.auth.me);
    const payload = unwrap<User | { user: User }>(data);
    return 'user' in (payload as { user?: User }) ? (payload as { user: User }).user : (payload as User);
  },

  async logout(): Promise<void> {
    try {
      await api.post(ENDPOINTS.auth.logout, {});
    } finally {
      tokenStore.clear();
    }
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post(ENDPOINTS.auth.forgotPassword, { email });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await api.post(ENDPOINTS.auth.resetPassword, { token, password });
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post(ENDPOINTS.auth.changePassword, { currentPassword, newPassword });
  },
};
