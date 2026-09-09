// ============================================================================
// NexoraERP & EKA — API Service Adapter
// Hybrid Connectivity: Live FastAPI (http://localhost:8000) with Graceful Local Fallback
// ============================================================================

export interface HealthStatus {
  online: boolean;
  status: string;
  latencyMs?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface RAGCitation {
  chunk_id: string;
  source: string;
  filename: string;
  text_snippet: string;
  score: number;
  rerank_score?: number;
}

export interface RAGResponse {
  answer: string;
  citations: RAGCitation[];
  abstained: boolean;
  confidence_score?: number;
  status?: string;
  case_id?: string;
  department_name?: string;
  isLiveBackend?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiService {
  private token: string | null = null;
  private isBackendHealthy: boolean = false;

  constructor() {
    this.token = localStorage.getItem('eka_access_token');
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('eka_access_token', token);
    } else {
      localStorage.removeItem('eka_access_token');
    }
  }

  public getToken(): string | null {
    return this.token || localStorage.getItem('eka_access_token');
  }

  // 1. Healthcheck
  public async checkHealth(): Promise<HealthStatus> {
    const start = performance.now();
    try {
      const res = await fetch(`${API_BASE_URL}/healthz`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const data = await res.json();
        const latencyMs = Math.round(performance.now() - start);
        this.isBackendHealthy = true;
        return { online: true, status: data.status || 'ok', latencyMs };
      }
      this.isBackendHealthy = false;
      return { online: false, status: 'error' };
    } catch {
      this.isBackendHealthy = false;
      return { online: false, status: 'offline' };
    }
  }

  // 2. Authentication
  public async login(
    email: string = 'admin@company.com',
    password: string = 'changeme123',
    tenantSlug: string = 'default'
  ): Promise<AuthTokens | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          tenant_slug: tenantSlug,
        }),
        signal: AbortSignal.timeout(4000),
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      const tokens: AuthTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in,
      };

      this.setToken(tokens.accessToken);
      return tokens;
    } catch (err) {
      console.warn('[ApiService] Live login failed or backend unreachable, falling back to local auth mode:', err);
      return null;
    }
  }

  // 3. RAG Query (POST /query)
  public async queryRAG(
    question: string,
    options?: {
      useHybrid?: boolean;
      useReranker?: boolean;
      topK?: number;
    }
  ): Promise<RAGResponse | null> {
    const token = this.getToken();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          question,
          top_k: options?.topK || 4,
          use_hybrid: options?.useHybrid ?? true,
          use_reranker: options?.useReranker ?? false,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      return {
        answer: data.answer,
        citations: data.citations || [],
        abstained: data.abstained || false,
        confidence_score: data.confidence_score,
        status: data.status,
        case_id: data.case_id,
        department_name: data.department_name,
        isLiveBackend: true,
      };
    } catch (err) {
      console.warn('[ApiService] /query fetch failed, utilizing deterministic enterprise fallback:', err);
      return null;
    }
  }

  // 4. RAG Stream (POST /query/stream with Server-Sent Events)
  public async streamRAG(
    question: string,
    onToken: (token: string) => void,
    onDone: (fullAnswer: string) => void,
    onError: (error: any) => void
  ): Promise<boolean> {
    const token = this.getToken();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/query/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          question,
          top_k: 4,
          use_hybrid: true,
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok || !res.body) {
        return false;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulated = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const payloadStr = line.replace('data: ', '').trim();
            if (payloadStr === '[DONE]') {
              onDone(accumulated);
              return true;
            }
            try {
              const payload = JSON.parse(payloadStr);
              if (payload.token) {
                accumulated += payload.token;
                onToken(payload.token);
              }
            } catch {
              // Ignore non-json tokens
            }
          }
        }
      }

      onDone(accumulated);
      return true;
    } catch (err) {
      onError(err);
      return false;
    }
  }
}

export const apiService = new ApiService();
export default apiService;
