import { API_ROUTES } from '../../../shared/constants/api'
import { httpClient } from '../../../shared/services/httpClient'
import { tokenStorage } from '../../../shared/services/tokenStorage'
import type {
  ChangePasswordRequest,
  ChangePasswordResponse,
  LoginRequest,
  LoginResponse,
} from '../types/auth.types'

export const authApi = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const response = await httpClient.post<LoginResponse, LoginRequest>(API_ROUTES.AUTH.LOGIN, {
      ...payload,
      username: payload.username.trim(),
    })

    tokenStorage.saveTokens({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    })

    return response
  },

  async changePassword(payload: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    const response = await httpClient.post<ChangePasswordResponse, ChangePasswordRequest>(
      API_ROUTES.AUTH.CHANGE_PASSWORD,
      payload,
      { requiresAuth: true },
    )

    tokenStorage.clearTokens()

    return response
  },

  logout(): void {
    tokenStorage.clearTokens()
  },
}
