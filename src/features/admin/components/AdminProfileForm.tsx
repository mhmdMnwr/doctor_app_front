import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import { adminApi } from '../api/adminApi'
import type { AdminProfile, UpdateAdminProfileRequest } from '../types/admin.types'
import { InputField } from '../../../shared/components/InputField'
import { getErrorMessage } from '../../../shared/utils/error'

interface AdminProfileFormProps {
  profile: AdminProfile
  onProfileUpdated: (nextProfile: AdminProfile) => void
}

interface ProfileFormValues {
  username: string
  address: string
  phoneNumber: string
}

const getInitialValues = (profile: AdminProfile): ProfileFormValues => ({
  username: profile.username,
  address: profile.address,
  phoneNumber: profile.phoneNumber,
})

const getUpdatePayload = (
  values: ProfileFormValues,
  profile: AdminProfile,
): UpdateAdminProfileRequest => {
  const payload: UpdateAdminProfileRequest = {}

  if (values.username !== profile.username) {
    payload.username = values.username
  }

  if (values.address !== profile.address) {
    payload.address = values.address
  }

  if (values.phoneNumber !== profile.phoneNumber) {
    payload.phoneNumber = values.phoneNumber
  }

  return payload
}

export function AdminProfileForm({ profile, onProfileUpdated }: AdminProfileFormProps) {
  const [values, setValues] = useState<ProfileFormValues>(() => getInitialValues(profile))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    setValues(getInitialValues(profile))
  }, [profile])

  const hasChanges = useMemo(() => {
    const payload = getUpdatePayload(values, profile)
    return Object.keys(payload).length > 0
  }, [profile, values])

  const updateField = (field: keyof ProfileFormValues, nextValue: string) => {
    setValues((currentValues) => ({ ...currentValues, [field]: nextValue }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const payload = getUpdatePayload(values, profile)

    if (Object.keys(payload).length === 0) {
      setStatusMessage('Aucune modification a enregistrer.')
      setErrorMessage(null)
      return
    }

    setIsSubmitting(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const response = await adminApi.updateProfile(payload)
      onProfileUpdated(response.data)
      setStatusMessage('Profil mis a jour avec succes.')
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'La mise a jour du profil a echoue.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <div className="panel__header">
        <h2>Mise a jour du profil</h2>
        <p>Modifiez le nom, l'adresse et le telephone via PUT /admin/me.</p>
      </div>

      <div className="panel__body">
        <InputField
          id="profileUsername"
          label="Nom d'utilisateur"
          onChange={(event) => updateField('username', event.target.value)}
          value={values.username}
        />
        <InputField
          id="profileAddress"
          label="Adresse"
          onChange={(event) => updateField('address', event.target.value)}
          value={values.address}
        />
        <InputField
          id="profilePhone"
          label="Numero de telephone"
          onChange={(event) => updateField('phoneNumber', event.target.value)}
          value={values.phoneNumber}
        />
      </div>

      {statusMessage && <p className="status status--success">{statusMessage}</p>}
      {errorMessage && <p className="status status--error">{errorMessage}</p>}

      <button className="button button--ghost" disabled={isSubmitting || !hasChanges} type="submit">
        {isSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
      </button>
    </form>
  )
}
