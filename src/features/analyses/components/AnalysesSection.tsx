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
import { analysesApi } from '../api/analysesApi'
import type { Analyze } from '../types/analyses.types'

interface AnalysesSectionProps {
  enableCreation?: boolean
  patientId?: string | null
  patientContext?: Patient | null
  doctorInfo?: DoctorPrintInfo | null
}

const parseAnalyzeNames = (rawValue: string): string[] => {
  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

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

const sortByLatest = (items: Analyze[]): Analyze[] => {
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

const DEFAULT_START_DATE = '1900-01-01'
const DEFAULT_END_DATE = '2999-12-31'
const RECORDS_PAGE_SIZE = PAGINATION.DEFAULT_LIMIT

export function AnalysesSection({
  enableCreation = true,
  patientId = null,
  patientContext = null,
  doctorInfo = null,
}: AnalysesSectionProps) {
  const [createNamesInput, setCreateNamesInput] = useState('')
  const [dateResults, setDateResults] = useState<Analyze[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isDateLoading, setIsDateLoading] = useState(false)
  const [isSelectorOpen, setIsSelectorOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createPatient, setCreatePatient] = useState<Patient | null>(null)
  const [selectedAnalyze, setSelectedAnalyze] = useState<Analyze | null>(null)
  const [updateNamesInput, setUpdateNamesInput] = useState('')
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

  const loadAnalyses = useCallback(async (fromDate: string, toDate?: string) => {
    setIsDateLoading(true)
    setErrorMessage(null)

    try {
      if (patientId) {
        const response = await analysesApi.byPatient(patientId, {
          page: 1,
          limit: PAGINATION.MAX_LIMIT,
        })

        const filteredResults = response.data.filter((item) => isWithinDateRange(item.createdAt, fromDate, toDate))
        setDateResults(sortByLatest(filteredResults))
        setListPage(PAGINATION.DEFAULT_PAGE)
        return
      }

      const results = await analysesApi.byDate({
        date: fromDate,
        endDate: toDate,
      })

      setDateResults(sortByLatest(results))
      setListPage(PAGINATION.DEFAULT_PAGE)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Impossible de charger les analyses.'))
    } finally {
      setIsDateLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    void loadAnalyses(DEFAULT_START_DATE, DEFAULT_END_DATE)

    setErrorMessage(null)
    setSuccessMessage(null)
  }, [loadAnalyses])

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
    setCreateNamesInput('')
    setCreateErrorMessage(null)
    setIsCreateModalOpen(false)
  }

  const openUpdateModal = (analyze: Analyze) => {
    setSelectedAnalyze(analyze)
    setUpdateNamesInput(analyze.analyzeNames.join(', '))
    setIsUpdateModalOpen(true)
  }

  const closeUpdateModal = () => {
    setSelectedAnalyze(null)
    setUpdateNamesInput('')
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

    const analyzeNames = parseAnalyzeNames(createNamesInput)

    if (!analyzeNames.length) {
      setCreateErrorMessage('Entrez au moins un nom d analyse.')
      return
    }

    setIsCreating(true)
    setCreateErrorMessage(null)
    setSuccessMessage(null)

    try {
      await analysesApi.create({
        patientId: createPatient._id,
        analyzeNames,
      })

      setCreateNamesInput('')
      setSuccessMessage('Analyse creee avec succes.')
      closeCreateModal()

      const { fromDate, endDate } = getCurrentRange()
      await loadAnalyses(fromDate, endDate)
    } catch (error) {
      setCreateErrorMessage(getErrorMessage(error, 'Nous n avons pas pu creer l analyse. Reessayez.'))
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedAnalyze) {
      return
    }

    const analyzeNames = parseAnalyzeNames(updateNamesInput)

    if (!analyzeNames.length) {
      setErrorMessage('Ajoutez au moins un nom d analyse.')
      return
    }

    setIsUpdating(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      await analysesApi.update(selectedAnalyze._id, {
        patientId: selectedAnalyze.patientId,
        analyzeNames,
      })

      setSuccessMessage('Analyse mise a jour avec succes.')
      closeUpdateModal()

      const { fromDate, endDate } = getCurrentRange()
      await loadAnalyses(fromDate, endDate)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'La mise a jour de l analyse a echoue.'))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (targetAnalyze?: Analyze) => {
    const analyzeToDelete = targetAnalyze ?? selectedAnalyze

    if (!analyzeToDelete) {
      return
    }

    setIsDeleting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      await analysesApi.delete(analyzeToDelete._id)
      setSuccessMessage('Analyse supprimee avec succes.')

      if (!targetAnalyze) {
        closeUpdateModal()
      }

      const { fromDate, endDate } = getCurrentRange()
      await loadAnalyses(fromDate, endDate)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'La suppression de l analyse a echoue.'))
    } finally {
      setIsDeleting(false)
    }
  }

  const handlePrint = async (analyze: Analyze) => {
    setIsPrinting(true)
    setErrorMessage(null)

    try {
      const patientForPrint = await resolvePatientForPrint(analyze.patientId)

      if (!patientForPrint) {
        setErrorMessage('Impossible de recuperer les informations du patient pour l impression.')
        return
      }

      printMedicalDocument({
        type: 'analyse',
        doctorInfo,
        patient: {
          name: patientForPrint.name,
          familyName: patientForPrint.familyName,
          birthdate: patientForPrint.birthdate,
        },
        createdAt: analyze.createdAt,
        analyzeNames: analyze.analyzeNames,
      })
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'L impression de l analyse a echoue.'))
    } finally {
      setIsPrinting(false)
    }
  }

  const handleByDate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!dateFrom) {
      await loadAnalyses(DEFAULT_START_DATE, DEFAULT_END_DATE)
      return
    }

    await loadAnalyses(dateFrom, dateTo || undefined)
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

        <form className="date-search-form" onSubmit={handleByDate}>
          <label className="date-search-field" htmlFor="analyseDateFrom">
            <span>Date de debut</span>
            <input
              className="field__input"
              id="analyseDateFrom"
              onChange={(event) => setDateFrom(event.target.value)}
              type="date"
              value={dateFrom}
            />
          </label>
          <label className="date-search-field" htmlFor="analyseDateTo">
            <span>Date de fin</span>
            <input
              className="field__input"
              id="analyseDateTo"
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
          {paginatedResults.map((item) => (
            <article className="record-item record-item--with-actions" key={`date-${item._id}`}>
              <button className="record-item__open" onClick={() => openUpdateModal(item)} type="button">
                <strong>{item.analyzeNames.join(', ')}</strong>
                <small>Patient: {getPatientLabel(item.patientId)}</small>
                <small>{toDate(item.createdAt)}</small>
              </button>
              <div className="record-item__actions">
                <button
                  aria-label="Supprimer l analyse"
                  className="record-item__icon-button record-item__icon-button--danger"
                  disabled={isDeleting}
                  onClick={() => { void handleDelete(item) }}
                  type="button"
                >
                  <DeleteIcon />
                </button>
              </div>
            </article>
          ))}

          {!dateResults.length && !isDateLoading && (
            <p className="muted-text">Aucune analyse a afficher.</p>
          )}
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
        description="Selectionnez le patient a associer a l analyse."
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
              <h2>Nouvelle analyse</h2>
            </header>

            {createPatient && (
              <p className="modal-card__description">
                {getPatientDisplayName(createPatient)} - {getPatientAgeLabel(createPatient.birthdate)}
              </p>
            )}

            <form className="editor-grid" onSubmit={handleCreate}>
              {createErrorMessage && <p className="status status--error">{createErrorMessage}</p>}

              <textarea
                onChange={(event) => setCreateNamesInput(event.target.value)}
                placeholder="Noms d analyses separes par des virgules"
                required
                rows={4}
                value={createNamesInput}
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

      {isUpdateModalOpen && selectedAnalyze && (
        <div className="modal-overlay" onClick={closeUpdateModal} role="presentation">
          <section
            aria-modal="true"
            className="modal-card patient-form-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header className="modal-card__header">
              <h2>Modifier analyse</h2>
              <div className="modal-card__header-actions">
                <button
                  className="button button--ghost modal-card__header-button"
                  disabled={isPrinting}
                  onClick={() => { void handlePrint(selectedAnalyze) }}
                  type="button"
                >
                  <PrintIcon />
                  {isPrinting ? 'Impression...' : 'Imprimer'}
                </button>
              </div>
            </header>

            <p className="modal-card__description">Patient: {getPatientLabel(selectedAnalyze.patientId)}</p>

            <form className="editor-grid" onSubmit={handleUpdate}>
              <textarea
                onChange={(event) => setUpdateNamesInput(event.target.value)}
                required
                rows={4}
                value={updateNamesInput}
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
