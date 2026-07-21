import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'

const STORAGE_KEY = 'previous_location'

function readStorage() {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored ? JSON.parse(stored) : null
}

export default function usePreviousLocation() {
  const location = useLocation()

  const [prevLocation, setPrevLocation] = useState(readStorage)

  const currentRef = useRef(location)

  useEffect(() => {
    const prev = currentRef.current
    if(prev.pathname === location.pathname) return

    if(prev) localStorage.setItem(STORAGE_KEY, JSON.stringify(prev))
    setPrevLocation(prev)

    currentRef.current = location
  }, [location])

  return prevLocation
}