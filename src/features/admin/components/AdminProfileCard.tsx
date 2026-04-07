import type { AdminProfile } from '../types/admin.types'

interface AdminProfileCardProps {
  profile: AdminProfile
}

const toReadableDate = (rawDate: string): string => {
  const parsedDate = new Date(rawDate)

  if (Number.isNaN(parsedDate.getTime())) {
    return rawDate
  }

  return parsedDate.toLocaleString('fr-FR')
}

export function AdminProfileCard({ profile }: AdminProfileCardProps) {
  return (
    <article className="panel">
      <div className="panel__header">
        <h2>Apercu du profil</h2>
        <p>Profil administrateur recupere depuis l'endpoint GET /admin/me.</p>
      </div>

      <dl className="summary-list">
        <div>
          <dt>ID</dt>
          <dd>{profile._id}</dd>
        </div>
        <div>
          <dt>Nom d'utilisateur</dt>
          <dd>{profile.username || '-'}</dd>
        </div>
        <div>
          <dt>Adresse</dt>
          <dd>{profile.address || '-'}</dd>
        </div>
        <div>
          <dt>Telephone</dt>
          <dd>{profile.phoneNumber || '-'}</dd>
        </div>
        <div>
          <dt>Version du token</dt>
          <dd>{profile.tokenVersion}</dd>
        </div>
        <div>
          <dt>Cree le</dt>
          <dd>{toReadableDate(profile.createdAt)}</dd>
        </div>
        <div>
          <dt>Mis a jour le</dt>
          <dd>{toReadableDate(profile.updatedAt)}</dd>
        </div>
      </dl>
    </article>
  )
}
