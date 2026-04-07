export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface RequestOptions<TBody> {
  path: string
  method: HttpMethod
  body?: TBody
  requiresAuth?: boolean
  retryOnUnauthorized?: boolean
  signal?: AbortSignal
}

export interface RequestOverrides {
  requiresAuth?: boolean
  retryOnUnauthorized?: boolean
  signal?: AbortSignal
}
