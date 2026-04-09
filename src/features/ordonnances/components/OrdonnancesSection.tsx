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
import { ordonnancesApi } from '../api/ordonnancesApi'
import type { Ordonnance } from '../types/ordonnances.types'

interface OrdonnancesSectionProps {
  enableCreation?: boolean
  patientId?: string | null
  patientContext?: Patient | null
  doctorInfo?: DoctorPrintInfo | null
}

interface MedicineFormRow {
  medicine: string
  dosage: string
}

const EMPTY_MEDICINE_ROW: MedicineFormRow = {
  medicine: '',
  dosage: '',
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

const sortByLatest = (items: Ordonnance[]): Ordonnance[] => {
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

const toMedicineRows = (medicines: Ordonnance['medicines']): MedicineFormRow[] => {
  if (!medicines.length) {
    return [{ ...EMPTY_MEDICINE_ROW }]
  }

  return medicines.map((item) => ({
    medicine: item.medicine,
    dosage: item.dosage,
  }))
}

const sanitizeCreateMedicineRows = (rows: MedicineFormRow[]): MedicineFormRow[] => {
  return rows
    .map((item) => ({
      medicine: item.medicine.trim(),
      dosage: item.dosage.trim(),
    }))
    .filter((item) => item.medicine)
}

const sanitizeMedicineRows = (rows: MedicineFormRow[]): MedicineFormRow[] => {
  return rows
    .map((item) => ({
      medicine: item.medicine.trim(),
      dosage: item.dosage.trim(),
    }))
    .filter((item) => item.medicine && item.dosage)
}

export function OrdonnancesSection({
  enableCreation = true,
  patientId = null,
  patientContext = null,
  doctorInfo = null,
}: OrdonnancesSectionProps) {
  const [diagnostic, setDiagnostic] = useState('')
  const [createMedicines, setCreateMedicines] = useState<MedicineFormRow[]>([{ ...EMPTY_MEDICINE_ROW }])
  const [dateResults, setDateResults] = useState<Ordonnance[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isDateLoading, setIsDateLoading] = useState(false)
  const [isSelectorOpen, setIsSelectorOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createPatient, setCreatePatient] = useState<Patient | null>(null)
  const [selectedOrdonnance, setSelectedOrdonnance] = useState<Ordonnance | null>(null)
  const [updateDiagnostic, setUpdateDiagnostic] = useState('')
  const [updateMedicines, setUpdateMedicines] = useState<MedicineFormRow[]>([{ ...EMPTY_MEDICINE_ROW }])
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

  const loadOrdonnances = useCallback(async (fromDate: string, endDate?: string) => {
    setIsDateLoading(true)
    setErrorMessage(null)

    try {
      if (patientId) {
        const response = await ordonnancesApi.byPatient(patientId, {
          page: 1,
          limit: PAGINATION.MAX_LIMIT,
        })

        const filteredResults = response.data.filter((item) => isWithinDateRange(item.createdAt, fromDate, endDate))
        setDateResults(sortByLatest(filteredResults))
        setListPage(PAGINATION.DEFAULT_PAGE)
        return
      }

      const results = await ordonnancesApi.byDate({
        date: fromDate,
        endDate,
      })

      setDateResults(sortByLatest(results))
      setListPage(PAGINATION.DEFAULT_PAGE)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Impossible de charger les ordonnances.'))
    } finally {
      setIsDateLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    void loadOrdonnances(DEFAULT_START_DATE, DEFAULT_END_DATE)
    setErrorMessage(null)
    setSuccessMessage(null)
  }, [loadOrdonnances])

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
    setDiagnostic('')
    setCreateMedicines([{ ...EMPTY_MEDICINE_ROW }])
    setCreateErrorMessage(null)
    setIsCreateModalOpen(false)
  }

  const addCreateMedicineRow = () => {
    setCreateMedicines((previous) => [...previous, { ...EMPTY_MEDICINE_ROW }])
  }

  const updateCreateMedicineRow = (index: number, field: keyof MedicineFormRow, value: string) => {
    setCreateMedicines((previous) => {
      return previous.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item
        }

        return {
          ...item,
          [field]: value,
        }
      })
    })
  }

  const openUpdateModal = (ordonnance: Ordonnance) => {
    setSelectedOrdonnance(ordonnance)
    setUpdateDiagnostic(ordonnance.diagnostic)
    setUpdateMedicines(toMedicineRows(ordonnance.medicines))
    setIsUpdateModalOpen(true)
  }

  const closeUpdateModal = () => {
    setSelectedOrdonnance(null)
    setUpdateDiagnostic('')
    setUpdateMedicines([{ ...EMPTY_MEDICINE_ROW }])
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

  const addUpdateMedicineRow = () => {
    setUpdateMedicines((previous) => [...previous, { ...EMPTY_MEDICINE_ROW }])
  }

  const updateUpdateMedicineRow = (index: number, field: keyof MedicineFormRow, value: string) => {
    setUpdateMedicines((previous) => {
      return previous.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item
        }

        return {
          ...item,
          [field]: value,
        }
      })
    })
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!createPatient) {
      setCreateErrorMessage('Choisissez d abord un patient.')
      return
    }

    const medicines = sanitizeCreateMedicineRows(createMedicines)

    setIsCreating(true)
    setCreateErrorMessage(null)
    setSuccessMessage(null)

    try {
      await ordonnancesApi.create({
        patientId: createPatient._id,
        medicines,
        diagnostic: diagnostic.trim(),
      })

      setDiagnostic('')
      setCreateMedicines([{ ...EMPTY_MEDICINE_ROW }])
      setSuccessMessage('Ordonnance creee avec succes.')
      closeCreateModal()

      const { fromDate, endDate } = getCurrentRange()
      await loadOrdonnances(fromDate, endDate)
    } catch (error) {
      setCreateErrorMessage(getErrorMessage(error, 'Nous n avons pas pu creer l ordonnance. Reessayez.'))
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedOrdonnance) {
      return
    }

    const medicines = sanitizeMedicineRows(updateMedicines)

    if (!medicines.length) {
      setErrorMessage('Ajoutez au moins un medicament valide.')
      return
    }

    setIsUpdating(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      await ordonnancesApi.update(selectedOrdonnance._id, {
        patientId: selectedOrdonnance.patientId,
        diagnostic: updateDiagnostic.trim(),
        medicines,
      })

      setSuccessMessage('Ordonnance mise a jour avec succes.')
      closeUpdateModal()

      const { fromDate, endDate } = getCurrentRange()
      await loadOrdonnances(fromDate, endDate)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'La mise a jour de l ordonnance a echoue.'))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (targetOrdonnance?: Ordonnance) => {
    const ordonnanceToDelete = targetOrdonnance ?? selectedOrdonnance

    if (!ordonnanceToDelete) {
      return
    }

    setIsDeleting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      await ordonnancesApi.delete(ordonnanceToDelete._id)
      setSuccessMessage('Ordonnance supprimee avec succes.')

      if (!targetOrdonnance) {
        closeUpdateModal()
      }

      const { fromDate, endDate } = getCurrentRange()
      await loadOrdonnances(fromDate, endDate)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'La suppression de l ordonnance a echoue.'))
    } finally {
      setIsDeleting(false)
    }
  }

  const handlePrint = async (ordonnance: Ordonnance) => {
    setIsPrinting(true)
    setErrorMessage(null)

    try {
      const patientForPrint = await resolvePatientForPrint(ordonnance.patientId)

      if (!patientForPrint) {
        setErrorMessage('Impossible de recuperer les informations du patient pour l impression.')
        return
      }

      printMedicalDocument({
        type: 'ordonnance',
        doctorInfo,
        patient: {
          name: patientForPrint.name,
          familyName: patientForPrint.familyName,
          birthdate: patientForPrint.birthdate,
        },
        createdAt: ordonnance.createdAt,
        diagnostic: ordonnance.diagnostic,
        medicines: ordonnance.medicines,
      })
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'L impression de l ordonnance a echoue.'))
    } finally {
      setIsPrinting(false)
    }
  }

  const handleByDate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!dateFrom) {
      await loadOrdonnances(DEFAULT_START_DATE, DEFAULT_END_DATE)
      return
    }

    await loadOrdonnances(dateFrom, dateTo || undefined)
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
          <label className="date-search-field" htmlFor="ordoDateFrom">
            <span>Date de debut</span>
            <input
              className="field__input"
              id="ordoDateFrom"
              onChange={(event) => setDateFrom(event.target.value)}
              type="date"
              value={dateFrom}
            />
          </label>
          <label className="date-search-field" htmlFor="ordoDateTo">
            <span>Date de fin</span>
            <input
              className="field__input"
              id="ordoDateTo"
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
                <strong>{item.diagnostic}</strong>
                <small>{item.medicines.length} medicament(s)</small>
                <small>Patient: {getPatientLabel(item.patientId)}</small>
                <small>{toDate(item.createdAt)}</small>
              </button>
              <div className="record-item__actions">
                <button
                  aria-label="Supprimer l ordonnance"
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

          {!dateResults.length && !isDateLoading && <p className="muted-text">Aucune ordonnance a afficher.</p>}
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
        description="Selectionnez le patient a associer a l ordonnance."
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
              <h2>Nouvelle ordonnance</h2>
            </header>

            {createPatient && (
              <p className="modal-card__description">
                {getPatientDisplayName(createPatient)} - {getPatientAgeLabel(createPatient.birthdate)}
              </p>
            )}

            <form className="editor-grid" onSubmit={handleCreate}>
              {createErrorMessage && <p className="status status--error">{createErrorMessage}</p>}

              <label className="form-label" htmlFor="ordonnanceDiagnostic">
                <span>Diagnostic *</span>
                <textarea
                  id="ordonnanceDiagnostic"
                  onChange={(event) => setDiagnostic(event.target.value)}
                  placeholder="Entrez le diagnostic"
                  required
                  rows={4}
                  value={diagnostic}
                />
              </label>

              <section className="ordonnance-medicines">
                <header className="ordonnance-medicines__header">
                  <h3>Medicaments (optionnel)</h3>
                  <button className="button button--ghost ordonnance-medicines__add" onClick={addCreateMedicineRow} type="button">
                    +
                    Ajouter
                  </button>
                </header>

                <div className="ordonnance-medicines__list">
                  {createMedicines.map((item, index) => (
                    <div className="ordonnance-medicine-row" key={`create-medicine-row-${index}`}>
                      <label htmlFor={`create-medicine-name-${index}`}>
                        <span>Nom du medicament</span>
                        <input
                          id={`create-medicine-name-${index}`}
                          onChange={(event) => updateCreateMedicineRow(index, 'medicine', event.target.value)}
                          placeholder="Ex: Amoxicilline"
                          type="text"
                          value={item.medicine}
                        />
                      </label>

                      <label htmlFor={`create-medicine-dose-${index}`}>
                        <span>Dosage</span>
                        <input
                          id={`create-medicine-dose-${index}`}
                          onChange={(event) => updateCreateMedicineRow(index, 'dosage', event.target.value)}
                          placeholder="Ex: 500mg"
                          type="text"
                          value={item.dosage}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </section>

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

      {isUpdateModalOpen && selectedOrdonnance && (
        <div className="modal-overlay" onClick={closeUpdateModal} role="presentation">
          <section
            aria-modal="true"
            className="modal-card patient-form-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header className="modal-card__header">
              <h2>Modifier ordonnance</h2>
              <div className="modal-card__header-actions">
                <button
                  className="button button--ghost modal-card__header-button"
                  disabled={isPrinting}
                  onClick={() => { void handlePrint(selectedOrdonnance) }}
                  type="button"
                >
                  <PrintIcon />
                  {isPrinting ? 'Impression...' : 'Imprimer'}
                </button>
              </div>
            </header>

            <p className="modal-card__description">Patient: {getPatientLabel(selectedOrdonnance.patientId)}</p>

            <form className="editor-grid" onSubmit={handleUpdate}>
              <label className="form-label" htmlFor="updateOrdonnanceDiagnostic">
                <span>Diagnostic *</span>
                <textarea
                  id="updateOrdonnanceDiagnostic"
                  onChange={(event) => setUpdateDiagnostic(event.target.value)}
                  required
                  rows={4}
                  value={updateDiagnostic}
                />
              </label>

              <section className="ordonnance-medicines">
                <header className="ordonnance-medicines__header">
                  <h3>Medicaments</h3>
                  <button className="button button--ghost ordonnance-medicines__add" onClick={addUpdateMedicineRow} type="button">
                    +
                    Ajouter
                  </button>
                </header>

                <div className="ordonnance-medicines__list">
                  {updateMedicines.map((item, index) => (
                    <div className="ordonnance-medicine-row" key={`update-medicine-row-${index}`}>
                      <label htmlFor={`update-medicine-name-${index}`}>
                        <span>Nom du medicament</span>
                        <input
                          id={`update-medicine-name-${index}`}
                          onChange={(event) => updateUpdateMedicineRow(index, 'medicine', event.target.value)}
                          type="text"
                          value={item.medicine}
                        />
                      </label>

                      <label htmlFor={`update-medicine-dose-${index}`}>
                        <span>Dosage</span>
                        <input
                          id={`update-medicine-dose-${index}`}
                          onChange={(event) => updateUpdateMedicineRow(index, 'dosage', event.target.value)}
                          type="text"
                          value={item.dosage}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </section>

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
