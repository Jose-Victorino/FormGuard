import { useEffect } from 'react'
import { useLocation } from "react-router"

export const capitalizeFirstLetter = (str) => str[0].toUpperCase() + str.slice(1)
export const intLengthToArray = (length) => Array.from({ length }, (_, i) => i)
export const isEmptyObject = (obj) => obj && Object.keys(obj).length === 0
export const isStringInteger = (n) => Number.isInteger(Number(n))

export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export const abbreviateNumber = (num, toFixed = 1) => {
  if (num < 1000) return num.toString()

  const units = ['', 'k', 'M', 'B', 'T']
  const tier = Math.floor(Math.log10(num) / 3)
  const scaled = num / Math.pow(1000, tier)
  const factor = Math.pow(10, toFixed)
  // round
  // const round = scaled % 1 === 0 ? scaled : scaled.toFixed(toFixed)
  // floor
  const round = Math.floor(scaled * factor) / factor
  
  // const round = Math.ceil(scaled * factor) / factor
  
  return `${round}${units[tier]}`
}

export function wordCap(str) {
  str = str.toLowerCase()

  const words = str.split(' ')

  const capitalizedWords = words.map(word =>
    (word.length > 0) ? word.charAt(0).toUpperCase() + word.slice(1) : ''
  )

  return capitalizedWords.join(' ')
}

export function groupBy(array, key) {
  return array.reduce((groups, item) => {
    const group = item[key]

    if(!groups[group]){
      groups[group] = []
    }

    groups[group].push(item)

    return groups
  }, {})
}

export function formatDuration(seconds) {
  if(!seconds) return null

  /** @type {['h'|'m'|'s', number][]} */
  const units = [
    ['h', 3600],
    ['m', 60],
    ['s', 1],
  ]

  return units
    .map(([label, value]) => {
      const amount = Math.floor(seconds / value)
      seconds %= value

      return amount ? `${amount}${label}` : null
    })
    .filter(Boolean)
    .slice(0, 2)
    .join(' ')
}

const isValidDate = (date) => date instanceof Date && !isNaN(date.getTime())
export function formatDate(str) {
  if(!str) return str

  const datePart = str.includes("T") ? str.split("T")[0] : str
  const [y, m, d] = datePart.split(/[-/]/)

  const date = new Date(Number(y), Number(m) - 1, Number(d))

  if(!isValidDate(date)) return ''

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
export function formatTime(str) {
  if(!str) return str

  const timePart = str.includes("T") ? str.split("T")[1] : str
  let [h, m, s] = timePart.split(":")

  if(s){
    s = s.split(".")[0]
    s = s.split("+")[0]
    s = s.split("-")[0]
  }

  const date = new Date()
  date.setHours(Number(h), Number(m), Number(s || 0))

  if(!isValidDate(date)) return ''

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}
export function formatDateTime(str) {
  const date = formatDate(str)
  const time = formatTime(str)

  if(!date && !time) return ''
  if(!date) return time
  if(!time) return date

  return date + ', ' + time
}

function scrollReset(container){
  try {
    if(typeof window !== 'undefined' && window.scrollTo) {
      window.scrollTo(0, 0)
    }
    if(document){
      if(document.documentElement) document.documentElement.scrollTop = 0
      if(document.body) document.body.scrollTop = 0
    }

    if(container && container.scrollTop) container.scrollTop = 0
  }catch(e){console.log('Scroll reset Error: ', e)}
}
export function useScrollReset(container){
  const location = useLocation()

  useEffect(() => {scrollReset(container)}, [location.pathname, container])
}
export { scrollReset }

export function debounce(fn, delay) {
  let timer

  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}