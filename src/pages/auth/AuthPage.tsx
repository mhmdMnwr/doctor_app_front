import { LoginForm } from '../../features/auth/components/LoginForm'

interface AuthPageProps {
  infoMessage: string | null
  onAuthenticated: () => void
}

function MedicalLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M15 3v4a3 3 0 0 1-6 0V3H7v4a5 5 0 0 0 10 0V3Z"
        fill="currentColor"
      />
      <path
        d="M18 12a3 3 0 1 0 3 3 3 3 0 0 0-3-3Zm0 4a1 1 0 1 1 1-1 1 1 0 0 1-1 1Z"
        fill="currentColor"
      />
      <path
        d="M11 12h2v1.5A4.5 4.5 0 0 0 17.5 18H18v2h-.5A6.5 6.5 0 0 1 11 13.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function AuthPage({ infoMessage, onAuthenticated }: AuthPageProps) {
  return (
    <main className="screen screen--auth">
      <header className="auth-brand">
        <div className="auth-logo">
          <MedicalLogo />
        </div>
        <h1>Portail Médical</h1>
        <p>Système de Gestion des Patients</p>
      </header>

      {infoMessage && <p className="status status--info">{infoMessage}</p>}
      <LoginForm onAuthenticated={onAuthenticated} />
    </main>
  )
}
