export interface AdminProfile {
  _id: string
  username: string
  address: string
  phoneNumber: string
  tokenVersion: number
  createdAt: string
  updatedAt: string
}

export interface UpdateAdminProfileRequest {
  username?: string
  address?: string
  phoneNumber?: string
}

export interface UpdateAdminProfileResponse {
  message: string
  data: AdminProfile
}
