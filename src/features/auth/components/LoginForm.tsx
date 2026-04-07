import { useState } from 'react'
import type { FormEvent } from 'react'

import { authApi } from '../api/authApi'
import { getErrorMessage } from '../../../shared/utils/error'
import { InputField } from '../../../shared/components/InputField'

interface LoginFormProps {
  onAuthenticated: () => void
}

function UserIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.18 0-6 1.55-6 3.5V20h12v-2.5c0-1.95-2.82-3.5-6-3.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M17 10h-1V8a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2Zm-7-2a2 2 0 0 1 4 0v2h-4Zm7 11H7v-7h10Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function LoginForm({ onAuthenticated }: LoginFormProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedUsername = username.trim()

    if (!normalizedUsername) {
      setErrorMessage("Le nom d'utilisateur est obligatoire.")
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await authApi.login({ username: normalizedUsername, password })
      onAuthenticated()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Connexion impossible. Veuillez reessayer.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <div className="form-card__header">
        <h2>Connexion</h2>
        <p>Connectez-vous pour acceder a votre espace</p>
      </div>

      <div className="form-card__body">
        <InputField
          autoComplete="username"
          id="username"
          label="Nom d'utilisateur"
          leadingIcon={<UserIcon />}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Entrez votre nom d'utilisateur"
          required
          value={username}
        />
        <InputField
          autoComplete="current-password"
          id="password"
          label="Mot de passe"
          leadingIcon={<LockIcon />}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Entrez votre mot de passe"
          required
          type="password"
          value={password}
        />
      </div>

      {errorMessage && <p className="status status--error">{errorMessage}</p>}

      <button className="button button--primary button--full" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Connexion en cours...' : 'Se connecter'}
      </button>
    </form>
  )
}
