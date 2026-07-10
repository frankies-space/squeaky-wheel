import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as
  | { apiUrl?: string; authToken?: string }
  | undefined;

export const config = {
  apiUrl:
    process.env.EXPO_PUBLIC_API_URL ??
    extra?.apiUrl ??
    'http://localhost:3000',
  authToken:
    process.env.EXPO_PUBLIC_AUTH_TOKEN ?? extra?.authToken ?? 'dev',
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${config.apiUrl.replace(/\/$/, '')}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.authToken}`,
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof (data as { message: unknown }).message === 'string'
        ? (data as { message: string }).message
        : `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return data as T;
}
