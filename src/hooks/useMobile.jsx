import { useSyncExternalStore } from 'react'

export default function useIsMobile(breakpoint = 780) {
  return useSyncExternalStore((callback) => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`)

    mediaQuery.addEventListener('change', callback)

    return () => {
      mediaQuery.removeEventListener('change', callback)
    }
  },
  () => window.matchMedia(`(max-width: ${breakpoint}px)`).matches,
  () => false
  )
}