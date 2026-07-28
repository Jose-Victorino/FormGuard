import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useLocation, useNavigate } from 'react-router'
import useClickOutside from '@/hooks/useClickOutside'
import cn from 'classnames'

import Button from '@/components/Button/Button'
import { UserAuth } from '@/hooks/useAuth'

import s from './Navigation.module.scss'

const root = document.getElementById('root')

const barsSVG = <svg viewBox="0 0 24 24" fill="none" className='svg-md' xmlns="http://www.w3.org/2000/svg"><path d="M5 12H20" strokeWidth="2" strokeLinecap="round"/><path d="M5 17H20" strokeWidth="2" strokeLinecap="round"/><path d="M5 7H20" strokeWidth="2" strokeLinecap="round"/></svg>
const closeSVG = <svg viewBox="0 0 24 24" fill="none" className='svg-md' xmlns="http://www.w3.org/2000/svg"><path d="M18 18L12 12M12 12L6 6M12 12L18 6M12 12L6 18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>

const MAIN_NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Contact us', to: '/contact-us' },
]

function MobileNavigation({closeMenu, menuValue}){
  const mobileNavRef = useRef(null)

  useClickOutside(mobileNavRef, closeMenu, menuValue)

  return createPortal(
    <div ref={mobileNavRef} className={cn(s.mobileNav, {[s.open]: menuValue})} role="dialog" inert={!menuValue}>
      <div className='flex j-end pad-15'>
        <button className='flex' onClick={closeMenu}>
          {closeSVG}
        </button>
      </div>
      <nav>
        <ul className={cn('flex-col', s.navLink)}>
          {MAIN_NAV_LINKS.map(({label, to}) =>
            <li key={to}>
              <NavLink
                to={to}
                className={({isActive}) => cn('w-100 pad-block-10 pad-inline-15', {[s.active]: isActive})}
                onClick={closeMenu}
              >
                {label}
              </NavLink>
            </li>
          )}
        </ul>
      </nav>
    </div>
    ,document.body
  )
}

function Navigation() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { session } = UserAuth()

  const userId = session?.user?.id

  const [atTop, setAtTop] = useState(() => {
    if(typeof window === 'undefined') return true

    return window.scrollY === 0
  })
  const [toggleMenu, setToggleMenu] = useState(false)
  
  const isHome = pathname === '/'

  useEffect(() => { 
    const handleScroll = () => setAtTop(window.scrollY === 0)

    handleScroll()
    window.addEventListener("scroll", handleScroll)

    return () => window.removeEventListener("scroll", handleScroll)
  }, [pathname])

  const openMenu = () => {
    root.inert = true
    setToggleMenu(true)
  }
  const closeMenu = () => {
    root.inert = false
    setToggleMenu(false)
  }

  return (
    <>
      <header className={cn('container-parent', s.header, {[s.atTop]: atTop, [s.isHome]: isHome})}>
        <section className={s.bottom}>
          <div className='container flex j-space-between a-center h-100'>
            <button
              className={s.openMenu}
              onClick={openMenu}
            >
              {barsSVG}
            </button>
            <div className={s.logoCont}>
              <Link to='/' className='flex'>
                <img src='/Icon.png' alt='Logo' height={50} width={50} />
              </Link>
            </div>
            <nav className={s.nav}>
              <ul className={cn('flex gap-20', s.navLink)}>
                {MAIN_NAV_LINKS.map(({label, to}) =>
                  <li key={to}>
                    <NavLink
                      to={to}
                      className={({isActive}) => cn({[s.active]: isActive})}
                    >
                      {label}
                    </NavLink>
                  </li>
                )}
              </ul>
            </nav>
            <div className={s.authCont}>
              {userId ?
                <Button
                  text='Go to dashboard'
                  onClick={() => navigate('/app')}
                /> :
                <>
                  <Button
                    text='Login'
                    onClick={() => navigate('/auth/login')}
                  />
                  <Button
                    text='Sign up'
                    onClick={() => navigate('/auth/sign-up')}
                  />
                </>
              }
            </div>
          </div>
        </section>
      </header>
      <MobileNavigation
        closeMenu={closeMenu}
        menuValue={toggleMenu}
      />
    </>
  )
}

export default Navigation