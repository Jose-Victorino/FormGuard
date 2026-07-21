import { useState, useEffect } from 'react'

export default function useDebounce(val, delay){
  const [debounceVal, setDebounceVal] = useState(val)
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebounceVal(val)
    }, delay)

    return () => clearTimeout(timeout)
  }, [val, delay])
  
  return debounceVal
}