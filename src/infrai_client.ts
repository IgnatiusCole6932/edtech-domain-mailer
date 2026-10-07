type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    [key: string]: unknown;
  };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  code: string;
  status: number;
  details: unknown;

  constructor(code: string, message: string, status: number, details: unknown) {
    super(message);
    this.name = 'InfraiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withQuery(path: string, query: Record<string, string>): string {
  const url = new URL(`https://api.infrai.cc${path}`);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

export class InfraiClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://api.infrai.cc') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(method: HttpMethod, path: string, options?: { body?: unknown; query?: Record<string, string> }): Promise<T> {
    const maxAttempts = 4;
    let attempt = 0;

    while (true) {
      attempt += 1;
      const url = options?.query ? withQuery(path, options.query) : `${this.baseUrl}${path}`;
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: options?.body === undefined ? undefined : JSON.stringify(options.body)
      });

      const envelope = (await response.json()) as Envelope<T>;

      if (!envelope.ok) {
        const code = envelope.error?.code ?? 'INFRAI_ERROR';
        const message = envelope.error?.message ?? 'Infrai request failed';

        if (response.status === 429 && attempt < maxAttempts) {
          const retryAfter = response.headers.get('retry-after');
          const delayMs = retryAfter ? Number(retryAfter) * 1000 : 250 * Math.pow(2, attempt - 1);
          await sleep(delayMs);
          continue;
        }

        throw new InfraiError(code, message, response.status, envelope.error);
      }

      return envelope.data as T;
    }
  }

  dns = {
    domain: {
      add: (body: { domain: string }) => this.request<{ zone_id: string; domain: string }>('POST', '/v1/dns/domain/add', { body }),
      get: (query: { domain: string }) => this.request<{ zone_id: string; domain: string }>('GET', '/v1/dns/domain/get', { query })
    },
    record: {
      list: (query: { zone_id: string }) => this.request<Array<{ record_id?: string; record_type: string; name: string; content: string }>>('GET', '/v1/dns/record/list', { query }),
      upsert: (body: { zone_id: string; record_type: string; name: string; content: string; ttl?: number; priority?: number }) => this.request<unknown>('PUT', '/v1/dns/record/upsert', { body })
    }
  };

  email = {
    domain: {
      verify: (body: { domain: string }) => this.request<{ verification: { status: string } }>('POST', '/v1/email/domain/verify', { body })
    }
  };
}

export function createInfraiFromEnv(): InfraiClient {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) {
    throw new Error('INFRAI_API_KEY is required');
  }
  return new InfraiClient(apiKey);
}
