import { useId } from 'react'

import { useDrugNameSuggestions } from '../hooks/useDrugNameSuggestions'

interface DrugNameAutocompleteInputProps {
  inputId: string
  value: string
  onValueChange: (nextValue: string) => void
  placeholder?: string
  disabled?: boolean
}

export function DrugNameAutocompleteInput({
  inputId,
  value,
  onValueChange,
  placeholder,
  disabled = false,
}: DrugNameAutocompleteInputProps) {
  const internalId = useId().replace(/:/g, '')
  const listId = `${inputId}-suggestions-${internalId}`
  const { suggestions, isLoading, softMessage } = useDrugNameSuggestions(value, {
    debounceMs: 500,
    minQueryLength: 2,
  })

  return (
    <>
      <input
        autoComplete="off"
        disabled={disabled}
        id={inputId}
        list={listId}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        type="text"
        value={value}
      />

      <datalist id={listId}>
        {suggestions.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>

      {isLoading && value.trim().length >= 2 && (
        <small className="drug-autocomplete__feedback">Recherche...</small>
      )}

      {softMessage && <small className="drug-autocomplete__feedback">{softMessage}</small>}
    </>
  )
}
