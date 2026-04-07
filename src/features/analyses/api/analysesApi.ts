import { API_ROUTES } from '../../../shared/constants/api'
import { PAGINATION } from '../../../shared/constants/pagination'
import { httpClient } from '../../../shared/services/httpClient'
import type { ApiEntityResponse } from '../../../shared/types/api.types'
import type { DateRangeQuery, PaginationQuery } from '../../../shared/types/pagination.types'
import { unwrapEntity } from '../../../shared/utils/api'
import { withQueryParams } from '../../../shared/utils/query'
import type {
  Analyze,
  AnalysesByPatientResponse,
  CreateAnalyzeRequest,
  UpdateAnalyzeRequest,
} from '../types/analyses.types'

const analyzeByIdPath = (id: string): string => `${API_ROUTES.ANALYZES.BASE}/${id}`
const analyzesByPatientPath = (patientId: string): string => `${API_ROUTES.ANALYZES.BASE}/patient/${patientId}`

export const analysesApi = {
  create(payload: CreateAnalyzeRequest): Promise<Analyze> {
    return httpClient
      .post<ApiEntityResponse<Analyze>, CreateAnalyzeRequest>(API_ROUTES.ANALYZES.BASE, payload, {
        requiresAuth: true,
      })
      .then(unwrapEntity)
  },

  byPatient(patientId: string, query: PaginationQuery = {}): Promise<AnalysesByPatientResponse> {
    const path = withQueryParams(analyzesByPatientPath(patientId), {
      page: query.page ?? PAGINATION.DEFAULT_PAGE,
      limit: query.limit ?? PAGINATION.DEFAULT_LIMIT,
    })

    return httpClient.get<AnalysesByPatientResponse>(path, { requiresAuth: true })
  },

  byId(id: string): Promise<Analyze> {
    return httpClient
      .get<ApiEntityResponse<Analyze>>(analyzeByIdPath(id), { requiresAuth: true })
      .then(unwrapEntity)
  },

  update(id: string, payload: UpdateAnalyzeRequest): Promise<Analyze> {
    return httpClient
      .put<ApiEntityResponse<Analyze>, UpdateAnalyzeRequest>(analyzeByIdPath(id), payload, {
        requiresAuth: true,
      })
      .then(unwrapEntity)
  },

  delete(id: string): Promise<void> {
    return httpClient.delete<void>(analyzeByIdPath(id), { requiresAuth: true })
  },

  byDate(query: DateRangeQuery): Promise<Analyze[]> {
    const path = withQueryParams(API_ROUTES.ANALYZES.BY_DATE, {
      date: query.date,
      endDate: query.endDate,
    })

    return httpClient
      .get<ApiEntityResponse<Analyze[]>>(path, { requiresAuth: true })
      .then(unwrapEntity)
  },
}
