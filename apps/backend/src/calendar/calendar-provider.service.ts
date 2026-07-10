import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

export type CalendarProviderMode = 'mock' | 'google';

@Injectable()
export class CalendarProviderService {
  constructor(private readonly config: ConfigService) {}

  getMode(): CalendarProviderMode {
    const provider = this.config.get<string>('CALENDAR_PROVIDER', 'mock');
    return provider === 'google' ? 'google' : 'mock';
  }

  buildOAuthStartUrl(state: string): { authUrl: string; mock: boolean } {
    if (this.getMode() === 'mock') {
      const baseUrl = this.getApiBaseUrl();
      return {
        authUrl: `${baseUrl}/calendar/oauth/callback?code=mock&state=${encodeURIComponent(state)}`,
        mock: true,
      };
    }

    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI');
    if (!clientId || !redirectUri) {
      throw new Error('GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI are required when CALENDAR_PROVIDER=google');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.events',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return {
      authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      mock: false,
    };
  }

  async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date | null;
  }> {
    if (this.getMode() === 'mock' || code === 'mock') {
      return {
        accessToken: `mock-access-${randomUUID()}`,
        refreshToken: `mock-refresh-${randomUUID()}`,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      };
    }

    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI');
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Google OAuth is not configured');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Google token exchange failed: ${text}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : null,
    };
  }

  async createCalendarEvent(input: {
    accessToken: string;
    calendarId: string;
    title: string;
    start: string;
    end: string;
    description?: string;
  }): Promise<string> {
    if (this.getMode() === 'mock' || input.accessToken.startsWith('mock-access-')) {
      return `mock-event-${randomUUID()}`;
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: input.title,
          description: input.description,
          start: { dateTime: input.start, timeZone: 'UTC' },
          end: { dateTime: input.end, timeZone: 'UTC' },
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Google Calendar event insert failed: ${text}`);
    }

    const data = (await response.json()) as { id: string };
    return data.id;
  }

  private getApiBaseUrl(): string {
    return (this.config.get<string>('API_BASE_URL') ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
  }
}
