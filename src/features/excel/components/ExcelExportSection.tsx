import { useState } from 'react'

import { ordonnancesApi } from '../../ordonnances/api/ordonnancesApi'
import type { Ordonnance } from '../../ordonnances/types/ordonnances.types'
import { patientsApi } from '../../patients/api/patientsApi'
import type { Patient } from '../../patients/types/patients.types'
import { getPatientAgeLabel, getPatientDisplayName } from '../../patients/utils/patientDisplay'
import { getErrorMessage } from '../../../shared/utils/error'

type ExportMode = 'today' | 'specific' | 'range' | null

interface ExcelRow {
  Nom: string
  Age: string
  Diagnostic: string
  Date: string
}

const toIsoLocalDate = (value: Date): string => {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

const formatDisplayDate = (value?: string): string => {
  if (!value) {
    return '-'
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString('fr-FR')
}

const buildPatientDirectory = (patients: Patient[]): Record<string, Patient> => {
  return patients.reduce<Record<string, Patient>>((accumulator, patient) => {
    accumulator[patient._id] = patient
    return accumulator
  }, {})
}

const mapOrdonnancesToRows = (
  ordonnances: Ordonnance[],
  patientsDirectory: Record<string, Patient>,
): ExcelRow[] => {
  return ordonnances.map((ordonnance) => {
    const patient = patientsDirectory[ordonnance.patientId]

    return {
      Nom: patient ? getPatientDisplayName(patient) : ordonnance.patientId,
      Age: patient ? getPatientAgeLabel(patient.birthdate) : '-',
      Diagnostic: ordonnance.diagnostic?.trim() || '-',
      Date: formatDisplayDate(ordonnance.createdAt),
    }
  })
}

const downloadWorkbook = async (rows: ExcelRow[], fileName: string): Promise<void> => {
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(rows)

  worksheet['!cols'] = [
    { wch: 30 },
    { wch: 12 },
    { wch: 46 },
    { wch: 16 },
  ]

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ordonnances')
  XLSX.writeFile(workbook, fileName)
}

export function ExcelExportSection() {
  const [specificDate, setSpecificDate] = useState(toIsoLocalDate(new Date()))
  const [rangeStartDate, setRangeStartDate] = useState('')
  const [rangeEndDate, setRangeEndDate] = useState('')
  const [exportMode, setExportMode] = useState<ExportMode>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const runExport = async (fromDate: string, endDate: string, fileName: string, mode: Exclude<ExportMode, null>) => {
    setExportMode(mode)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const [ordonnances, patients] = await Promise.all([
        ordonnancesApi.byDate({
          date: fromDate,
          endDate,
        }),
        patientsApi.getAllPatients(),
      ])

      const rows = mapOrdonnancesToRows(ordonnances, buildPatientDirectory(patients))

      if (!rows.length) {
        setErrorMessage('Aucune ordonnance trouvee pour cette periode.')
        return
      }

      await downloadWorkbook(rows, fileName)
      setSuccessMessage(`${rows.length} ligne(s) exportee(s) vers ${fileName}.`)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'La generation du fichier Excel a echoue.'))
    } finally {
      setExportMode(null)
    }
  }

  const handleExportToday = async () => {
    const today = toIsoLocalDate(new Date())
    await runExport(today, today, `ordonnances_jour_${today}.xlsx`, 'today')
  }

  const handleExportSpecificDay = async () => {
    if (!specificDate) {
      setErrorMessage('Selectionnez une date specifique.')
      setSuccessMessage(null)
      return
    }

    await runExport(
      specificDate,
      specificDate,
      `ordonnances_jour_${specificDate}.xlsx`,
      'specific',
    )
  }

  const handleExportDateRange = async () => {
    if (!rangeStartDate || !rangeEndDate) {
      setErrorMessage('Selectionnez une date de debut et une date de fin.')
      setSuccessMessage(null)
      return
    }

    if (new Date(rangeStartDate) > new Date(rangeEndDate)) {
      setErrorMessage('La date de debut doit etre inferieure ou egale a la date de fin.')
      setSuccessMessage(null)
      return
    }

    await runExport(
      rangeStartDate,
      rangeEndDate,
      `ordonnances_${rangeStartDate}_au_${rangeEndDate}.xlsx`,
      'range',
    )
  }

  const isExporting = exportMode !== null

  return (
    <section className="records-page">
      <header className="portal-page__header portal-page__header--stacked">
        <div>
          <h1>Excel</h1>
          <p>Export des patients ayant des ordonnances.</p>
        </div>
      </header>

      {errorMessage && <p className="status status--error">{errorMessage}</p>}
      {successMessage && <p className="status status--success">{successMessage}</p>}

      <article className="panel excel-card">
        <h2>Export du jour</h2>
        <p>Genere un fichier pour les ordonnances d aujourd hui.</p>
        <button className="button button--primary" disabled={isExporting} onClick={() => void handleExportToday()} type="button">
          {exportMode === 'today' ? 'Generation...' : 'Exporter aujourd hui'}
        </button>
      </article>

      <article className="panel excel-card">
        <h2>Export jour specifique</h2>
        <label className="date-search-field" htmlFor="excelSpecificDate">
          <span>Date</span>
          <input
            className="field__input"
            id="excelSpecificDate"
            onChange={(event) => setSpecificDate(event.target.value)}
            type="date"
            value={specificDate}
          />
        </label>
        <button className="button button--primary" disabled={isExporting} onClick={() => void handleExportSpecificDay()} type="button">
          {exportMode === 'specific' ? 'Generation...' : 'Exporter ce jour'}
        </button>
      </article>

      <article className="panel excel-card">
        <h2>Export plage de dates</h2>
        <div className="date-search-form date-search-form--excel">
          <label className="date-search-field" htmlFor="excelStartDate">
            <span>Date de debut</span>
            <input
              className="field__input"
              id="excelStartDate"
              onChange={(event) => setRangeStartDate(event.target.value)}
              type="date"
              value={rangeStartDate}
            />
          </label>
          <label className="date-search-field" htmlFor="excelEndDate">
            <span>Date de fin</span>
            <input
              className="field__input"
              id="excelEndDate"
              onChange={(event) => setRangeEndDate(event.target.value)}
              type="date"
              value={rangeEndDate}
            />
          </label>
        </div>
        <button className="button button--primary" disabled={isExporting} onClick={() => void handleExportDateRange()} type="button">
          {exportMode === 'range' ? 'Generation...' : 'Exporter la plage'}
        </button>
      </article>
    </section>
  )
}
