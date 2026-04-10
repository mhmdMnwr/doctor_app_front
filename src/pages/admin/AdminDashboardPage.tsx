import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

import { adminApi } from '../../features/admin/api/adminApi'
import type {
  AdminProfile,
  DoctorAccountInfo,
  UpdateAdminProfileRequest,
} from '../../features/admin/types/admin.types'
import { AnalysesSection } from '../../features/analyses/components/AnalysesSection.tsx'
import { authApi } from '../../features/auth/api/authApi'
import { ChatbotSection } from '../../features/chatbot/components/ChatbotSection'
import { CertificatsSection } from '../../features/certificats/components/CertificatsSection'
import { DrugExplorerSection } from '../../features/drugs/components/DrugExplorerSection'
import { ExcelExportSection } from '../../features/excel/components/ExcelExportSection'
import { OrdonnancesSection } from '../../features/ordonnances/components/OrdonnancesSection'
import { PatientsSection } from '../../features/patients/components/PatientsSection.tsx'
import { PatientRecordPage } from '../../features/patients/components/PatientRecordPage.tsx'
import type { Patient } from '../../features/patients/types/patients.types'
import { SessionExpiredError } from '../../shared/services/httpClient'
import type { DoctorPrintInfo } from '../../shared/utils/medicalPrint'
import { getErrorMessage } from '../../shared/utils/error'

type PortalSection =
  | 'patients'
  | 'ordonnances'
  | 'certificats'
  | 'analyses'
  | 'recherche-medicaments'
  | 'chatbot'
  | 'excel'
  | 'settings'

interface PortalNavItem {
  key: PortalSection
  label: string
  icon: () => ReactNode
  isBottom?: boolean
}

interface ProfileFormValues {
  username: string
  phoneNumber: string
  address: string
}

interface PasswordFormValues {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

interface AdminDashboardPageProps {
  onSessionEnded: (message: string) => void
}

const ENABLE_OPTIONAL_SECTIONS = {
  drugs: false,
  chatbot: false,
} as const

const EMPTY_PROFILE_FORM: ProfileFormValues = {
  username: '',
  phoneNumber: '',
  address: '',
}

const EMPTY_PASSWORD_FORM: PasswordFormValues = {
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
}

const DRUGS_NAV_ITEM: PortalNavItem = {
  key: 'recherche-medicaments',
  label: 'Recherche medicaments',
  icon: SearchDrugIcon,
}

const CHATBOT_NAV_ITEM: PortalNavItem = {
  key: 'chatbot',
  label: 'Chatbot',
  icon: ChatbotIcon,
}

const NAV_ITEMS: PortalNavItem[] = [
  { key: 'patients', label: 'Patients', icon: PatientsIcon },
  { key: 'ordonnances', label: 'Ordonnances', icon: PrescriptionIcon },
  { key: 'certificats', label: 'Certificats', icon: CalendarIcon },
  { key: 'analyses', label: 'Analyses', icon: FlaskIcon },
  ...(ENABLE_OPTIONAL_SECTIONS.drugs ? [DRUGS_NAV_ITEM] : []),
  ...(ENABLE_OPTIONAL_SECTIONS.chatbot ? [CHATBOT_NAV_ITEM] : []),
  { key: 'excel', label: 'Excel', icon: SheetIcon },
  { key: 'settings', label: 'Parametres', icon: GearIcon, isBottom: true },
]

const toProfileFormValues = (profile: AdminProfile): ProfileFormValues => ({
  username: profile.username || '',
  phoneNumber: profile.phoneNumber || '',
  address: profile.address || '',
})

const toDoctorPrintInfo = (doctor: DoctorAccountInfo): DoctorPrintInfo => ({
  name: doctor.name || '',
  phoneNumber: doctor.phoneNumber || '',
  address: doctor.address || '',
})

const toProfilePayload = (
  values: ProfileFormValues,
  profile: AdminProfile,
): UpdateAdminProfileRequest => {
  const payload: UpdateAdminProfileRequest = {}
  const normalizedUsername = values.username.trim()
  const currentUsername = (profile.username || '').trim()

  if (normalizedUsername !== currentUsername) {
    payload.username = normalizedUsername
  }

  if (values.phoneNumber !== profile.phoneNumber) {
    payload.phoneNumber = values.phoneNumber
  }

  if (values.address !== profile.address) {
    payload.address = values.address
  }

  return payload
}

export function AdminDashboardPage({ onSessionEnded }: AdminDashboardPageProps) {
  const [activeSection, setActiveSection] = useState<PortalSection>('patients')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [isPatientRecordsPageOpen, setIsPatientRecordsPageOpen] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [profileFormValues, setProfileFormValues] = useState<ProfileFormValues>(EMPTY_PROFILE_FORM)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [profileErrorMessage, setProfileErrorMessage] = useState<string | null>(null)
  const [profileSuccessMessage, setProfileSuccessMessage] = useState<string | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [passwordFormValues, setPasswordFormValues] = useState<PasswordFormValues>(EMPTY_PASSWORD_FORM)
  const [passwordErrorMessage, setPasswordErrorMessage] = useState<string | null>(null)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [doctorPrintInfo, setDoctorPrintInfo] = useState<DoctorPrintInfo | null>(null)

  const loadDoctorPrintInfo = useCallback(async () => {
    try {
      const response = await adminApi.getDoctorName()
      setDoctorPrintInfo(toDoctorPrintInfo(response))
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        onSessionEnded(error.message)
        return
      }
    }
  }, [onSessionEnded])

