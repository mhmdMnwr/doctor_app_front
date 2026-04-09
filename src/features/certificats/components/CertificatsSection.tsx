import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import { PAGINATION } from '../../../shared/constants/pagination'
import { printMedicalDocument } from '../../../shared/utils/medicalPrint'
import type { DoctorPrintInfo } from '../../../shared/utils/medicalPrint'
import { PatientSelectorModal } from '../../patients/components/PatientSelectorModal'
import { patientsApi } from '../../patients/api/patientsApi'
import type { Patient } from '../../patients/types/patients.types'
import { getPatientAgeLabel, getPatientDisplayName } from '../../patients/utils/patientDisplay'
import { getErrorMessage } from '../../../shared/utils/error'
import { certificatsApi } from '../api/certificatsApi'
import type { Certificate } from '../types/certificats.types'

interface CertificatsSectionProps {
  enableCreation?: boolean
  patientId?: string | null
  patientContext?: Patient | null
  doctorInfo?: DoctorPrintInfo | null
}

const DEFAULT_START_DATE = '1900-01-01'
const DEFAULT_END_DATE = '2999-12-31'
const RECORDS_PAGE_SIZE = PAGINATION.DEFAULT_LIMIT

const toDate = (value?: string): string => {
  if (!value) {
    return '-'
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString('fr-FR')
}

const toTimestamp = (value?: string): number => {
  if (!value) {
    return 0
  }

  const parsed = new Date(value).getTime()

  return Number.isNaN(parsed) ? 0 : parsed
}

const sortByLatest = (items: Certificate[]): Certificate[] => {
  return [...items].sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt))
}

const toDateStartTimestamp = (value: string): number => {
  return new Date(`${value}T00:00:00`).getTime()
}

const toDateEndTimestamp = (value: string): number => {
  return new Date(`${value}T23:59:59.999`).getTime()
}

const isWithinDateRange = (createdAt: string | undefined, fromDate: string, endDate?: string): boolean => {
  const createdAtTimestamp = toTimestamp(createdAt)

  if (!createdAtTimestamp) {
    return false
  }

  const startTimestamp = toDateStartTimestamp(fromDate)
  const endTimestamp = endDate ? toDateEndTimestamp(endDate) : Number.POSITIVE_INFINITY

  return createdAtTimestamp >= startTimestamp && createdAtTimestamp <= endTimestamp
}

