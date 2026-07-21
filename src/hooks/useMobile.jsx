import { useEffect, useState } from 'react'

function useIsMobile(breakpoint = 780) {
  const [isMobile, setIsMobile] = useState(() => {
    if(typeof window === 'undefined') return false

    return window.innerWidth <= breakpoint
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`)

    const handleChange = (e) => setIsMobile(e.matches)

    setIsMobile(mediaQuery.matches)

    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [breakpoint])

  return isMobile
}

export default useIsMobile