import { API_BASE_URL, API_ROUTES, HTTP_STATUS } from '../constants/api'
import type { RequestOptions, RequestOverrides } from '../types/http.types'
import { tokenStorage } from './tokenStorage'

interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
}

interface SessionExpiredEventDetail {
  message: string
}

export class ApiError extends Error {
  readonly status: number
  readonly details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export class SessionExpiredError extends Error {
  constructor(message = 'Votre session a expire. Veuillez vous reconnecter.') {
    super(message)
    this.name = 'SessionExpiredError'
  }
}

export const SESSION_EXPIRED_EVENT = 'doctor-app:session-expired'

class HttpClient {
  private readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async get<TResponse>(path: string, overrides: RequestOverrides = {}): Promise<TResponse> {
    return this.request<TResponse, never>({
      method: 'GET',
      path,
      ...overrides,
    })
  }

  async post<TResponse, TBody>(
    path: string,
    body: TBody,
    overrides: RequestOverrides = {},
  ): Promise<TResponse> {
    return this.request<TResponse, TBody>({
      method: 'POST',
      path,
      body,
      ...overrides,
    })
  }

  async put<TResponse, TBody>(
    path: string,
    body: TBody,
    overrides: RequestOverrides = {},
  ): Promise<TResponse> {
    return this.request<TResponse, TBody>({
      method: 'PUT',
      path,
      body,
      ...overrides,
    })
  }

  async delete<TResponse>(path: string, overrides: RequestOverrides = {}): Promise<TResponse> {
    return this.request<TResponse, never>({
      method: 'DELETE',
      path,
      ...overrides,
    })
  }

  async request<TResponse, TBody>(options: RequestOptions<TBody>): Promise<TResponse> {
    if (options.requiresAuth && options.retryOnUnauthorized !== false) {
      await this.ensureAccessTokenOrThrow()
    }

    const response = await this.send(options)

    if (this.shouldRefreshTokens(response, options)) {
      await this.refreshTokensOrThrow()

      const retryResponse = await this.send({
        ...options,
        retryOnUnauthorized: false,
      })

      if (retryResponse.status === HTTP_STATUS.UNAUTHORIZED) {
        this.expireSession()
      }

      return this.parseResponse<TResponse>(retryResponse)
    }

    return this.parseResponse<TResponse>(response)
  }

  private async ensureAccessTokenOrThrow(): Promise<void> {
    if (tokenStorage.getAccessToken()) {
      return
    }

    if (!tokenStorage.getRefreshToken()) {
      this.expireSession()
    }

    await this.refreshTokensOrThrow()
  }

  private shouldRefreshTokens<TBody>(response: Response, options: RequestOptions<TBody>): boolean {
    return (
      response.status === HTTP_STATUS.UNAUTHORIZED &&
      Boolean(options.requiresAuth) &&
      options.retryOnUnauthorized !== false
    )
  }

  private async refreshTokensOrThrow(): Promise<void> {
    const refreshToken = tokenStorage.getRefreshToken()

    if (!refreshToken) {
      this.expireSession()
    }

    const refreshResponse = await this.send({
      method: 'POST',
      path: API_ROUTES.AUTH.REFRESH,
      body: { refreshToken },
      requiresAuth: false,
      retryOnUnauthorized: false,
    })

    if (!refreshResponse.ok) {
      this.expireSession()
    }

    const payload = await this.parseResponse<RefreshTokenResponse>(refreshResponse)

    if (!payload.accessToken || !payload.refreshToken) {
      this.expireSession()
    }

    tokenStorage.saveTokens({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
    })
  }

  private async send<TBody>(options: RequestOptions<TBody>): Promise<Response> {
    const headers = new Headers()

    if (options.body !== undefined) {
      headers.set('Content-Type', 'application/json')
    }

    if (options.requiresAuth) {
      const accessToken = tokenStorage.getAccessToken()

      if (!accessToken) {
        this.expireSession()
      }

      headers.set('Authorization', `Bearer ${accessToken}`)
    }

    return fetch(this.toAbsoluteUrl(options.path), {
      method: options.method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  }

  private async parseResponse<TResponse>(response: Response): Promise<TResponse> {
    const payload = await this.readResponseBody(response)

    if (!response.ok) {
      throw new ApiError(
        this.extractErrorMessage(payload) || `La requete a echoue avec le statut ${response.status}`,
        response.status,
        payload,
      )
    }

    return payload as TResponse
  }

  private async readResponseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      return response.json()
    }

    return null
  }

  private extractErrorMessage(payload: unknown): string | null {
    if (typeof payload === 'object' && payload !== null && 'message' in payload) {
      const { message } = payload as { message?: unknown }

      if (typeof message === 'string' && message.trim()) {
        return message
      }
    }

    return null
  }

  private toAbsoluteUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    return `${this.baseUrl}${normalizedPath}`
  }

  private expireSession(message = 'Votre session a expire. Veuillez vous reconnecter.'): never {
    tokenStorage.clearTokens()

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent<SessionExpiredEventDetail>(SESSION_EXPIRED_EVENT, {
          detail: { message },
        }),
      )
    }

    throw new SessionExpiredError(message)
  }
}

export const httpClient = new HttpClient(API_BASE_URL)
