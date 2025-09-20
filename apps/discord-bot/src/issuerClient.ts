import type { RequestInit } from 'undici';

export interface IssueLicenseInput {
  hwid: string;
  ttlSeconds: number;
  plan?: string | null;
  note?: string | null;
}

export interface IssueLicenseResponse {
  token: string;
  jti: string;
  exp: number;
}

export interface LicenseStatusResponse {
  revoked: boolean;
}

export interface LicenseListItem {
  jti: string;
  hwid: string;
  plan: string | null;
  note: string | null;
  issuedAt: number;
  exp: number;
  issuerIp: string | null;
  revoked: boolean;
  revokedAt: number | null;
  revokedBy: string | null;
}

export class IssuerClient {
  private readonly baseUrl: URL;
  private readonly authHeader: string;

  constructor(baseUrl: string, username: string, password: string) {
    this.baseUrl = new URL(baseUrl);
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
  }

  private buildUrl(path: string, search?: Record<string, string | number | undefined>) {
    const url = new URL(path, this.baseUrl);
    if (search) {
      const params = new URLSearchParams();
      Object.entries(search).forEach(([key, value]) => {
        if (value !== undefined) {
          params.set(key, String(value));
        }
      });
      url.search = params.toString();
    }
    return url;
  }

  private async request<T>(path: string | URL, init: RequestInit): Promise<T> {
    const url = typeof path === 'string' ? this.buildUrl(path) : path;
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      let errorBody: any;
      try {
        errorBody = await response.json();
      } catch (error) {
        errorBody = { error: response.statusText };
      }

      const message =
        errorBody?.error || errorBody?.reason || `Issuer responded with ${response.status}`;
      throw new Error(message);
    }

    return (await response.json()) as T;
  }

  async issueLicense(input: IssueLicenseInput): Promise<IssueLicenseResponse> {
    return this.request<IssueLicenseResponse>('/issue', {
      method: 'POST',
      body: JSON.stringify(input),
      headers: {
        Authorization: this.authHeader,
      },
    });
  }

  async revokeLicense(jti: string): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>('/revoke', {
      method: 'POST',
      body: JSON.stringify({ jti }),
      headers: {
        Authorization: this.authHeader,
      },
    });
  }

  async getStatus(jti: string): Promise<LicenseStatusResponse> {
    return this.request<LicenseStatusResponse>(`/status/${encodeURIComponent(jti)}`, {
      method: 'GET',
    });
  }

  async listLicenses(limit: number): Promise<LicenseListItem[]> {
    const items = await this.request<{ items: LicenseListItem[] }>(
      this.buildUrl('/licenses', { limit }),
      {
        method: 'GET',
        headers: {
          Authorization: this.authHeader,
        },
      },
    );
    return items.items;
  }
}
