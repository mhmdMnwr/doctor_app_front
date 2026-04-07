import { useEffect, useMemo, useState } from 'react'

import { PAGINATION } from '../../../shared/constants/pagination'
import { getErrorMessage } from '../../../shared/utils/error'
import { patientsApi } from '../api/patientsApi'
import type { Patient } from '../types/patients.types'
import { getPatientAgeLabel, getPatientDisplayName } from '../utils/patientDisplay'

interface PatientSelectorModalProps {
  title: string
  description: string
  isOpen: boolean
  onClose: () => void
  onPatientSelected: (patient: Patient) => void
}

export function PatientSelectorModal({
  title,
  description,
  isOpen,
  onClose,
  onPatientSelected,
}: PatientSelectorModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const loadPatients = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await patientsApi.getPatients({
          page: 1,
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
  }, [isOpen])

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

  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <section
        aria-modal="true"
        className="modal-card patient-selector-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="modal-card__header">
          <h2>{title}</h2>
          <button aria-label="Fermer" className="modal-card__close" onClick={onClose} type="button">
            x
          </button>
        </header>

        <p className="modal-card__description">{description}</p>

        <label className="search-box" htmlFor="patientSelectorSearch">
          <SearchIcon />
          <input
            id="patientSelectorSearch"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Rechercher un patient..."
            type="text"
            value={searchTerm}
          />
        </label>

        {isLoading && <p className="status status--info">Chargement...</p>}
        {errorMessage && <p className="status status--error">{errorMessage}</p>}

        <div className="records-list">
          {filteredPatients.map((patient) => (
            <button
              className="record-item record-item--button"
              key={patient._id}
              onClick={() => onPatientSelected(patient)}
              type="button"
            >
              <strong>{getPatientDisplayName(patient)}</strong>
              <small>
                {getPatientAgeLabel(patient.birthdate)} {patient.phoneNumber ? `- ${patient.phoneNumber}` : ''}
              </small>
            </button>
          ))}
        </div>
      </section>
    </div>
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
