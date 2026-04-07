import { API_ROUTES } from '../../../shared/constants/api'
import { PAGINATION } from '../../../shared/constants/pagination'
import { httpClient } from '../../../shared/services/httpClient'
import type { ApiEntityResponse } from '../../../shared/types/api.types'
import type { DateRangeQuery, PaginationQuery } from '../../../shared/types/pagination.types'
import { unwrapEntity } from '../../../shared/utils/api'
import { withQueryParams } from '../../../shared/utils/query'
import type {
  Certificate,
  CertificatesByPatientResponse,
  CreateCertificateRequest,
  UpdateCertificateRequest,
} from '../types/certificats.types'

const certificateByIdPath = (id: string): string => `${API_ROUTES.CERTIFICATES.BASE}/${id}`
const certificatesByPatientPath = (patientId: string): string => {
  return `${API_ROUTES.CERTIFICATES.BASE}/patient/${patientId}`
}

export const certificatsApi = {
  create(payload: CreateCertificateRequest): Promise<Certificate> {
    return httpClient
      .post<ApiEntityResponse<Certificate>, CreateCertificateRequest>(
        API_ROUTES.CERTIFICATES.BASE,
        payload,
        { requiresAuth: true },
      )
      .then(unwrapEntity)
  },

  byId(id: string): Promise<Certificate> {
    return httpClient
      .get<ApiEntityResponse<Certificate>>(certificateByIdPath(id), { requiresAuth: true })
      .then(unwrapEntity)
  },

  update(id: string, payload: UpdateCertificateRequest): Promise<Certificate> {
    return httpClient
      .put<ApiEntityResponse<Certificate>, UpdateCertificateRequest>(certificateByIdPath(id), payload, {
        requiresAuth: true,
      })
      .then(unwrapEntity)
  },

  delete(id: string): Promise<void> {
    return httpClient.delete<void>(certificateByIdPath(id), { requiresAuth: true })
  },

  byPatient(patientId: string, query: PaginationQuery = {}): Promise<CertificatesByPatientResponse> {
    const path = withQueryParams(certificatesByPatientPath(patientId), {
      page: query.page ?? PAGINATION.DEFAULT_PAGE,
      limit: query.limit ?? PAGINATION.DEFAULT_LIMIT,
    })

    return httpClient.get<CertificatesByPatientResponse>(path, { requiresAuth: true })
  },

  byDate(query: DateRangeQuery): Promise<Certificate[]> {
    const path = withQueryParams(API_ROUTES.CERTIFICATES.BY_DATE, {
      date: query.date,
      endDate: query.endDate,
    })

    return httpClient
      .get<ApiEntityResponse<Certificate[]>>(path, { requiresAuth: true })
      .then(unwrapEntity)
  },
}
