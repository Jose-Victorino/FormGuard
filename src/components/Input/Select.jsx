import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react'
import cn from 'classnames'

import s from './Select.module.scss'

const caretDown = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M300.3 440.8C312.9 451 331.4 450.3 343.1 438.6L471.1 310.6C480.3 301.4 483 287.7 478 275.7C473 263.7 461.4 256 448.5 256L192.5 256C179.6 256 167.9 263.8 162.9 275.8C157.9 287.8 160.7 301.5 169.9 310.6L297.9 438.6L300.3 440.8z"/></svg>

function Select({ name, value = '', options, onChange = (e) => {}, onBlur = (e) => {}, className = '', span = false, ...rest }){
  const [mode, setMode] = useState('idle')
  const inputRef = useRef(null)
  const sizerRef = useRef(null)

  const isOpen = mode !== 'idle'

  const entries = Object.entries(options)

  const inputValue = options?.[value] || value

  const filteredOptions = useMemo(() => {
    if(mode !== 'typing') return entries

    return entries.filter(([, v]) => v.toLowerCase().includes(inputValue.toLowerCase()))
  }, [entries, mode, inputValue])

  const getTextWidth = (text) => {
    if(!sizerRef.current) return 0

    sizerRef.current.textContent = text
    return sizerRef.current.getBoundingClientRect().width
  }

  useLayoutEffect(() => {
    if(!inputRef.current || !sizerRef.current) return

    const widestOption = Object.values(options).reduce((best, label) => {
      return getTextWidth(label) > getTextWidth(best) ? label : best
    }, '')
  
    sizerRef.current.textContent = widestOption
    inputRef.current.style.minWidth = `${sizerRef.current.offsetWidth}px`
  
    if(!span)
      inputRef.current.style.width = 0
  }, [options])

  useEffect(() => {
    if(!isOpen) return
    const handleClickOutside = (e) => {
      if(!inputRef.current?.contains(e.target))
        setMode('idle')
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isOpen])

  const handleFocus = () => {
    setMode('open')
  }

  const handleChange = (e) => {
    onChange(e)
    setMode('typing')
  }

  const handleBlur = (e) => {
    onBlur(e)
    setMode('idle')
  }

  const handleOptionClick = (val) => {
    onChange({ target: { name, value: val } })
    setMode('idle')
  }

  const handleKeyDown = (e) => {
    if(e.key !== 'Enter') return

    e.preventDefault()

    const match = filteredOptions.find(([, label]) => label.toLowerCase() === inputValue.toLowerCase())

    if(!match) return

    const [key] = match

    handleOptionClick(key)
  }

  return (
    <>
      <div className='flex j-space-between gap-5 w-100'>
        <span
          ref={sizerRef}
          aria-hidden='true'
          style={{
            position: 'absolute',
            visibility: 'hidden',
            whiteSpace: 'pre',
            font: 'inherit',
            letterSpacing: 'inherit',
            padding: 'inherit',
          }}
        />
        <input
          ref={inputRef}
          type='text'
          name={name}
          value={inputValue}
          className={className}
          onFocus={handleFocus}
          onChange={handleChange}
         
          onKeyDown={handleKeyDown}
          {...rest}
          autoComplete='off'
        />
        <div className={cn(s.arrowIcon, 'flex a-center')} aria-hidden='true'>
          {caretDown}
        </div>
      </div>
      {isOpen &&
        <ul className={cn('flex-col gap-5 w-100', s.optionsList)}>
          {filteredOptions.length > 0 ?
            filteredOptions.map(([key, val]) => (
              <li
                key={key}
                role='option'
                className={cn(s.option, { [s.selected]: value === key })}
                onMouseDown={() => handleOptionClick(key)}
              >
                {val}
              </li>
            ))
            : <li className={s.noOptions}>No matching options</li>
          }
        </ul>
      }
    </>
  )
}

export default Select