import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import { PAGINATION } from '../../../shared/constants/pagination'
import { getErrorMessage } from '../../../shared/utils/error'
import { patientsApi } from '../api/patientsApi'
import type { CreatePatientRequest, Patient, PatientListResponse } from '../types/patients.types'
import { getPatientAgeLabel, getPatientDisplayName } from '../utils/patientDisplay'

interface PatientsSectionProps {
  selectedPatientId: string | null
  onPatientSelected: (patient: Patient | null) => void
  onOpenPatientRecords: (patient: Patient) => void
}

interface PatientFormValues {
  name: string
  familyName: string
  birthdate: string
  comment: string
  phoneNumber: string
}

const EMPTY_FORM_VALUES: PatientFormValues = {
  name: '',
  familyName: '',
  birthdate: '',
  comment: '',
  phoneNumber: '',
}

export function PatientsSection({
  selectedPatientId,
  onPatientSelected,
  onOpenPatientRecords,
}: PatientsSectionProps) {
  const [patientsResponse, setPatientsResponse] = useState<PatientListResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [createFormValues, setCreateFormValues] = useState<PatientFormValues>(EMPTY_FORM_VALUES)
  const [page, setPage] = useState<number>(PAGINATION.DEFAULT_PAGE)
  const [deletingPatientId, setDeletingPatientId] = useState<string | null>(null)

  const loadPatients = async (nextPage = page) => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await patientsApi.getPatients({
        page: nextPage,
        limit: PAGINATION.DEFAULT_LIMIT,
      })

      setPatientsResponse(response)

      if (!response.data.length) {
        onPatientSelected(null)
        return
      }

      const hasSelection = response.data.some((patient) => patient._id === selectedPatientId)

      if (!selectedPatientId || !hasSelection) {
        onPatientSelected(response.data[0])
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Impossible de charger les patients.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadPatients(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const patients = useMemo(() => patientsResponse?.data || [], [patientsResponse])

  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) {
      return patients
    }

    const query = searchTerm.trim().toLowerCase()

    return patients.filter((patient) => {
      const fullName = getPatientDisplayName(patient).toLowerCase()
      const phone = (patient.phoneNumber || '').toLowerCase()

      return fullName.includes(query) || phone.includes(query)
    })
  }, [patients, searchTerm])

  const openAddModal = () => {
    setCreateFormValues(EMPTY_FORM_VALUES)
    setCreateErrorMessage(null)
    setIsAddModalOpen(true)
  }

  const closeAddModal = () => {
    setCreateFormValues(EMPTY_FORM_VALUES)
    setCreateErrorMessage(null)
    setIsAddModalOpen(false)
  }

  const updateField = (field: keyof PatientFormValues, value: string) => {
    setCreateFormValues((current) => ({ ...current, [field]: value }))
  }

  const handleCreatePatient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const payload: CreatePatientRequest = {
      name: createFormValues.name.trim(),
      familyName: createFormValues.familyName.trim(),
      birthdate: createFormValues.birthdate,
      comment: createFormValues.comment.trim() || undefined,
      phoneNumber: createFormValues.phoneNumber.trim() || undefined,
    }

    setIsCreating(true)
    setCreateErrorMessage(null)
    setSuccessMessage(null)

    try {
      const createdPatient = await patientsApi.createPatient(payload)
      setSuccessMessage('Patient cree avec succes.')
      closeAddModal()
      await loadPatients(PAGINATION.DEFAULT_PAGE)
      setPage(PAGINATION.DEFAULT_PAGE)
      onPatientSelected(createdPatient)
      onOpenPatientRecords(createdPatient)
    } catch (error) {
      setCreateErrorMessage(getErrorMessage(error, 'Nous n avons pas pu creer le patient. Verifiez les informations puis reessayez.'))
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeletePatient = async (patient: Patient) => {
    if (deletingPatientId || isCreating || isLoading) {
      return
    }

    const patientName = getPatientDisplayName(patient)
    const confirmed =
      typeof window === 'undefined'
        ? true
        : window.confirm(`Supprimer ${patientName} ? Cette action est definitive.`)

    if (!confirmed) {
      return
    }

    setDeletingPatientId(patient._id)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      await patientsApi.deletePatient(patient._id)
      setSuccessMessage('Patient supprime avec succes.')

      if (selectedPatientId === patient._id) {
        onPatientSelected(null)
      }

      await loadPatients(page)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'La suppression du patient a echoue.'))
    } finally {
      setDeletingPatientId(null)
    }
  }

  const totalPatients = patientsResponse?.pagination.total ?? patients.length
  const currentPage = patientsResponse?.pagination.page ?? PAGINATION.DEFAULT_PAGE
  const totalPages = patientsResponse?.pagination.totalPages ?? PAGINATION.DEFAULT_PAGE
  const isDeletingAnyPatient = deletingPatientId !== null

  return (
    <>
      <header className="portal-page__header">
        <div>
          <h1>Patients</h1>
          <p>{totalPatients} patient(s) enregistre(s)</p>
        </div>
        <button className="button button--primary patients-add-button" onClick={openAddModal} type="button">
          <PlusIcon />
          Ajouter patient
        </button>
      </header>

      {isLoading && <p className="status status--info">Chargement des patients...</p>}
      {errorMessage && <p className="status status--error">{errorMessage}</p>}
      {successMessage && <p className="status status--success">{successMessage}</p>}

      <article className="panel patient-list-panel patient-list-panel--full">
        <label className="search-box" htmlFor="patientSearch">
          <SearchIcon />
          <input
            id="patientSearch"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Rechercher un patient..."
            type="text"
            value={searchTerm}
          />
        </label>

        <div className="patient-list">
          {filteredPatients.map((patient) => {
            const isDeletingCurrentPatient = deletingPatientId === patient._id
            const isSelected = selectedPatientId === patient._id

            return (
              <div className={`patient-card-row ${isSelected ? 'is-selected' : ''}`} key={patient._id}>
                <button
                  className="patient-card patient-card-row__open"
                  disabled={isDeletingAnyPatient}
                  onClick={() => {
                    onPatientSelected(patient)
                    onOpenPatientRecords(patient)
                  }}
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

                <button
                  aria-label={
                    isDeletingCurrentPatient
                      ? 'Suppression en cours'
                      : `Supprimer ${getPatientDisplayName(patient)}`
                  }
                  className="record-item__icon-button record-item__icon-button--danger patient-card-row__delete"
                  disabled={isDeletingAnyPatient}
                  onClick={() => {
                    void handleDeletePatient(patient)
                  }}
                  title={isDeletingCurrentPatient ? 'Suppression...' : 'Supprimer patient'}
                  type="button"
                >
                  {isDeletingCurrentPatient ? <span aria-hidden="true">...</span> : <TrashIcon />}
                </button>
              </div>
            )
          })}

          {!filteredPatients.length && !isLoading && (
            <p className="muted-text">Aucun patient trouve pour cette recherche.</p>
          )}
        </div>

        <div className="pagination-row">
          <button
            className="button button--ghost"
            disabled={currentPage <= 1 || isLoading}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            type="button"
          >
            Precedent
          </button>
          <span>
            Page {currentPage} / {Math.max(totalPages, 1)}
          </span>
          <button
            className="button button--ghost"
            disabled={currentPage >= totalPages || isLoading}
            onClick={() => setPage((prev) => prev + 1)}
            type="button"
          >
            Suivant
          </button>
        </div>
      </article>

      {isAddModalOpen && (
        <div className="modal-overlay" onClick={closeAddModal} role="presentation">
          <section
            aria-modal="true"
            className="modal-card patient-form-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header className="modal-card__header">
              <h2>Nouveau patient</h2>
              <button aria-label="Fermer" className="modal-card__close" onClick={closeAddModal} type="button">
                x
              </button>
            </header>

            <p className="modal-card__description">Renseignez les informations du patient pour continuer.</p>

            <form className="editor-grid" onSubmit={handleCreatePatient}>
              {createErrorMessage && <p className="status status--error">{createErrorMessage}</p>}

              <input
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Nom"
                required
                type="text"
                value={createFormValues.name}
              />
              <input
                onChange={(event) => updateField('familyName', event.target.value)}
                placeholder="Prenom"
                required
                type="text"
                value={createFormValues.familyName}
              />
              <input
                onChange={(event) => updateField('birthdate', event.target.value)}
                required
                type="date"
                value={createFormValues.birthdate}
              />
              <input
                onChange={(event) => updateField('phoneNumber', event.target.value)}
                placeholder="Numero de telephone (optionnel)"
                type="text"
                value={createFormValues.phoneNumber}
              />
              <textarea
                onChange={(event) => updateField('comment', event.target.value)}
                placeholder="Commentaire (optionnel)"
                rows={3}
                value={createFormValues.comment}
              />

              <div className="modal-card__actions">
                <button className="button button--ghost" onClick={closeAddModal} type="button">
                  Annuler
                </button>
                <button className="button button--primary" disabled={isCreating} type="submit">
                  {isCreating ? 'Creation...' : 'Creer patient'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
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

function PlusIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6Z" fill="currentColor" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v9h-2V9Zm4 0h2v9h-2V9ZM8 9h2v9H8V9Z"
        fill="currentColor"
      />
    </svg>
  )
}
