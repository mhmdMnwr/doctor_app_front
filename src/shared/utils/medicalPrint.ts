export interface DoctorPrintInfo {
  name: string
  phoneNumber?: string
  address?: string
}

interface PrintPatientInfo {
  name: string
  familyName: string
  birthdate: string
}

interface PrintMedicineInfo {
  medicine: string
  dosage: string
}

export type MedicalDocumentType = 'ordonnance' | 'certificat' | 'analyse'

interface PrintDocumentPayload {
  type: MedicalDocumentType
  doctorInfo?: DoctorPrintInfo | null
  patient: PrintPatientInfo
  createdAt?: string
  diagnostic?: string
  medicines?: PrintMedicineInfo[]
  commentaire?: string
  analyzeNames?: string[]
}

const fallbackDoctor: DoctorPrintInfo = {
  name: 'Nom du docteur',
  phoneNumber: '',
  address: '',
}

const escapeHtml = (value: string): string => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

const withLineBreaks = (value: string): string => {
  return escapeHtml(value).replaceAll('\n', '<br />')
}

const toAge = (birthdate: string): string => {
  const birth = new Date(birthdate)

  if (Number.isNaN(birth.getTime())) {
    return '-'
  }

  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDelta = now.getMonth() - birth.getMonth()

  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.getDate())) {
    age -= 1
  }

  return `${Math.max(age, 0)} ans`
}

const formatDate = (value?: string): string => {
  const source = value ? new Date(value) : new Date()

  if (Number.isNaN(source.getTime())) {
    return '-'
  }

  return source.toLocaleDateString('fr-FR')
}

const toDoctorInfo = (doctorInfo?: DoctorPrintInfo | null): DoctorPrintInfo => {
  if (!doctorInfo) {
    return fallbackDoctor
  }

  return {
    name: doctorInfo.name?.trim() || fallbackDoctor.name,
    phoneNumber: doctorInfo.phoneNumber?.trim() || '',
    address: doctorInfo.address?.trim() || '',
  }
}

const toTitle = (type: MedicalDocumentType): string => {
  if (type === 'certificat') {
    return 'Certificat Medical'
  }

  if (type === 'ordonnance') {
    return 'Ordonnance Medicale'
  }

  return 'Demande d Analyses'
}

