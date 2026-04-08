import { useEffect, useState } from 'react'

import { adminApi } from '../features/admin/api/adminApi'
import { AuthPage } from '../pages/auth/AuthPage.tsx'
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage.tsx'
import { SESSION_EXPIRED_EVENT, SessionExpiredError } from '../shared/services/httpClient'
import { tokenStorage } from '../shared/services/tokenStorage'

export function App() {
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(tokenStorage.hasRefreshToken())
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)

  useEffect(() => {
    const handleSessionExpired = (event: Event) => {
      const sessionEvent = event as CustomEvent<{ message?: string }>
      setNoticeMessage(sessionEvent.detail?.message || 'Votre session a expire. Veuillez vous reconnecter.')
      setIsAuthenticated(false)
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired as EventListener)

    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired as EventListener)
    }
  }, [])

  useEffect(() => {
    const validateStoredSession = async () => {
      if (!tokenStorage.hasRefreshToken()) {
        setIsBootstrapping(false)
        return
      }

      try {
        await adminApi.getProfile()
        setIsAuthenticated(true)
      } catch (error) {
        if (error instanceof SessionExpiredError) {
          setNoticeMessage(error.message)
        } else {
          setNoticeMessage('Impossible de restaurer votre session. Veuillez vous reconnecter.')
        }

        setIsAuthenticated(false)
      } finally {
        setIsBootstrapping(false)
      }
    }

    void validateStoredSession()
  }, [])

  const handleAuthenticated = () => {
    setNoticeMessage(null)
    setIsAuthenticated(true)
  }

  const handleSessionEnded = (message: string) => {
    setNoticeMessage(message)
    setIsAuthenticated(false)
  }

  if (isBootstrapping) {
    return (
      <main className="screen screen--loading">
        <p className="status status--info">Verification de la session...</p>
      </main>
    )
  }

  if (!isAuthenticated) {
    return <AuthPage infoMessage={noticeMessage} onAuthenticated={handleAuthenticated} />
  }

  return <AdminDashboardPage onSessionEnded={handleSessionEnded} />
}