export function CertificatsSection({
  enableCreation = true,
  patientId = null,
  patientContext = null,
  doctorInfo = null,
}: CertificatsSectionProps) {
  const [commentaire, setCommentaire] = useState('')
  const [dateResults, setDateResults] = useState<Certificate[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isDateLoading, setIsDateLoading] = useState(false)
  const [isSelectorOpen, setIsSelectorOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createPatient, setCreatePatient] = useState<Patient | null>(null)
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null)
  const [updateCommentaire, setUpdateCommentaire] = useState('')
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [patientsDirectory, setPatientsDirectory] = useState<Record<string, Patient>>({})
  const [listPage, setListPage] = useState<number>(PAGINATION.DEFAULT_PAGE)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const getCurrentRange = () => {
    return {
      fromDate: dateFrom || DEFAULT_START_DATE,
      endDate: dateTo || (dateFrom ? undefined : DEFAULT_END_DATE),
    }
  }

  const loadCertificates = useCallback(async (fromDate: string, endDate?: string) => {
    setIsDateLoading(true)
    setErrorMessage(null)

    try {
      if (patientId) {
        const response = await certificatsApi.byPatient(patientId, {
          page: 1,
          limit: PAGINATION.MAX_LIMIT,
        })

        const filteredResults = response.data.filter((item) => isWithinDateRange(item.createdAt, fromDate, endDate))
        setDateResults(sortByLatest(filteredResults))
        setListPage(PAGINATION.DEFAULT_PAGE)
        return
      }

      const results = await certificatsApi.byDate({
        date: fromDate,
        endDate,
      })

      setDateResults(sortByLatest(results))
      setListPage(PAGINATION.DEFAULT_PAGE)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Impossible de charger les certificats.'))
    } finally {
      setIsDateLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    void loadCertificates(DEFAULT_START_DATE, DEFAULT_END_DATE)
    setErrorMessage(null)
    setSuccessMessage(null)
  }, [loadCertificates])

  useEffect(() => {
    let isActive = true

    const loadPatientsDirectory = async () => {
      const contextDirectory = patientContext ? { [patientContext._id]: patientContext } : {}

      try {
        const patients = await patientsApi.getAllPatients()

        if (!isActive) {
          return
        }

        const directory = patients.reduce<Record<string, Patient>>((accumulator, item) => {
          accumulator[item._id] = item
          return accumulator
        }, {})

        setPatientsDirectory({
          ...directory,
          ...contextDirectory,
        })
      } catch {
        if (!isActive || !patientContext) {
          return
        }

        setPatientsDirectory(contextDirectory)
      }
    }

    void loadPatientsDirectory()

    return () => {
      isActive = false
    }
  }, [patientContext])

  const openCreateFlow = () => {
    if (!enableCreation) {
      return
    }

    setCreatePatient(null)
    setCreateErrorMessage(null)
    setIsSelectorOpen(true)
  }

  const closeCreateModal = () => {
    setCommentaire('')
    setCreateErrorMessage(null)
    setIsCreateModalOpen(false)
  }

  const openUpdateModal = (certificate: Certificate) => {
    setSelectedCertificate(certificate)
    setUpdateCommentaire(certificate.commentaire)
    setIsUpdateModalOpen(true)
  }

  const closeUpdateModal = () => {
    setSelectedCertificate(null)
    setUpdateCommentaire('')
    setIsUpdateModalOpen(false)
  }

  const resolvePatientForPrint = useCallback(async (targetPatientId: string): Promise<Patient | null> => {
    if (patientContext && patientContext._id === targetPatientId) {
      return patientContext
    }

    const cachedPatient = patientsDirectory[targetPatientId]

    if (cachedPatient) {
      return cachedPatient
    }

    const patients = await patientsApi.getAllPatients()
    const directory = patients.reduce<Record<string, Patient>>((accumulator, item) => {
      accumulator[item._id] = item
      return accumulator
    }, {})

    setPatientsDirectory(directory)

    return directory[targetPatientId] || null
  }, [patientContext, patientsDirectory])

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!createPatient) {
      setCreateErrorMessage('Choisissez d abord un patient.')
      return
    }

    setIsCreating(true)
    setCreateErrorMessage(null)
    setSuccessMessage(null)

    try {
      await certificatsApi.create({
        patientId: createPatient._id,
        commentaire: commentaire.trim(),
      })

      setCommentaire('')
      setSuccessMessage('Certificat cree avec succes.')
      closeCreateModal()

      const { fromDate, endDate } = getCurrentRange()
      await loadCertificates(fromDate, endDate)
    } catch (error) {
      setCreateErrorMessage(getErrorMessage(error, 'Nous n avons pas pu creer le certificat. Reessayez.'))
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedCertificate) {
      return
    }

    setIsUpdating(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      await certificatsApi.update(selectedCertificate._id, {
        patientId: selectedCertificate.patientId,
        commentaire: updateCommentaire.trim(),
      })

      setSuccessMessage('Certificat mis a jour avec succes.')
      closeUpdateModal()

      const { fromDate, endDate } = getCurrentRange()
      await loadCertificates(fromDate, endDate)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'La mise a jour du certificat a echoue.'))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (targetCertificate?: Certificate) => {
    const certificateToDelete = targetCertificate ?? selectedCertificate

    if (!certificateToDelete) {
      return
    }

    setIsDeleting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      await certificatsApi.delete(certificateToDelete._id)
      setSuccessMessage('Certificat supprime avec succes.')

      if (!targetCertificate) {
        closeUpdateModal()
      }

      const { fromDate, endDate } = getCurrentRange()
      await loadCertificates(fromDate, endDate)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'La suppression du certificat a echoue.'))
    } finally {
      setIsDeleting(false)
    }
  }

  const handlePrint = async (certificate: Certificate) => {
    setIsPrinting(true)
    setErrorMessage(null)

    try {
      const patientForPrint = await resolvePatientForPrint(certificate.patientId)

      if (!patientForPrint) {
        setErrorMessage('Impossible de recuperer les informations du patient pour l impression.')
        return
      }

      printMedicalDocument({
        type: 'certificat',
        doctorInfo,
        patient: {
          name: patientForPrint.name,
          familyName: patientForPrint.familyName,
          birthdate: patientForPrint.birthdate,
        },
        createdAt: certificate.createdAt,
        commentaire: certificate.commentaire,
      })
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'L impression du certificat a echoue.'))
    } finally {
      setIsPrinting(false)
    }
  }

  const handleByDateSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!dateFrom) {
      await loadCertificates(DEFAULT_START_DATE, DEFAULT_END_DATE)
      return
    }

    await loadCertificates(dateFrom, dateTo || undefined)
  }

  const totalPages = Math.max(1, Math.ceil(dateResults.length / RECORDS_PAGE_SIZE))
  const currentPage = Math.min(listPage, totalPages)

  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * RECORDS_PAGE_SIZE
    return dateResults.slice(startIndex, startIndex + RECORDS_PAGE_SIZE)
  }, [currentPage, dateResults])

  const getPatientLabel = (targetPatientId: string): string => {
    if (patientContext && patientContext._id === targetPatientId) {
      return getPatientDisplayName(patientContext)
    }

    const patient = patientsDirectory[targetPatientId]

    if (patient) {
      return getPatientDisplayName(patient)
    }

    return targetPatientId
  }

  return (
    <section className="records-page">
      {enableCreation && (
        <div className="section-toolbar">
          <button className="button button--primary section-add-button" onClick={openCreateFlow} type="button">
            <PlusIcon />
            Ajouter
          </button>
        </div>
      )}

      <article className="panel records-panel">
        {errorMessage && <p className="status status--error">{errorMessage}</p>}
        {successMessage && <p className="status status--success">{successMessage}</p>}

        <form className="date-search-form" onSubmit={handleByDateSearch}>
          <label className="date-search-field" htmlFor="certDateFrom">
            <span>Date de debut</span>
            <input
              className="field__input"
              id="certDateFrom"
              onChange={(event) => setDateFrom(event.target.value)}
              type="date"
              value={dateFrom}
            />
          </label>
          <label className="date-search-field" htmlFor="certDateTo">
            <span>Date de fin</span>
            <input
              className="field__input"
              id="certDateTo"
              onChange={(event) => setDateTo(event.target.value)}
              type="date"
              value={dateTo}
            />
          </label>
          <button className="button button--ghost" disabled={isDateLoading} type="submit">
            {isDateLoading ? 'Recherche...' : 'Rechercher'}
          </button>
        </form>

        <div className="records-list">
          {paginatedResults.map((certificate) => (
            <article className="record-item record-item--with-actions" key={`date-${certificate._id}`}>
              <button className="record-item__open" onClick={() => openUpdateModal(certificate)} type="button">
                <strong>{certificate.commentaire}</strong>
                <small>Patient: {getPatientLabel(certificate.patientId)}</small>
                <small>{toDate(certificate.createdAt)}</small>
              </button>
              <div className="record-item__actions">
                <button
                  aria-label="Supprimer le certificat"
                  className="record-item__icon-button record-item__icon-button--danger"
                  disabled={isDeleting}
                  onClick={() => { void handleDelete(certificate) }}
                  type="button"
                >
                  <DeleteIcon />
                </button>
              </div>
            </article>
          ))}

          {!dateResults.length && !isDateLoading && <p className="muted-text">Aucun certificat a afficher.</p>}
        </div>

        <div className="pagination-row">
          <button
            className="button button--ghost"
            disabled={currentPage <= 1 || isDateLoading}
            onClick={() => setListPage((previousPage) => Math.max(previousPage - 1, 1))}
            type="button"
          >
            Precedent
          </button>
          <span>
            Page {currentPage} / {totalPages}
          </span>
          <button
            className="button button--ghost"
            disabled={currentPage >= totalPages || isDateLoading}
            onClick={() => setListPage((previousPage) => previousPage + 1)}
            type="button"
          >
            Suivant
          </button>
        </div>
      </article>

      <PatientSelectorModal
        description="Selectionnez le patient a associer au certificat."
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        onPatientSelected={(patient) => {
          setCreatePatient(patient)
          setCreateErrorMessage(null)
          setIsSelectorOpen(false)
          setIsCreateModalOpen(true)
        }}
        title="Choisir un patient"
      />

      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={closeCreateModal} role="presentation">
          <section
            aria-modal="true"
            className="modal-card patient-form-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header className="modal-card__header">
              <h2>Nouveau certificat</h2>
            </header>

            {createPatient && (
              <p className="modal-card__description">
                {getPatientDisplayName(createPatient)} - {getPatientAgeLabel(createPatient.birthdate)}
              </p>
            )}

            <form className="editor-grid" onSubmit={handleCreate}>
              {createErrorMessage && <p className="status status--error">{createErrorMessage}</p>}

              <textarea
                onChange={(event) => setCommentaire(event.target.value)}
                placeholder="Commentaire"
                required
                rows={4}
                value={commentaire}
              />

              <div className="modal-card__actions">
                <button className="button button--ghost" onClick={closeCreateModal} type="button">
                  Annuler
                </button>
                <button className="button button--primary" disabled={isCreating} type="submit">
                  {isCreating ? 'Creation...' : 'Creer'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {isUpdateModalOpen && selectedCertificate && (
        <div className="modal-overlay" onClick={closeUpdateModal} role="presentation">
          <section
            aria-modal="true"
            className="modal-card patient-form-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header className="modal-card__header">
              <h2>Modifier certificat</h2>
              <div className="modal-card__header-actions">
                <button
                  className="button button--ghost modal-card__header-button"
                  disabled={isPrinting}
                  onClick={() => { void handlePrint(selectedCertificate) }}
                  type="button"
                >
                  <PrintIcon />
                  {isPrinting ? 'Impression...' : 'Imprimer'}
                </button>
              </div>
            </header>

            <p className="modal-card__description">Patient: {getPatientLabel(selectedCertificate.patientId)}</p>

            <form className="editor-grid" onSubmit={handleUpdate}>
              <textarea
                onChange={(event) => setUpdateCommentaire(event.target.value)}
                required
                rows={4}
                value={updateCommentaire}
              />

              <div className="modal-card__actions">
                <button className="button button--ghost" onClick={closeUpdateModal} type="button">
                  Annuler
                </button>
                <button className="button button--primary" disabled={isUpdating} type="submit">
                  {isUpdating ? 'Mise a jour...' : 'Mettre a jour'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6Z" fill="currentColor" />
    </svg>
  )
}

function PrintIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M7 3h10v4H7V3Zm10 16H7v2h10v-2Zm2-10a2 2 0 0 1 2 2v5h-3v-3H6v3H3v-5a2 2 0 0 1 2-2h14Zm-3 3v-3H8v3h8Z" fill="currentColor" />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M8 4h8l1 2h4v2H3V6h4l1-2Zm-2 6h12l-1 10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 10Zm4 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z" fill="currentColor" />
    </svg>
  )
}
