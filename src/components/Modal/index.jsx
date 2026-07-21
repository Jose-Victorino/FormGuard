import { useEffect, useRef, createContext, useContext, Children, isValidElement } from 'react'
import { createPortal } from 'react-dom'

import s from './Modal.module.scss'

const closeSvg = <svg aria-hidden xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"/></svg>

const ModalContext = createContext(null)

function useModal() {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error('useModal must be used inside Modal')
  return ctx
}

function Header({ children }){
  const { onClose } = useModal()

  return (
    <div className={s.header}>
      {children}
      <button
        className={s.closeButton}
        onClick={() => onClose()}
        title="Close"
        aria-label='Close Modal'
      >
        {closeSvg}
      </button>
    </div>
  )
}

function Footer({ children }){
  return (
    <div className={s.footer}>
      {children}
    </div>
  )
}

function getParts(children){
  const parts = {
    header: null,
    body: [],
    footer: null
  }

  Children.toArray(children).forEach(child => {
    if(!isValidElement(child)){
      parts.body.push(child)
      return
    }

    if(child.type === Header) parts.header = child
    else if(child.type === Footer) parts.footer = child
    else parts.body.push(child)
  })

  return parts
}

function Modal({
  children,
  onClose,
  height = '525px',
  width = '700px',
}){
  const startedInside = useRef(false)
  
  useEffect(() => {
    const root = document.getElementById('root')
    const { body, documentElement } = document
    const prevOverflow = body.style.overflow
    const prevPadding = body.style.paddingRight
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth
    const scrollbarGutter = documentElement.style.scrollbarGutter

    root.inert = true
    body.style.overflow = 'hidden'
    documentElement.style.scrollbarGutter = 'auto'
    
    if(scrollbarWidth > 0){
      const computedPaddingRight = parseFloat(window.getComputedStyle(body).paddingRight) || 0
      body.style.paddingRight = `${computedPaddingRight + scrollbarWidth}px`
    }
    
    return () => {
      root.inert = null
      body.style.overflow = prevOverflow
      body.style.paddingRight = prevPadding
      documentElement.style.scrollbarGutter = scrollbarGutter
    }
  }, [])

  const handleMouseDown = (e) => {
    e.stopPropagation()
    startedInside.current = e.target.closest(`.${s.modalContainer}`) !== null
  }

  const handleMouseUp = (e) => {
    e.stopPropagation()
    const endedInside = e.target.closest(`.${s.modalContainer}`) !== null
    if (!startedInside.current && !endedInside) {
      onClose()
    }
  }

  const { header, body, footer } = getParts(children)

  return createPortal(
    <ModalContext.Provider value={{ onClose }}>
      <div
        className={s.modalOverlay}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        role="presentation"
      >
        <div
          className={s.modalContainer}
          style={{ height, width }}
          role='document'
          tabIndex={-1}
          aria-modal='true'
        >
          {header ? header :
            <div className={s.setHeader}>
              <button
                className={s.closeButton}
                onClick={() => onClose()}
                title="Close"
                aria-label='Close Modal'
              >
                {closeSvg}
              </button>
            </div>
          }
          <div className={s.mainContent}>
            {body}
          </div>
          {footer}
        </div>
      </div>
    </ModalContext.Provider>
    ,document.body
  )
}

Modal.Header = Header
Modal.Footer = Footer

export default Modal