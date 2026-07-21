import { useState, useEffect } from "react"

const store = {}
const listeners = {}

function emit(key, value){
  if(!listeners[key]) return
  listeners[key].forEach((cb) => cb(value))
}

function subscribe(key, cb){
  if(!listeners[key]) listeners[key] = new Set()
  listeners[key].add(cb)

  return () => {
    listeners[key].delete(cb)
  }
}

function getValue(key, defaultValue){
  const fallback = typeof defaultValue === "function" ? defaultValue() : defaultValue
  
  if(store[key] !== undefined) return store[key]

  try{
    const stored = localStorage.getItem(key)
    if(stored !== null){
      const parsed = JSON.parse(stored)
      store[key] = parsed
      return parsed
    }
  } catch (e){console.log('Storage getting error: ', e)}

  store[key] = fallback
  return fallback
}

export function useLocalStorage(key, defaultValue){
  const [state, setState] = useState(() => getValue(key, defaultValue))

  useEffect(() => {
    return subscribe(key, setState)
  }, [key])

  const setValue = (value) => {
    const newValue = typeof value === "function" ? value(store[key]) : value

    store[key] = newValue

    try{
      localStorage.setItem(key, JSON.stringify(newValue))
    } catch (e){console.log('Storage setting error: ', e)}

    emit(key, newValue)
  }

  return [state, setValue]
}