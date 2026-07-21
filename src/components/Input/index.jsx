import cn from 'classnames'

import s from './Input.module.scss'

import PasswordInput from './Password'
import SelectInput from './Select'
import MultiselectInput from './MultiSelect'

const RenderInput = (props) => {
  const { type } = props

  if(type === 'select'){
    return <SelectInput {...props} type='text' />
  }
  if(type === 'multiselect'){
    return <MultiselectInput {...props}  type='text' />
  }
  if(type === 'password'){
    return <PasswordInput {...props} />
  }
  if(type === 'textarea'){
    return <textarea {...props}/>
  }

  return <input type={type} {...props} />
}

const hasInputValue = (value) => {
  if(value === null || value === undefined) return false
  if(typeof value === 'string') return value.trim().length > 0
  if(Array.isArray(value)) return value.length > 0
  return true
}
/**
 * @typedef {{
 *  id?: string,
 *  name: string,
 *  placeholder?: string,
 *  required?: boolean,
 *  error?: string | string[],
 *  touched?: boolean,
 *  displayName?: string,
 *  labelOutside?: boolean,
 *  span?: 'true' | 'false',
 * }} CommonProps
 * 
 * @typedef {CommonProps & React.InputHTMLAttributes<HTMLInputElement> & {
 *  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'time' | 'file',
 *  value?: String | Number,
 *  options?: never
 *  onChange?: React.ChangeEventHandler<HTMLInputElement>,
 *  onBlur?: React.FocusEventHandler<HTMLInputElement>,
 * }} NormalInputProps
 * 
 * @typedef {CommonProps & React.InputHTMLAttributes<HTMLTextAreaElement> & {
 *  type: 'textarea',
 *  value?: String | Number,
 *  options?: never
 *  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>,
 *  onBlur?: React.FocusEventHandler<HTMLTextAreaElement>,
 * }} TextAreaProps
 * 
 * @typedef {CommonProps & React.InputHTMLAttributes<HTMLInputElement> & {
 *  type: 'select',
 *  value: string | number,
 *  options: Record<string | number, string>
 * }} SelectProps
 * 
 * @typedef {CommonProps & {
 *  type: 'multiselect',
 *  value: String[],
 *  options: Record<string, string>
 * }} MultiSelectProps
 * 
 * @typedef {NormalInputProps | TextAreaProps | SelectProps | MultiSelectProps} InputProps
 */
/**
 * @param {InputProps} props
 */
function Input(props) {
  const { error, touched = true, id, displayName, placeholder, labelOutside = false, span = 'false', ...rest } = props

  if(['image', 'checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color'].includes(props.type)) return null

  const inputId = id ?? props.name
  const showError = Boolean(error && touched)
  const errorId = showError ? `${inputId}-error` : undefined
  const isFloatingLabelTop = hasInputValue(props.value) || ['date', 'time', 'file'].includes(props.type)

  return (
    <div className={cn('flex-col gap-5', s.inputCont, { [s.toTop]: isFloatingLabelTop, [s.span]: span === 'true' })}>
      <div className='pos-r flex-col'>
        {displayName &&
          <span className={cn(s.textLabel, { [s.labelInside]: !labelOutside})}>
            {displayName}
            {props.required &&
              <span className={s.required} aria-hidden>*</span>
            }
          </span>
        }
        <label htmlFor={props.id} className={s.input}>
          <RenderInput
            {...rest}
            id={inputId}
            placeholder={((labelOutside && displayName) || !displayName) ? placeholder : null}
            className={cn({ [s.error]: showError })}
            aria-invalid={showError}
            aria-describedby={errorId}
          />
        </label>
      </div>
      {showError &&
        <span id={errorId} className={s.errorMsg} role='alert'>
          {error}
        </span>
      }
    </div>
  )
}

export default Input