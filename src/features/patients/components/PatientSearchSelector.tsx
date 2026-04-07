import { useEffect, useMemo, useState } from 'react'

import { PAGINATION } from '../../../shared/constants/pagination'
import { getErrorMessage } from '../../../shared/utils/error'
import { patientsApi } from '../api/patientsApi'
import type { Patient } from '../types/patients.types'
import { getPatientAgeLabel, getPatientDisplayName } from '../utils/patientDisplay'

interface PatientSearchSelectorProps {
  selectedPatientId: string | null
  onPatientSelected: (patient: Patient) => void
  title?: string
  description?: string
}

export function PatientSearchSelector({
  selectedPatientId,
  onPatientSelected,
  title = 'Selectionner un patient',
  description = 'Recherchez un patient puis selectionnez-le dans la liste.',
}: PatientSearchSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const loadPatients = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await patientsApi.getPatients({
          page: PAGINATION.DEFAULT_PAGE,
          limit: PAGINATION.MAX_LIMIT,
        })

        setPatients(response.data)
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Impossible de charger les patients.'))
      } finally {
        setIsLoading(false)
      }
    }

    void loadPatients()
  }, [])

  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) {
      return patients
    }

    const query = searchTerm.trim().toLowerCase()

    return patients.filter((patient) => {
      const name = getPatientDisplayName(patient).toLowerCase()
      const phone = (patient.phoneNumber || '').toLowerCase()

      return name.includes(query) || phone.includes(query)
    })
  }, [patients, searchTerm])

  return (
    <article className="panel patient-list-panel">
      <header className="records-panel__header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>

      <label className="search-box" htmlFor="patientInlineSearch">
        <SearchIcon />
        <input
          id="patientInlineSearch"
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Rechercher un patient..."
          type="text"
          value={searchTerm}
        />
      </label>

      {isLoading && <p className="status status--info">Chargement des patients...</p>}
      {errorMessage && <p className="status status--error">{errorMessage}</p>}

      <div className="patient-list">
        {filteredPatients.map((patient) => (
          <button
            className={`patient-card ${selectedPatientId === patient._id ? 'is-selected' : ''}`}
            key={patient._id}
            onClick={() => onPatientSelected(patient)}
            type="button"
          >
            <span className="patient-card__avatar">
              <UserIcon />
            </span>
            <span className="patient-card__meta">
              <strong>{getPatientDisplayName(patient)}</strong>
              <small>
                {getPatientAgeLabel(patient.birthdate)} {patient.phoneNumber ? `- ${patient.phoneNumber}` : ''}
              </small>
            </span>
          </button>
        ))}

        {!filteredPatients.length && !isLoading && (
          <p className="muted-text">Aucun patient trouve pour cette recherche.</p>
        )}
      </div>
    </article>
  )
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M10 4a6 6 0 1 1-4.24 10.24A6 6 0 0 1 10 4Zm0-2a8 8 0 1 0 5.29 14l4.35 4.35 1.41-1.41-4.35-4.35A8 8 0 0 0 10 2Z"
        fill="currentColor"
      />
    </svg>
  )
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
