import type { PaginatedResponse } from '../../../shared/types/pagination.types'

export interface Analyze {
  _id: string
  patientId: string
  analyzeNames: string[]
  createdAt?: string
  updatedAt?: string
}

export interface CreateAnalyzeRequest {
  patientId: string
  analyzeNames: string[]
}

export interface UpdateAnalyzeRequest {
  patientId?: string
  analyzeNames?: string[]
}

export type AnalysesByPatientResponse = PaginatedResponse<Analyze>
