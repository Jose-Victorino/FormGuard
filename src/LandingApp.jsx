import { lazy, useLayoutEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router'

import { useGlobal } from '@/context/Global'
import { applyTheme } from '@/library/theme'

import LandingLayout from '@/pages/LandingPage/LandingLayout'
const Home = lazy(() => import('@/pages/LandingPage/Home'))
const About = lazy(() => import('@/pages/LandingPage/About'))
const Contact = lazy(() => import('@/pages/LandingPage/Contact'))

function LandingApp() {
  const { set } = useGlobal()

  useLayoutEffect(() => {
    applyTheme('light')
    set('theme', 'light')
  }, [])

  return (
    <Routes>
      <Route path='/' element={<LandingLayout />}>
        <Route path='*' element={<Navigate to='/' replace />} />
        <Route index element={<Home />} />
        <Route path='about' element={<About />} />
        <Route path='contact-us' element={<Contact />} />
      </Route>
    </Routes>
  )
}

export default LandingApp