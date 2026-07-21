import { useEffect, useRef } from 'react'

export default function useClickOutside(ref, handler, enabled = true){
  const startedInside = useRef(false)

  useEffect(() => {
    if(!enabled) return

    const handleClick = (e) => {
      startedInside.current = ref?.current?.contains(e.target)
    }
    const handleRelease = (e) => {
      const endedInside = ref?.current?.contains(e.target)
      if(!startedInside.current && !endedInside)
        handler(e)
    }

    document.addEventListener("mousedown", handleClick)
    document.addEventListener("mouseup", handleRelease)
    document.addEventListener("touchstart", handleClick)
    document.addEventListener("touchend", handleRelease)
    
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("mouseup", handleRelease)
      document.removeEventListener("touchstart", handleClick)
      document.removeEventListener("touchend", handleRelease)
    }
  }, [ref, handler, enabled])
}