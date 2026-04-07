export interface ApiMessageResponse {
  message: string
}

export interface ApiDataResponse<T> extends ApiMessageResponse {
  data: T
}

export type ApiEntityResponse<T> = T | ApiDataResponse<T>
