import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  leadingIcon?: ReactNode
}

export function InputField({ id, label, leadingIcon, className, ...inputProps }: InputFieldProps) {
  const inputClasses = ['field__input']

  if (leadingIcon) {
    inputClasses.push('field__input--with-icon')
  }

  if (className) {
    inputClasses.push(className)
  }

  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">{label}</span>
      <div className="field__control">
        {leadingIcon && <span aria-hidden="true" className="field__icon">{leadingIcon}</span>}
        <input className={inputClasses.join(' ')} id={id} {...inputProps} />
      </div>
    </label>
  )
}
