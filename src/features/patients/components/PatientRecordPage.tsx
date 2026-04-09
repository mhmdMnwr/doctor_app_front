import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import { AnalysesSection } from '../../analyses/components/AnalysesSection.tsx'
import { CertificatsSection } from '../../certificats/components/CertificatsSection'
import { OrdonnancesSection } from '../../ordonnances/components/OrdonnancesSection'
import { getErrorMessage } from '../../../shared/utils/error'
import type { DoctorPrintInfo } from '../../../shared/utils/medicalPrint'
import { patientsApi } from '../api/patientsApi'
import type { Patient } from '../types/patients.types'
import { getPatientAgeLabel } from '../utils/patientDisplay'

type RecordTab = 'ordonnances' | 'certificats' | 'analyses'

interface PatientFormValues {
  name: string
  familyName: string
  birthdate: string
  phoneNumber: string
  comment: string
}

interface PatientRecordPageProps {
  patient: Patient
  onPatientUpdated: (patient: Patient) => void
  doctorInfo?: DoctorPrintInfo | null
}

const toFormValues = (patient: Patient): PatientFormValues => ({
  name: patient.name || '',
  familyName: patient.familyName || '',
  birthdate: patient.birthdate || '',
  phoneNumber: patient.phoneNumber || '',
  comment: patient.comment || '',
})

export function PatientRecordPage({
  patient,
  onPatientUpdated,
  doctorInfo = null,
}: PatientRecordPageProps) {
  const [activeTab, setActiveTab] = useState<RecordTab>('ordonnances')
  const [formValues, setFormValues] = useState<PatientFormValues>(() => toFormValues(patient))
  const [patientErrorMessage, setPatientErrorMessage] = useState<string | null>(null)
  const [patientSuccessMessage, setPatientSuccessMessage] = useState<string | null>(null)
  const [isSavingPatient, setIsSavingPatient] = useState(false)

  useEffect(() => {
    setFormValues(toFormValues(patient))
    setPatientErrorMessage(null)
    setPatientSuccessMessage(null)
  }, [patient])

  const updateField = (field: keyof PatientFormValues, value: string) => {
    setFormValues((previousValues) => ({
      ...previousValues,
      [field]: value,
    }))
  }

  const handlePatientSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const payload = {
      name: formValues.name.trim(),
      familyName: formValues.familyName.trim(),
      birthdate: formValues.birthdate,
      phoneNumber: formValues.phoneNumber.trim() || undefined,
      comment: formValues.comment.trim() || undefined,
    }

    if (!payload.name || !payload.familyName || !payload.birthdate) {
      setPatientErrorMessage('Nom, prenom et date de naissance sont obligatoires.')
      setPatientSuccessMessage(null)
      return
    }

    setIsSavingPatient(true)
    setPatientErrorMessage(null)
    setPatientSuccessMessage(null)

    try {
      const updatedPatient = await patientsApi.updatePatient(patient._id, {
        name: payload.name,
        familyName: payload.familyName,
        birthdate: payload.birthdate,
        phoneNumber: payload.phoneNumber,
        comment: payload.comment,
      })

      onPatientUpdated(updatedPatient)
      setFormValues(toFormValues(updatedPatient))
      setPatientSuccessMessage('Informations patient mises a jour avec succes.')
    } catch (error) {
      setPatientErrorMessage(getErrorMessage(error, 'Impossible de mettre a jour les informations du patient.'))
    } finally {
      setIsSavingPatient(false)
    }
  }

  const patientAgeLabel = getPatientAgeLabel(formValues.birthdate || patient.birthdate)

  return (
    <section className="records-page">
      <section className="panel patient-summary-card">
        <div className="patient-summary-card__identity">
          <p>
            {patientAgeLabel} {formValues.phoneNumber ? `- ${formValues.phoneNumber}` : ''}
          </p>
        </div>

        <form className="patient-summary-card__form" onSubmit={handlePatientSubmit}>
          <div className="patient-summary-card__grid">
            <label className="form-label" htmlFor="patientName">
              <span>Nom</span>
              <input
                className="field__input"
                id="patientName"
                onChange={(event) => updateField('name', event.target.value)}
                required
                type="text"
                value={formValues.name}
              />
            </label>

            <label className="form-label" htmlFor="patientFamilyName">
              <span>Prenom</span>
              <input
                className="field__input"
                id="patientFamilyName"
                onChange={(event) => updateField('familyName', event.target.value)}
                required
                type="text"
                value={formValues.familyName}
              />
            </label>

            <label className="form-label" htmlFor="patientBirthdate">
              <span>Date de naissance</span>
              <input
                className="field__input"
                id="patientBirthdate"
                onChange={(event) => updateField('birthdate', event.target.value)}
                required
                type="date"
                value={formValues.birthdate}
              />
            </label>

            <label className="form-label" htmlFor="patientPhoneNumber">
              <span>Telephone</span>
              <input
                className="field__input"
                id="patientPhoneNumber"
                onChange={(event) => updateField('phoneNumber', event.target.value)}
                placeholder="Numero de telephone"
                type="text"
                value={formValues.phoneNumber}
              />
            </label>
          </div>

          <label className="form-label" htmlFor="patientDoctorComment">
            <span>Commentaire du docteur</span>
            <textarea
              className="field__input field__input--textarea"
              id="patientDoctorComment"
              onChange={(event) => updateField('comment', event.target.value)}
              placeholder="Ajouter un commentaire clinique..."
              rows={3}
              value={formValues.comment}
            />
          </label>

          {patientErrorMessage && <p className="status status--error">{patientErrorMessage}</p>}
          {patientSuccessMessage && <p className="status status--success">{patientSuccessMessage}</p>}

          <div className="patient-summary-card__actions">
            <button
              className="button button--ghost"
              disabled={isSavingPatient}
              onClick={() => setFormValues(toFormValues(patient))}
              type="button"
            >
              Annuler
            </button>
            <button className="button button--primary" disabled={isSavingPatient} type="submit">
              {isSavingPatient ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </section>

      <nav className="records-tabs" aria-label="Dossiers medicaux">
        <button
          className={`records-tab ${activeTab === 'ordonnances' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('ordonnances')}
          type="button"
        >
          Ordonnances
        </button>
        <button
          className={`records-tab ${activeTab === 'certificats' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('certificats')}
          type="button"
        >
          Certificats
        </button>
        <button
          className={`records-tab ${activeTab === 'analyses' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('analyses')}
          type="button"
        >
          Analyses
        </button>
      </nav>

      {activeTab === 'ordonnances' && (
        <OrdonnancesSection
          doctorInfo={doctorInfo}
          enableCreation={false}
          patientContext={patient}
          patientId={patient._id}
        />
      )}

      {activeTab === 'certificats' && (
        <CertificatsSection
          doctorInfo={doctorInfo}
          enableCreation={false}
          patientContext={patient}
          patientId={patient._id}
        />
      )}

      {activeTab === 'analyses' && (
        <AnalysesSection
          doctorInfo={doctorInfo}
          enableCreation={false}
          patientContext={patient}
          patientId={patient._id}
        />
      )}
    </section>
  )
}
