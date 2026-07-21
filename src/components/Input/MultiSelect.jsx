import { useState, useEffect, useMemo, useRef } from 'react'
import cn from 'classnames'

import s from './MultiSelect.module.scss'

const caretDown = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M300.3 440.8C312.9 451 331.4 450.3 343.1 438.6L471.1 310.6C480.3 301.4 483 287.7 478 275.7C473 263.7 461.4 256 448.5 256L192.5 256C179.6 256 167.9 263.8 162.9 275.8C157.9 287.8 160.7 301.5 169.9 310.6L297.9 438.6L300.3 440.8z"/></svg>
const closeSvg = <svg aria-hidden width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>

function MultiSelect({ name, value = [], options, onChange, onBlur, className, ...rest }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  const selectedSet = useMemo(() => new Set(value), [value])
  const entries = Object.entries(options)

  const filteredOptions = useMemo(() => {
    if(!searchValue) return entries
    return entries.filter(([, v]) => v.toLowerCase().includes(searchValue.toLowerCase()))
  }, [entries, searchValue])

  
  useEffect(() => {
    if(!isOpen) return
    const handleClickOutside = (e) => {
      if(!containerRef.current?.contains(e.target))
        setIsOpen(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isOpen])
  
  const handleFocus = () => {
    setIsOpen(true)
  }

  const handleChange = (e) => {
    setSearchValue(e.target.value)
  }
  
  const handleBlur = (e) => {
    onBlur(e)
    setIsOpen(false)
  }

  const toggleOption = (val) => {
    const next = selectedSet.has(val)
      ? value.filter((v) => v !== val)
      : [...value, val]
    
    onChange({ target: { name, value: next } })
    inputRef.current.value = ''
    setSearchValue('')
    inputRef.current.focus()
  }
  
  return (
    <div ref={containerRef} className='w-100'>
      <div className='flex gap-5'>
        <div className='flex-wrap gap-5 flex-auto'>
          {value.map((v) =>
            <div key={v} className={cn(s.selectedOption, 'flex a-center')}>
              <span>{options[v] ?? v}</span>
              <button className='flex' onMouseDown={(e) => e.preventDefault()} onClick={() => toggleOption(v)}>
                {closeSvg}
              </button>
            </div>
          )}
          <input
            ref={inputRef}
            name={name}
            className={cn(className, s.searchInput)}
            onFocus={handleFocus}
            onChange={handleChange}
            onBlur={handleBlur}
            {...rest}
            autoComplete='off'
          />
        </div>
        <div className={cn(s.arrowIcon, 'flex a-center')} aria-hidden='true'>
          {caretDown}
        </div>
      </div>
      {isOpen &&
        <div className={s.optionsList}>
          <ul className='flex-col j-space-between gap-5 w-100'>
            {filteredOptions.length > 0 ?
              filteredOptions.map(([key, val]) => {
                const isSelected = selectedSet.has(val)
                return (
                  <li
                    key={key}
                    role='option'
                    className={cn(s.option, {[s.selected]: isSelected})}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggleOption(val)}
                    tabIndex={0}
                    aria-selected={isSelected}
                  >
                    {val}
                  </li>
                )
              })
              : <li className={s.noOptions}>No matching options</li>
            }
          </ul>
        </div>
      }
    </div>
  )
}

export default MultiSelect