import { useState } from 'react'

import { ApiError } from '../../../shared/services/httpClient'
import { getErrorMessage } from '../../../shared/utils/error'
import { drugsApi } from '../api/drugsApi'
import { useDrugNameSuggestions } from '../hooks/useDrugNameSuggestions'
import type { DrugDetails } from '../types/drugs.types'

const normalizeDrugName = (value: string): string => value.trim().toLowerCase()

const findDrugDetailsByName = async (name: string): Promise<DrugDetails | null> => {
  const normalizedName = normalizeDrugName(name)

  if (!normalizedName) {
    return null
  }

  try {
    const resolved = await drugsApi.resolveByName(normalizedName)
    return await drugsApi.getDrugById(resolved.id)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null
    }

    throw error
  }
}

export function DrugExplorerSection() {
  const [query, setQuery] = useState('')
  const [activeDrugName, setActiveDrugName] = useState<string | null>(null)
  const [selectedDrug, setSelectedDrug] = useState<DrugDetails | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [detailsErrorMessage, setDetailsErrorMessage] = useState<string | null>(null)

  const {
    suggestions: searchResults,
    isLoading: isSearching,
    softMessage: searchSoftMessage,
  } = useDrugNameSuggestions(query, {
    debounceMs: 500,
    minQueryLength: 2,
  })

  const handleSelectResult = async (name: string) => {
    setActiveDrugName(name)
    setSelectedDrug(null)
    setDetailsErrorMessage(null)
    setIsLoadingDetails(true)

    try {
      const details = await findDrugDetailsByName(name)

      if (!details) {
        setDetailsErrorMessage('Aucun detail disponible pour ce medicament. Essayez un autre nom.')
        return
      }

      setSelectedDrug(details)
    } catch (error) {
      setDetailsErrorMessage(getErrorMessage(error, 'Impossible de charger les details du medicament.'))
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const handleBackToSearch = () => {
    setActiveDrugName(null)
    setSelectedDrug(null)
    setDetailsErrorMessage(null)
  }

  if (activeDrugName) {
    return (
      <section className="records-page">
        <header className="portal-page__header">
          <div>
            <h1>Details medicament</h1>
            <p>{activeDrugName}</p>
          </div>
          <button className="button button--ghost" onClick={handleBackToSearch} type="button">
            Retour a la recherche
          </button>
        </header>

        {detailsErrorMessage && <p className="status status--error">{detailsErrorMessage}</p>}

        <article className="panel drug-details-card">
          {isLoadingDetails && <p className="status status--info">Chargement des details...</p>}

          {!selectedDrug && !isLoadingDetails && (
            <p className="muted-text">Aucun detail disponible pour ce medicament.</p>
          )}

          {selectedDrug && (
            <>
              <div className="drug-details-card__identity">
                <h3>{selectedDrug.name}</h3>
                <p>Nom generique: {selectedDrug.generic_name || '-'}</p>
              </div>

              <div className="drug-details-card__grid">
                <section className="drug-details-card__block">
                  <h4>Usage principal</h4>
                  <p>{selectedDrug.purpose?.trim() || 'Information non disponible.'}</p>
                </section>

                <section className="drug-details-card__block">
                  <h4>Indications et utilisation</h4>
                  <p>{selectedDrug.indications_and_usage?.trim() || 'Information non disponible.'}</p>
                </section>

                <section className="drug-details-card__block">
                  <h4>Avertissements</h4>
                  <p>{selectedDrug.warnings?.trim() || 'Information non disponible.'}</p>
                </section>
              </div>
            </>
          )}
        </article>
      </section>
    )
  }

  return (
    <section className="records-page">
      <header className="portal-page__header portal-page__header--stacked">
        <div>
          <h1>Recherche medicament</h1>
          <p>Recherchez un medicament puis appuyez sur son nom pour ouvrir sa fiche.</p>
        </div>
      </header>

      {searchSoftMessage && <p className="status status--info">{searchSoftMessage}</p>}

      <article className="panel records-panel">
        <label className="drug-toolbar__search" htmlFor="drugExplorerInput">
          <span>Nom du medicament</span>
          <input
            className="field__input"
            id="drugExplorerInput"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex: Acetaminophen"
            type="text"
            value={query}
          />
        </label>

        {isSearching && <p className="status status--info">Recherche en cours...</p>}

        {!isSearching && query.trim().length >= 2 && !searchResults.length && !searchSoftMessage && (
          <p className="muted-text">Aucun medicament trouve.</p>
        )}

        {searchResults.length > 0 && (
          <div className="records-list">
            {searchResults.map((name) => (
              <button
                className="record-item record-item--button"
                key={name}
                onClick={() => {
                  void handleSelectResult(name)
                }}
                type="button"
              >
                <strong>{name}</strong>
              </button>
            ))}
          </div>
        )}
      </article>
    </section>
  )
}
