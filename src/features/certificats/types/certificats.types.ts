import type { PaginatedResponse } from '../../../shared/types/pagination.types'

export interface Certificate {
  _id: string
  patientId: string
  commentaire: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateCertificateRequest {
  patientId: string
  commentaire: string
}

export interface UpdateCertificateRequest {
  patientId?: string
  commentaire?: string
}

export type CertificatesByPatientResponse = PaginatedResponse<Certificate>
