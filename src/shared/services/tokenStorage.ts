import { STORAGE_KEYS } from '../constants/storage'

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

const readToken = (key: string): string | null => {
  return window.localStorage.getItem(key)
}

export const tokenStorage = {
  getTokens(): TokenPair | null {
    const accessToken = readToken(STORAGE_KEYS.ACCESS_TOKEN)
    const refreshToken = readToken(STORAGE_KEYS.REFRESH_TOKEN)

    if (!accessToken || !refreshToken) {
      return null
    }

    return { accessToken, refreshToken }
  },

  saveTokens(tokens: TokenPair): void {
    window.localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken)
    window.localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken)
  },

  clearTokens(): void {
    window.localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    window.localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
  },

  hasTokens(): boolean {
    return this.getTokens() !== null
  },
}
