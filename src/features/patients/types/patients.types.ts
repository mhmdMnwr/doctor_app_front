import type { ApiMessageResponse } from '../../../shared/types/api.types'
import type { PaginatedResponse } from '../../../shared/types/pagination.types'

export interface Patient {
  _id: string
  name: string
  familyName: string
  birthdate: string
  comment?: string
  phoneNumber?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreatePatientRequest {
  name: string
  familyName: string
  birthdate: string
  comment?: string
  phoneNumber?: string
}

export interface UpdatePatientRequest {
  name?: string
  familyName?: string
  birthdate?: string
  comment?: string
  phoneNumber?: string
}

export type PatientListResponse = PaginatedResponse<Patient>

export type DeletePatientResponse = ApiMessageResponse
