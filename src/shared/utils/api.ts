import type { ApiDataResponse, ApiEntityResponse } from '../types/api.types'

const hasDataEnvelope = <T>(value: ApiEntityResponse<T>): value is ApiDataResponse<T> => {
  return typeof value === 'object' && value !== null && 'data' in value
}

export const unwrapEntity = <T>(value: ApiEntityResponse<T>): T => {
  if (hasDataEnvelope(value)) {
    return value.data
  }

  return value
}
