let toasts = []
let listeners = new Set()
let nextId = 1

const EXIT_MS = 200
const COLLAPSE_MS = 150

function emit() {
  for(const listener of listeners) listener()
}

export function subscribe(listener){
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getSnapshot = () => toasts

function createToast(type, data){
  const {
    duration = 3000,
    autoClose = true,
    ...rest
  } = typeof data === 'string' ? { message: data } : data

  const id = nextId++

  toasts = [...toasts, { ...rest, id, type, duration, autoClose, isExiting: false, isCollapsing: false }]
  emit()
  if(autoClose){
    setTimeout(() => {
      dismissToast(id)
    }, duration)
  }
}

export function dismissToast(id) {
  const targetToast = toasts.find((t) => t.id === id)
  if(!targetToast || targetToast.isExiting) return

  toasts = toasts.map((t) => (
    t.id === id ? { ...t, isExiting: true } : t
  ))
  emit()

  setTimeout(() => {
    toasts = toasts.map((t) => (
      t.id === id ? { ...t, isCollapsing: true } : t
    ))
    emit()

    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id)
      emit()
    }, COLLAPSE_MS)
  }, EXIT_MS)
}
/**
 * @typedef {Object} ToastData
 * @property {string} message
 * @property {string} [title]
 * @property {number} [duration]
 * @property {boolean} [autoClose]
 */

/**
 * @typedef {string | ToastData} ToastSettings
 */

/**
 * @typedef {((data: ToastSettings) => void) & {
 *   success: (data: ToastSettings) => void
 *   error: (data: ToastSettings) => void
 *   warning: (data: ToastSettings) => void
 *   info: (data: ToastSettings) => void
 * }} Toast
 */

/** @type {Toast} */
export const toast = Object.assign(
  (data) => createToast('default', data),
  {
    success: (data) => createToast('success', data),
    error: (data) => createToast('error', data),
    warning: (data) => createToast('warning', data),
    info: (data) => createToast('info', data),
  },
)