const renderOrdonnanceBody = (payload: PrintDocumentPayload): string => {
  const safeDiagnostic = payload.diagnostic?.trim()
    ? withLineBreaks(payload.diagnostic.trim())
    : ''

  const medicines = (payload.medicines || []).filter((item) => {
    return item.medicine.trim() || item.dosage.trim()
  })

  if (!safeDiagnostic && !medicines.length) {
    return '<p class="document-text">-</p>'
  }

  const medicineRows = medicines
    .map((item, index) => {
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.medicine)}</td>
          <td>${escapeHtml(item.dosage)}</td>
        </tr>
      `
    })
    .join('')

  const diagnosticBlock = safeDiagnostic
    ? `<p class="document-text">${safeDiagnostic}</p>`
    : ''

  const medicinesBlock = medicines.length
    ? `
    <table class="medicine-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Medicament</th>
          <th>Posologie</th>
        </tr>
      </thead>
      <tbody>
        ${medicineRows}
      </tbody>
    </table>
  `
    : ''

  return `
    ${diagnosticBlock}
    ${medicinesBlock}
  `
}

const renderCertificatBody = (payload: PrintDocumentPayload): string => {
  const commentaire = payload.commentaire?.trim()

  if (!commentaire) {
    return '<p class="document-text">-</p>'
  }

  return `
    <p class="document-text">${withLineBreaks(commentaire)}</p>
  `
}

const renderAnalyseBody = (payload: PrintDocumentPayload, doctorName: string): string => {
  const names = payload.analyzeNames && payload.analyzeNames.length
    ? payload.analyzeNames
    : ['Aucune analyse renseignee']

  const listItems = names
    .map((name) => `<li>${escapeHtml(name)}</li>`)
    .join('')

  return `
    <p class="document-text">
      Je sous-signe, Dr. ${escapeHtml(doctorName)}, demande la realisation des analyses suivantes :
    </p>

    <ul class="analysis-list">
      ${listItems}
    </ul>
  `
}

const renderBodyByType = (payload: PrintDocumentPayload, doctorName: string): string => {
  if (payload.type === 'ordonnance') {
    return renderOrdonnanceBody(payload)
  }

  if (payload.type === 'certificat') {
    return renderCertificatBody(payload)
  }

  return renderAnalyseBody(payload, doctorName)
}

const buildMarkup = (payload: PrintDocumentPayload): string => {
  const doctor = toDoctorInfo(payload.doctorInfo)
  const documentDate = formatDate(payload.createdAt)
  const patientLastName = escapeHtml((payload.patient.name || '').toUpperCase())
  const patientFirstName = escapeHtml((payload.patient.familyName || '').toUpperCase())
  const age = escapeHtml(toAge(payload.patient.birthdate))
  const title = toTitle(payload.type)

  return `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      @page {
        size: A5 portrait;
        margin: 0;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        color: #111;
        font-family: 'Times New Roman', Times, serif;
        font-size: 12pt;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .page {
        width: 100%;
        min-height: 210mm;
        padding: 10mm;
        display: flex;
        flex-direction: column;
      }

      .header {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        align-items: start;
      }

      .doctor-box {
        line-height: 1.3;
      }

      .doctor-box h3 {
        margin: 0 0 4px;
        font-size: 13pt;
        text-transform: uppercase;
      }

      .doctor-box p {
        margin: 2px 0;
      }

      .patient-box {
        line-height: 1.35;
      }

      .cabinet-title {
        display: inline-block;
        border: 1px solid #111;
        padding: 3px 10px;
        margin-bottom: 8px;
        font-weight: 700;
        letter-spacing: 0.5px;
      }

      .patient-line {
        display: grid;
        grid-template-columns: 64px 1fr;
        align-items: center;
        margin: 4px 0;
      }

      .patient-line .value {
        min-height: 18px;
        border-bottom: 1px dotted #222;
        padding: 1px 3px;
      }

      .document-title {
        margin: 22px 0 28px;
        text-align: center;
        font-size: 20pt;
        font-weight: 700;
      }

      .document-body {
        flex: 1;
      }

      .document-text {
        margin: 0 0 12px;
        line-height: 1.9;
        text-align: justify;
      }

      .medicine-table {
        width: 100%;
        margin-top: 12px;
        border-collapse: collapse;
      }

      .medicine-table th,
      .medicine-table td {
        border: 1px solid #222;
        padding: 6px 8px;
        text-align: left;
        vertical-align: top;
      }

      .medicine-table th:first-child,
      .medicine-table td:first-child {
        width: 34px;
        text-align: center;
      }

      .analysis-list {
        margin: 8px 0 0 20px;
        padding: 0;
        line-height: 1.8;
      }

      .signature-zone {
        margin-top: auto;
        padding-top: 24px;
        text-align: right;
      }

      .signature-zone .doctor-sign {
        display: inline-block;
        text-align: center;
        min-width: 180px;
      }

      .signature-zone strong {
        display: block;
        margin-bottom: 4px;
      }

      .signature-zone small {
        display: block;
      }
    </style>
  </head>
  <body>
    <main class="page">
      <header class="header">
        <section class="doctor-box">
          <h3>Dr. ${escapeHtml(doctor.name)}</h3>
          <p>Medecin Generaliste</p>
          <p>${withLineBreaks(doctor.address || '-')}</p>
          <p>Tel : ${escapeHtml(doctor.phoneNumber || '-')}</p>
        </section>

        <section class="patient-box">
          <div class="cabinet-title">CABINET MEDICAL</div>
          <div class="patient-line"><span>Date</span><span class="value">${documentDate}</span></div>
          <div class="patient-line"><span>Nom</span><span class="value">${patientLastName}</span></div>
          <div class="patient-line"><span>Prenom</span><span class="value">${patientFirstName}</span></div>
          <div class="patient-line"><span>Age</span><span class="value">${age}</span></div>
        </section>
      </header>

      <h1 class="document-title">${title}</h1>

      <section class="document-body">
        ${renderBodyByType(payload, doctor.name)}
      </section>

      <footer class="signature-zone">
        <div class="doctor-sign">
          <strong>Dr. ${escapeHtml(doctor.name)}</strong>
          <small>Medecin Generaliste</small>
          <small>${withLineBreaks(doctor.address || '')}</small>
        </div>
      </footer>
    </main>
  </body>
</html>
  `
}

export const printMedicalDocument = (payload: PrintDocumentPayload): void => {
  if (typeof window === 'undefined') {
    return
  }

  const markup = buildMarkup(payload)
  const printFrame = window.document.createElement('iframe')
  printFrame.setAttribute(
    'style',
    'position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: 0; visibility: hidden;',
  )
  printFrame.setAttribute('aria-hidden', 'true')

  window.document.body.appendChild(printFrame)

  const cleanup = () => {
    setTimeout(() => {
      if (printFrame.parentNode) {
        printFrame.parentNode.removeChild(printFrame)
      }
    }, 500)
  }

  const handleLoaded = () => {
    const frameWindow = printFrame.contentWindow

    if (!frameWindow) {
      cleanup()
      throw new Error('Impossible d ouvrir la fenetre d impression.')
    }

    const triggerPrint = () => {
      frameWindow.focus()
      frameWindow.print()
    }

    frameWindow.addEventListener(
      'afterprint',
      () => {
        cleanup()
      },
      { once: true },
    )

    setTimeout(triggerPrint, 80)
  }

  printFrame.addEventListener('load', handleLoaded, { once: true })
  printFrame.srcdoc = markup

  setTimeout(cleanup, 4000)
}
