import { useLayoutEffect } from 'react'
import { Outlet } from 'react-router'

import { useGlobal } from '@/context/Global'
import { applyTheme } from '@/library/theme'

import Navigation from './components/Navigation/Navigation'
import Footer from './components/Footer/Footer'

function LandingLayout() {
  const { set } = useGlobal()

  useLayoutEffect(() => {
    applyTheme('light')
    set('theme', 'light')
  }, [])

  return (
    <>
      <Navigation />
      <main className='container-parent'>
        <Outlet />
        <Footer />
      </main>
    </>
  )
}

export default LandingLayout