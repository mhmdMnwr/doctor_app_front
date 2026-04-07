import { API_ROUTES } from '../../../shared/constants/api'
import { httpClient } from '../../../shared/services/httpClient'
import type {
  AdminProfile,
  UpdateAdminProfileRequest,
  UpdateAdminProfileResponse,
} from '../types/admin.types'

export const adminApi = {
  getProfile(): Promise<AdminProfile> {
    return httpClient.get<AdminProfile>(API_ROUTES.ADMIN.ME, { requiresAuth: true })
  },

  updateProfile(payload: UpdateAdminProfileRequest): Promise<UpdateAdminProfileResponse> {
    return httpClient.put<UpdateAdminProfileResponse, UpdateAdminProfileRequest>(
      API_ROUTES.ADMIN.ME,
      payload,
      { requiresAuth: true },
    )
  },
}
