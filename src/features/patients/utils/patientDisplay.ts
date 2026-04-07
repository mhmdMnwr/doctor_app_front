import type { Patient } from '../types/patients.types'

export const getPatientDisplayName = (patient: Patient): string => {
  return `${patient.name} ${patient.familyName}`.trim()
}

export const getPatientAgeLabel = (birthdate: string): string => {
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
