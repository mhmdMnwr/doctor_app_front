import { useState } from 'react'
import type { FormEvent } from 'react'

import { authApi } from '../api/authApi'
import { InputField } from '../../../shared/components/InputField'
import { getErrorMessage } from '../../../shared/utils/error'

interface ChangePasswordFormProps {
  onPasswordChanged: (message: string) => void
}

export function ChangePasswordForm({ onPasswordChanged }: ChangePasswordFormProps) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (newPassword !== confirmPassword) {
      setErrorMessage('Le nouveau mot de passe et la confirmation doivent etre identiques.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await authApi.changePassword({ oldPassword, newPassword })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      onPasswordChanged('Mot de passe modifie avec succes.')
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Impossible de modifier le mot de passe.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <div className="panel__header">
        <h2>Changer le mot de passe</h2>
        <p>Pour la securite des donnees patients, cette action deconnecte la session actuelle.</p>
      </div>

      <div className="panel__body">
        <InputField
          autoComplete="current-password"
          id="oldPassword"
          label="Mot de passe actuel"
          onChange={(event) => setOldPassword(event.target.value)}
          required
          type="password"
          value={oldPassword}
        />
        <InputField
          autoComplete="new-password"
          id="newPassword"
          label="Nouveau mot de passe"
          minLength={6}
          onChange={(event) => setNewPassword(event.target.value)}
          required
          type="password"
          value={newPassword}
        />
        <InputField
          autoComplete="new-password"
          id="confirmPassword"
          label="Confirmer le nouveau mot de passe"
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          type="password"
          value={confirmPassword}
        />
      </div>

      {errorMessage && <p className="status status--error">{errorMessage}</p>}

      <button className="button button--ghost" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Mise a jour...' : 'Changer le mot de passe'}
      </button>
    </form>
  )
}
