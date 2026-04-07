import { API_ROUTES } from '../../../shared/constants/api'
import { PAGINATION } from '../../../shared/constants/pagination'
import { httpClient } from '../../../shared/services/httpClient'
import type { ApiEntityResponse } from '../../../shared/types/api.types'
import type { PaginationQuery } from '../../../shared/types/pagination.types'
import { unwrapEntity } from '../../../shared/utils/api'
import { withQueryParams } from '../../../shared/utils/query'
import type {
  CreatePatientRequest,
  DeletePatientResponse,
  Patient,
  PatientListResponse,
  UpdatePatientRequest,
} from '../types/patients.types'

const patientByIdPath = (id: string): string => `${API_ROUTES.PATIENTS.BASE}/${id}`

export const patientsApi = {
  getPatients(query: PaginationQuery = {}): Promise<PatientListResponse> {
    const path = withQueryParams(API_ROUTES.PATIENTS.BASE, {
      page: query.page ?? PAGINATION.DEFAULT_PAGE,
      limit: query.limit ?? PAGINATION.DEFAULT_LIMIT,
    })

    return httpClient.get<PatientListResponse>(path, { requiresAuth: true })
  },

  async getAllPatients(): Promise<Patient[]> {
    const allPatients: Patient[] = []
    let page: number = PAGINATION.DEFAULT_PAGE
    let totalPages: number = PAGINATION.DEFAULT_PAGE

    do {
      const response = await this.getPatients({
        page,
        limit: PAGINATION.MAX_LIMIT,
      })

      allPatients.push(...response.data)
      totalPages = response.pagination.totalPages || page
      page += 1
    } while (page <= totalPages)

    return allPatients
  },

  async createPatient(payload: CreatePatientRequest): Promise<Patient> {
    const response = await httpClient.post<ApiEntityResponse<Patient>, CreatePatientRequest>(
      API_ROUTES.PATIENTS.BASE,
      payload,
      { requiresAuth: true },
    )

    return unwrapEntity(response)
  },

  async updatePatient(id: string, payload: UpdatePatientRequest): Promise<Patient> {
    const response = await httpClient.put<ApiEntityResponse<Patient>, UpdatePatientRequest>(
      patientByIdPath(id),
      payload,
      { requiresAuth: true },
    )

    return unwrapEntity(response)
  },

  deletePatient(id: string): Promise<DeletePatientResponse> {
    return httpClient.delete<DeletePatientResponse>(patientByIdPath(id), { requiresAuth: true })
  },
}