  const loadProfile = useCallback(async () => {
    setIsLoadingProfile(true)
    setProfileErrorMessage(null)

    try {
      const response = await adminApi.getProfile()
      setProfile(response)
      setProfileFormValues(toProfileFormValues(response))
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        onSessionEnded(error.message)
        return
      }

      setProfileErrorMessage(getErrorMessage(error, 'Impossible de charger les donnees du profil.'))
    } finally {
      setIsLoadingProfile(false)
    }
  }, [onSessionEnded])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  useEffect(() => {
    void loadDoctorPrintInfo()
  }, [loadDoctorPrintInfo])

  const handleSectionChange = (section: PortalSection) => {
    setActiveSection(section)
    setIsPatientRecordsPageOpen(false)
    setIsDrawerOpen(false)
    setProfileErrorMessage(null)
    setProfileSuccessMessage(null)
  }

  const handlePatientSelected = (patient: Patient | null) => {
    setSelectedPatient(patient)
  }

  const handleOpenPatientRecords = (patient: Patient) => {
    setSelectedPatient(patient)
    setActiveSection('patients')
    setIsPatientRecordsPageOpen(true)
    setIsDrawerOpen(false)
  }

  const handleLogout = () => {
    authApi.logout()
    setIsDrawerOpen(false)
    onSessionEnded('Vous avez ete deconnecte.')
  }

  const updateProfileField = (field: keyof ProfileFormValues, value: string) => {
    setProfileFormValues((previousValues) => ({
      ...previousValues,
      [field]: value,
    }))
  }

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!profile) {
      return
    }

    if (!profileFormValues.username.trim()) {
      setProfileErrorMessage('Le nom complet est obligatoire.')
      setProfileSuccessMessage(null)
      return
    }

    const payload = toProfilePayload(profileFormValues, profile)

    if (Object.keys(payload).length === 0) {
      setProfileSuccessMessage('Aucune modification detectee.')
      setProfileErrorMessage(null)
      return
    }

    setIsSavingProfile(true)
    setProfileErrorMessage(null)
    setProfileSuccessMessage(null)

    try {
      const response = await adminApi.updateProfile(payload)
      setProfile(response.data)
      setProfileFormValues(toProfileFormValues(response.data))
      setProfileSuccessMessage('Profil mis a jour avec succes.')
      void loadDoctorPrintInfo()
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        onSessionEnded(error.message)
        return
      }

      setProfileErrorMessage(getErrorMessage(error, 'La mise a jour du profil a echoue.'))
    } finally {
      setIsSavingProfile(false)
    }
  }

  const openPasswordModal = () => {
    setPasswordErrorMessage(null)
    setPasswordFormValues(EMPTY_PASSWORD_FORM)
    setIsPasswordModalOpen(true)
  }

  const closePasswordModal = () => {
    setPasswordErrorMessage(null)
    setPasswordFormValues(EMPTY_PASSWORD_FORM)
    setIsPasswordModalOpen(false)
  }

  const updatePasswordField = (field: keyof PasswordFormValues, value: string) => {
    setPasswordFormValues((previousValues) => ({
      ...previousValues,
      [field]: value,
    }))
  }

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (passwordFormValues.newPassword !== passwordFormValues.confirmPassword) {
      setPasswordErrorMessage('Le nouveau mot de passe et sa confirmation doivent etre identiques.')
      return
    }

    setIsChangingPassword(true)
    setPasswordErrorMessage(null)

    try {
      const response = await authApi.changePassword({
        oldPassword: passwordFormValues.oldPassword,
        newPassword: passwordFormValues.newPassword,
      })

      onSessionEnded(`${response.message} Veuillez vous reconnecter.`)
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        onSessionEnded(error.message)
        return
      }

      setPasswordErrorMessage(getErrorMessage(error, 'Impossible de modifier le mot de passe.'))
    } finally {
      setIsChangingPassword(false)
    }
  }

  const renderSettingsSection = () => {
    return (
      <>
        <header className="portal-page__header portal-page__header--stacked">
          <div>
            <h1>Mon Profil</h1>
            <p>Gerez vos informations personnelles et votre securite.</p>
          </div>
        </header>

        {isLoadingProfile && <p className="status status--info">Chargement du profil...</p>}
        {profileErrorMessage && <p className="status status--error">{profileErrorMessage}</p>}
        {profileSuccessMessage && <p className="status status--success">{profileSuccessMessage}</p>}

        <form className="panel settings-card" onSubmit={handleProfileSubmit}>
          <div className="settings-card__header">
            <h2>Informations Personnelles</h2>
            <p>Mettez a jour votre nom, numero de telephone et adresse.</p>
          </div>

          <label className="settings-field" htmlFor="settingsName">
            <span className="settings-field__label">Nom complet *</span>
            <input
              className="settings-input"
              id="settingsName"
              onChange={(event) => updateProfileField('username', event.target.value)}
              required
              type="text"
              value={profileFormValues.username}
            />
          </label>

          <label className="settings-field" htmlFor="settingsPhone">
            <span className="settings-field__label">Numero de telephone</span>
            <div className="settings-input-wrap">
              <span className="settings-input-icon">
                <PhoneIcon />
              </span>
              <input
                className="settings-input settings-input--with-icon"
                id="settingsPhone"
                onChange={(event) => updateProfileField('phoneNumber', event.target.value)}
                placeholder="+33 6 12 34 56 78"
                type="text"
                value={profileFormValues.phoneNumber}
              />
            </div>
          </label>

          <label className="settings-field" htmlFor="settingsAddress">
            <span className="settings-field__label">Adresse</span>
            <div className="settings-textarea-wrap">
              <span className="settings-input-icon settings-input-icon--textarea">
                <LocationIcon />
              </span>
              <textarea
                className="settings-textarea"
                id="settingsAddress"
                onChange={(event) => updateProfileField('address', event.target.value)}
                placeholder="123 Rue de la Sante\n75013 Paris, France"
                rows={3}
                value={profileFormValues.address}
              />
            </div>
          </label>

          <div className="settings-actions">
            <button className="button button--ghost" onClick={openPasswordModal} type="button">
              Changer le mot de passe
            </button>
            <button className="button button--primary" disabled={isSavingProfile} type="submit">
              {isSavingProfile ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </>
    )
  }

  const renderExcelSection = () => {
    return <ExcelExportSection />
  }

  const renderActiveSection = () => {
    if (isPatientRecordsPageOpen && selectedPatient) {
      return (
        <PatientRecordPage
          doctorInfo={doctorPrintInfo}
          onPatientUpdated={(patient) => setSelectedPatient(patient)}
          patient={selectedPatient}
        />
      )
    }

    if (activeSection === 'patients') {
      return (
        <PatientsSection
          onOpenPatientRecords={handleOpenPatientRecords}
          onPatientSelected={handlePatientSelected}
          selectedPatientId={selectedPatient?._id ?? null}
        />
      )
    }

    if (activeSection === 'certificats') {
      return <CertificatsSection doctorInfo={doctorPrintInfo} />
    }

    if (activeSection === 'ordonnances') {
      return <OrdonnancesSection doctorInfo={doctorPrintInfo} />
    }

    if (activeSection === 'analyses') {
      return <AnalysesSection doctorInfo={doctorPrintInfo} />
    }

    if (ENABLE_OPTIONAL_SECTIONS.drugs && activeSection === 'recherche-medicaments') {
      return <DrugExplorerSection />
    }

    if (ENABLE_OPTIONAL_SECTIONS.chatbot && activeSection === 'chatbot') {
      return <ChatbotSection />
    }

    if (activeSection === 'settings') {
      return renderSettingsSection()
    }

    return renderExcelSection()
  }

  return (
    <main className="portal-shell">
      {isDrawerOpen && <button aria-label="Fermer le menu" className="drawer-backdrop" onClick={() => setIsDrawerOpen(false)} type="button" />}

      <aside className={`portal-sidebar ${isDrawerOpen ? 'is-open' : ''}`}>
        <header className="portal-sidebar__brand">
          <span className="portal-sidebar__logo">
            <BrandIcon />
          </span>
          <span>
            <strong>gestion des patients</strong>
            <small>Portail medical</small>
          </span>
        </header>

        <nav aria-label="Menu principal" className="portal-sidebar__menu">
          {NAV_ITEMS.filter((item) => !item.isBottom).map((item) => (
            <button
              className={`portal-nav-item ${activeSection === item.key && !isPatientRecordsPageOpen ? 'is-active' : ''}`}
              key={item.key}
              onClick={() => handleSectionChange(item.key)}
              type="button"
            >
              <item.icon />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="portal-sidebar__bottom">
          {NAV_ITEMS.filter((item) => item.isBottom).map((item) => (
            <button
              className={`portal-nav-item ${activeSection === item.key ? 'is-active' : ''}`}
              key={item.key}
              onClick={() => handleSectionChange(item.key)}
              type="button"
            >
              <item.icon />
              {item.label}
            </button>
          ))}

          <button className="portal-nav-item portal-nav-item--logout" onClick={handleLogout} type="button">
            <LogoutIcon />
            Deconnexion
          </button>
        </div>
      </aside>

      <button
        aria-label="Ouvrir le menu"
        className="drawer-toggle"
        onClick={() => setIsDrawerOpen((previousValue) => !previousValue)}
        type="button"
      >
        <MenuIcon />
      </button>

      <section
        className={`portal-content ${ENABLE_OPTIONAL_SECTIONS.chatbot && activeSection === 'chatbot' ? 'portal-content--chat' : ''}`}
      >
        {renderActiveSection()}
      </section>

      {isPasswordModalOpen && (
        <div className="modal-overlay" onClick={closePasswordModal} role="presentation">
          <section
            aria-labelledby="change-password-title"
            aria-modal="true"
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header className="modal-card__header">
              <h2 id="change-password-title">Changer le mot de passe</h2>
              <button aria-label="Fermer" className="modal-card__close" onClick={closePasswordModal} type="button">
                x
              </button>
            </header>

            <p className="modal-card__description">
              Pour proteger les donnees des patients, votre session sera fermee apres modification.
            </p>

            <form className="modal-card__form" onSubmit={handlePasswordSubmit}>
              <label className="settings-field" htmlFor="oldPassword">
                <span className="settings-field__label">Mot de passe actuel</span>
                <input
                  className="settings-input"
                  id="oldPassword"
                  onChange={(event) => updatePasswordField('oldPassword', event.target.value)}
                  required
                  type="password"
                  value={passwordFormValues.oldPassword}
                />
              </label>

              <label className="settings-field" htmlFor="newPassword">
                <span className="settings-field__label">Nouveau mot de passe</span>
                <input
                  className="settings-input"
                  id="newPassword"
                  minLength={6}
                  onChange={(event) => updatePasswordField('newPassword', event.target.value)}
                  required
                  type="password"
                  value={passwordFormValues.newPassword}
                />
              </label>

              <label className="settings-field" htmlFor="confirmPassword">
                <span className="settings-field__label">Confirmer le nouveau mot de passe</span>
                <input
                  className="settings-input"
                  id="confirmPassword"
                  minLength={6}
                  onChange={(event) => updatePasswordField('confirmPassword', event.target.value)}
                  required
                  type="password"
                  value={passwordFormValues.confirmPassword}
                />
              </label>

              {passwordErrorMessage && <p className="status status--error">{passwordErrorMessage}</p>}

              <div className="modal-card__actions">
                <button className="button button--ghost" onClick={closePasswordModal} type="button">
                  Annuler
                </button>
                <button className="button button--primary" disabled={isChangingPassword} type="submit">
                  {isChangingPassword ? 'Mise a jour...' : 'Confirmer'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}

function MenuIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 6h16v2H4Zm0 5h16v2H4Zm0 5h16v2H4Z" fill="currentColor" />
    </svg>
  )
}

function PatientsIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M9 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm0 2c-2.67 0-5 1.29-5 3v1h10v-1c0-1.71-2.33-3-5-3Zm8-2a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm0 2c-.93 0-1.81.16-2.57.46A4.5 4.5 0 0 1 16 16v1h5v-1c0-1.71-1.79-3-4-3Z"
        fill="currentColor"
      />
    </svg>
  )
}

function PrescriptionIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M7 3h8l4 4v14H7Zm8 2.5V8h2.5Zm-6 6h8v2H9Zm0 4h8v2H9Zm0-8h4v2H9Z"
        fill="currentColor"
      />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M7 2h2v2h6V2h2v2h3v18H4V4Zm11 8H6v10h12Zm0-4H6v2h12Z"
        fill="currentColor"
      />
    </svg>
  )
}

function FlaskIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M9 2h6v2h-1v5.2l4.9 8.4A2.4 2.4 0 0 1 16.82 21H7.18a2.4 2.4 0 0 1-2.08-3.4L10 9.2V4H9Zm2.3 8L7.2 17h9.6l-4.1-7Z"
        fill="currentColor"
      />
    </svg>
  )
}

function SearchDrugIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M11 4a7 7 0 1 1-4.95 11.95A7 7 0 0 1 11 4Zm0-2a9 9 0 1 0 5.93 15.77l4.65 4.65 1.42-1.42-4.65-4.65A9 9 0 0 0 11 2Z"
        fill="currentColor"
      />
      <path d="M10 7h2v3h3v2h-3v3h-2v-3H7v-2h3Z" fill="currentColor" />
    </svg>
  )
}

function SheetIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M7 3h8l4 4v14H7Zm8 2.5V8h2.5ZM9 11h8v2H9Zm0 4h8v2H9Zm0-8h4v2H9Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ChatbotIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M11 2h2v2h3a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-1.2l-1.5 3h-2.6l-1.5-3H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4h3Zm5 8a1.25 1.25 0 1 0-1.25-1.25A1.25 1.25 0 0 0 16 10Zm-8 0a1.25 1.25 0 1 0-1.25-1.25A1.25 1.25 0 0 0 8 10Zm1 4h6v-2H9Z"
        fill="currentColor"
      />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="m19.14 12.94.04-.94-.04-.94 2.03-1.58-1.93-3.34-2.45.99a7.9 7.9 0 0 0-1.63-.95L14.8 3h-3.6l-.36 2.18c-.58.2-1.13.52-1.63.95l-2.45-.99-1.93 3.34 2.03 1.58-.04.94.04.94-2.03 1.58 1.93 3.34 2.45-.99c.5.43 1.05.75 1.63.95l.36 2.18h3.6l.36-2.18c.58-.2 1.13-.52 1.63-.95l2.45.99 1.93-3.34ZM12 15a3 3 0 1 1 3-3 3 3 0 0 1-3 3Z"
        fill="currentColor"
      />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M10 17v-2h6V9h-6V7h8v10Zm-6 2V5h8v2H6v10h6v2Zm9-5 4-4-4-4v3H7v2h6Z" fill="currentColor" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="m6.6 10.8 2.3-.26a1 1 0 0 1 1 .57l1.05 2.1a1 1 0 0 1-.24 1.2l-1.28 1.28a14 14 0 0 0 6.08 6.08l1.28-1.28a1 1 0 0 1 1.2-.24l2.1 1.05a1 1 0 0 1 .57 1l-.26 2.3a1 1 0 0 1-1 .88A18.8 18.8 0 0 1 2.92 8.2a1 1 0 0 1 .88-1Z"
        fill="currentColor"
      />
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M12 2a7 7 0 0 0-7 7c0 5.23 7 13 7 13s7-7.77 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

function BrandIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M15 3v4a3 3 0 0 1-6 0V3H7v4a5 5 0 0 0 10 0V3Z"
        fill="currentColor"
      />
      <path
        d="M18 12a3 3 0 1 0 3 3 3 3 0 0 0-3-3Zm0 4a1 1 0 1 1 1-1 1 1 0 0 1-1 1Z"
        fill="currentColor"
      />
      <path
        d="M11 12h2v1.5A4.5 4.5 0 0 0 17.5 18H18v2h-.5A6.5 6.5 0 0 1 11 13.5Z"
        fill="currentColor"
      />
    </svg>
  )
}
