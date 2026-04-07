import { API_ROUTES } from '../../../shared/constants/api'
import { PAGINATION } from '../../../shared/constants/pagination'
import { httpClient } from '../../../shared/services/httpClient'
import type { ApiEntityResponse } from '../../../shared/types/api.types'
import type { DateRangeQuery, PaginationQuery } from '../../../shared/types/pagination.types'
import { unwrapEntity } from '../../../shared/utils/api'
import { withQueryParams } from '../../../shared/utils/query'
import type {
  CreateOrdonnanceRequest,
  Ordonnance,
  OrdonnancesByPatientResponse,
  UpdateOrdonnanceRequest,
} from '../types/ordonnances.types'

const ordonnanceByIdPath = (id: string): string => `${API_ROUTES.ORDONNANCES.BASE}/${id}`
const ordonnancesByPatientPath = (patientId: string): string => {
  return `${API_ROUTES.ORDONNANCES.BASE}/patient/${patientId}`
}

export const ordonnancesApi = {
  create(payload: CreateOrdonnanceRequest): Promise<Ordonnance> {
    return httpClient
      .post<ApiEntityResponse<Ordonnance>, CreateOrdonnanceRequest>(
        API_ROUTES.ORDONNANCES.BASE,
        payload,
        { requiresAuth: true },
      )
      .then(unwrapEntity)
  },

  byPatient(patientId: string, query: PaginationQuery = {}): Promise<OrdonnancesByPatientResponse> {
    const path = withQueryParams(ordonnancesByPatientPath(patientId), {
      page: query.page ?? PAGINATION.DEFAULT_PAGE,
      limit: query.limit ?? PAGINATION.DEFAULT_LIMIT,
    })

    return httpClient.get<OrdonnancesByPatientResponse>(path, { requiresAuth: true })
  },

  byId(id: string): Promise<Ordonnance> {
    return httpClient
      .get<ApiEntityResponse<Ordonnance>>(ordonnanceByIdPath(id), { requiresAuth: true })
      .then(unwrapEntity)
  },

  update(id: string, payload: UpdateOrdonnanceRequest): Promise<Ordonnance> {
    return httpClient
      .put<ApiEntityResponse<Ordonnance>, UpdateOrdonnanceRequest>(ordonnanceByIdPath(id), payload, {
        requiresAuth: true,
      })
      .then(unwrapEntity)
  },

  delete(id: string): Promise<void> {
    return httpClient.delete<void>(ordonnanceByIdPath(id), { requiresAuth: true })
  },

  byDate(query: DateRangeQuery): Promise<Ordonnance[]> {
    const path = withQueryParams(API_ROUTES.ORDONNANCES.BY_DATE, {
      date: query.date,
      endDate: query.endDate,
    })

    return httpClient
      .get<ApiEntityResponse<Ordonnance[]>>(path, { requiresAuth: true })
      .then(unwrapEntity)
  },
}
