import type { PaginatedResponse } from '../../../shared/types/pagination.types'

export interface OrdonnanceMedicine {
  medicine: string
  dosage: string
}

export interface Ordonnance {
  _id: string
  patientId: string
  medicines: OrdonnanceMedicine[]
  diagnostic: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateOrdonnanceRequest {
  patientId: string
  medicines: OrdonnanceMedicine[]
  diagnostic: string
}

export interface UpdateOrdonnanceRequest {
  patientId?: string
  medicines?: OrdonnanceMedicine[]
  diagnostic?: string
}

export type OrdonnancesByPatientResponse = PaginatedResponse<Ordonnance>
