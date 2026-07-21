import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import cn from 'classnames'

import { subscribe, getSnapshot, dismissToast } from './Toast.store'

import s from './Toast.module.scss'
/**
 * @typedef {Object} DefaultSettings
 * @property {'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'} [position]
 * @property {'light' | 'dark'} [theme]
 * @property {number} [duration]
 * @property {boolean} [autoClose]
 */
const TOAST_VARIANTS = {
  default: { toastVariant: s.default, icon: null },
  success: { toastVariant: s.success, icon: 'check' },
  error:   { toastVariant: s.error, icon: 'alert' },
  warning: { toastVariant: s.warning, icon: 'warn' },
  info:    { toastVariant: s.info, icon: 'info' },
}

function ToastNotif({item}){
  const { autoClose } = item
  const { toastVariant } = TOAST_VARIANTS[item.type] ?? TOAST_VARIANTS.default

  return (
    <div key={item.id} className={cn(s.toastSlot, {[s.slotUnmount]: item.isCollapsing})}>
      <div className={cn(s.toastItem, toastVariant, {[s.unmount]: item.isExiting})}>
        <div className='flex-col j-center w-100'>
          <p className={s.title}>{item.title}</p>
          <p className={s.message}>{item.message}</p>
        </div>
        {!autoClose &&
          <button
            className={s.closeBtn}
            onClick={() => dismissToast(item.id)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"/></svg>
          </button>
        }
      </div>
    </div>
  )
}

const POSITIONS = ['top-right', 'top-left', 'bottom-right', 'bottom-left']

const POSITION_CLASS = {
  'top-right': s.posTopRight,
  'top-left': s.posTopLeft,
  'bottom-right': s.posBottomRight,
  'bottom-left': s.posBottomLeft,
}

function ToastViewport(props){
  const { position = 'top-right', theme = 'light' } = props
  const items = useSyncExternalStore(subscribe, getSnapshot)

  return createPortal(
    <div className={cn(s.toastRoot, s[theme])}>
      {POSITIONS.map((pos) => {
        const regionItems = items.filter((item) =>
          (item.position ?? position) === pos
        )
        
        if(regionItems.length === 0) return null

        return (
          <div key={pos} className={cn(s.region, POSITION_CLASS[pos])}>
            {regionItems.map((item) => <ToastNotif key={item.id} item={item}/>)}
          </div>
        )
      })}
    </div>
    ,document.body
  )
}
/**
 * @param {DefaultSettings} props
 */
export const ToastContainer = (props) => <ToastViewport {...props}/>