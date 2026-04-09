import { API_ROUTES } from '../../../shared/constants/api'
import { httpClient } from '../../../shared/services/httpClient'
import type {
  AdminProfile,
  DoctorAccountInfo,
  UpdateAdminProfileRequest,
  UpdateAdminProfileResponse,
} from '../types/admin.types'

export const adminApi = {
  getProfile(): Promise<AdminProfile> {
    return httpClient.get<AdminProfile>(API_ROUTES.ADMIN.ME, { requiresAuth: true })
  },

  getDoctorName(): Promise<DoctorAccountInfo> {
    return httpClient.get<DoctorAccountInfo>(API_ROUTES.ADMIN.DOCTOR_NAME, { requiresAuth: true })
  },

  updateProfile(payload: UpdateAdminProfileRequest): Promise<UpdateAdminProfileResponse> {
    return httpClient.put<UpdateAdminProfileResponse, UpdateAdminProfileRequest>(
      API_ROUTES.ADMIN.ME,
      payload,
      { requiresAuth: true },
    )
  },
}
