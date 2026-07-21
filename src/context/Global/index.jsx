import { useMemo, useReducer, createContext, useContext } from 'react'
import { initialState } from './initialState'

const GlobalContext = createContext(null)

function setNestedValue(obj, path, value) {
  const keys = Array.isArray(path) ? [...path] : path.split('.')
  
  if(!keys.length) return obj
  
  const lastKey = keys.pop()
  const newObj = { ...obj }
  let current = newObj

  for(const key of keys){
    current[key] = { ...current[key] ?? {} }
    current = current[key]
  }

  if(current[lastKey] !== value)
    current[lastKey] = value

  return newObj
}

function reducer(state, action){
  switch (action.type){
    case 'SET':
      return setNestedValue(state, action.path, action.value)
    default:
      return state
  }
}

export function useGlobal() {
  const { state, dispatch } = useContext(GlobalContext)

  const set = (path, value) => {
    dispatch({ type: 'SET', path, value })
  }

  return { state, set }
}

export function GlobalProvider({ children }){
  const [state, dispatch] = useReducer(reducer, initialState)

  const value = useMemo(() => ({ state, dispatch }), [state])

  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  )
}