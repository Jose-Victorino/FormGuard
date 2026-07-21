import { useEffect } from 'react'
import { useSearchParams } from 'react-router'

/**
 * @template {import('yup').ISchema<any>} T
 * @typedef {import('yup').InferType<T>} InferSchema
 */

/**
 * @template T
 * @typedef {[
 *   Partial<T>,
 *   (params: Partial<T>) => void
 * ]} UseQueryParamsReturn
 */

/**
 * @template {Record<string, any>} T
 * @param {{
 *   shape: T,
 *   onError?: 'clear'
 * }} params
 * @returns {UseQueryParamsReturn<{
 *   [K in keyof T]: InferSchema<T[K]>
 * }>}
 */
export default function useQueryParams({ shape, onError = 'clear' }){
  const [searchParams, setSearchParams] = useSearchParams()

  const { values, hasError } = Object.entries(shape).reduce((acc, [key, schema = null]) => {
    let value = null
    const inferred = schema?.type
    
    if(inferred === 'number'){
      const temp = searchParams.get(key)
      const parsed = temp ? parseInt(temp) : null

      if(Number.isNaN(parsed)) acc.hasError = true
      else value = parsed
    }
    if(inferred === 'string'){
      value = searchParams.get(key)
    }
    if(inferred === 'array'){
      value = searchParams.getAll(key)
    }
    if(inferred === 'object'){
      const temp = searchParams.get(key)
      try{ value = JSON.parse(temp) }
      catch{ acc.hasError = true } 
    }
    
    if(value !== null && schema){
      try{
        schema.validateSync(value)
      } catch{
        acc.hasError = true
        value = null
      }
    }
    if (value != null)
      acc.values[key] = value
    
    return acc
  }, {values: {}, hasError: false})
  
  useEffect(() => {
    if(!hasError) return
    
    if(onError === 'clear')
      setSearchParams(new URLSearchParams())
  }, [hasError, onError, searchParams, setSearchParams])

  const handleSetQuery = (params) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)

      Object.entries(params).forEach(([key, val]) => {
        if(val == null || val === ''){
          next.delete(key)
        }
        else{
          next.set(key, typeof val === 'object' ? JSON.stringify(val) : String(val))
        }
      })

      return next
    })
  }

  return ([values, handleSetQuery])
}