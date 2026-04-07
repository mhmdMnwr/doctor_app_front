import type { TokenPair } from '../../../shared/services/tokenStorage'

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse extends TokenPair {
  message: string
}

export interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
}

export interface ChangePasswordResponse {
  message: string
}
