import { useState } from 'react'
import { useNavigate, NavLink, Link } from 'react-router'

import useIsMobile from '@/hooks/useMobile'

import cn from 'classnames'

import s from './Navigation.module.scss'
import { UserAuth } from '@/hooks/useAuth'
import { applyTheme, setStoredTheme } from '@/library/theme'
import { useGlobal } from '@/context/Global'

function Navigation() {
  const navigate = useNavigate()
  const { signOut } = UserAuth()
  const { set } = useGlobal()
  const isMobile = useIsMobile(560)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)

  const isCollapsed = isMobile || desktopCollapsed

  const handleSignOut = async () => {
    const error = await signOut()

    if(!error) {
      applyTheme('light')
      setStoredTheme('light')
      set('theme', 'light')
      navigate('/')
    }
  }

  return (
    <div className={cn(s.sideNav, {[s.collapse]: isCollapsed})}>
      <div className={s.logoCont}>
        <Link to='/app' className='flex'>
          {isCollapsed
            ? <img src="/Icon.png" className={s.iconLogo} width="28" height="40" alt="logo"/>
            : <img src="/Text Logo.png" className={s.textLogo} width="140" height="40" alt="logo"/>
          }
        </Link>
        {!isMobile &&
          <button className={s.collapseBtn} onClick={() => setDesktopCollapsed(p => !p)} title='Collapse Sidebar'>
            {isCollapsed
              ? <svg xmlns="http://www.w3.org/2000/svg" className='svg-md' viewBox="0 0 640 640"><path d="M320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM361 417C351.6 426.4 336.4 426.4 327.1 417C317.8 407.6 317.7 392.4 327.1 383.1L366.1 344.1L216 344.1C202.7 344.1 192 333.4 192 320.1C192 306.8 202.7 296.1 216 296.1L366.1 296.1L327.1 257.1C317.7 247.7 317.7 232.5 327.1 223.2C336.5 213.9 351.7 213.8 361 223.2L441 303.2C450.4 312.6 450.4 327.8 441 337.1L361 417.1z"/></svg>
              : <svg xmlns="http://www.w3.org/2000/svg" className='svg-md' viewBox="0 0 640 640"><path d="M320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM199 303L279 223C288.4 213.6 303.6 213.6 312.9 223C322.2 232.4 322.3 247.6 312.9 256.9L273.9 295.9L424 295.9C437.3 295.9 448 306.6 448 319.9C448 333.2 437.3 343.9 424 343.9L273.9 343.9L312.9 382.9C322.3 392.3 322.3 407.5 312.9 416.8C303.5 426.1 288.3 426.2 279 416.8L199 336.8C189.6 327.4 189.6 312.2 199 302.9z"/></svg>
            }
          </button>
        }
      </div>
      <nav className='flex-col gap-20'>
        <div>
          <span className={s.title}>Menu</span>
          <ul className={s.navLinks}>
            <li>
              <NavLink to='/app' title='Dashboard' className={({isActive}) => cn(s.navItem, {[s.active]: isActive})} end>
                <svg width="100%" height="100%" className='svg-md' viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 7H4.6C4.03995 7 3.75992 7 3.54601 7.10899C3.35785 7.20487 3.20487 7.35785 3.10899 7.54601C3 7.75992 3 8.03995 3 8.6V19.4C3 19.9601 3 20.2401 3.10899 20.454C3.20487 20.6422 3.35785 20.7951 3.54601 20.891C3.75992 21 4.03995 21 4.6 21H9M9 21H15M9 21L9 4.6C9 4.03995 9 3.75992 9.10899 3.54601C9.20487 3.35785 9.35785 3.20487 9.54601 3.10899C9.75992 3 10.0399 3 10.6 3L13.4 3C13.9601 3 14.2401 3 14.454 3.10899C14.6422 3.20487 14.7951 3.35785 14.891 3.54601C15 3.75992 15 4.03995 15 4.6V21M15 11H19.4C19.9601 11 20.2401 11 20.454 11.109C20.6422 11.2049 20.7951 11.3578 20.891 11.546C21 11.7599 21 12.0399 21 12.6V19.4C21 19.9601 21 20.2401 20.891 20.454C20.7951 20.6422 20.6422 20.7951 20.454 20.891C20.2401 21 19.9601 21 19.4 21H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Dashboard</span>
              </NavLink>
            </li>
            <li>
              <NavLink to='/app/video' title='Videos' className={({isActive}) => cn(s.navItem, {[s.active]: isActive})}>
                <svg width="100%" height="100%" className='svg-md' viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22V2M7 22V17M7 7V2M17 22V17M17 7V2M2 7H22M2 17H22M22 17.2V6.8C22 5.11984 22 4.27976 21.673 3.63803C21.3854 3.07354 20.9265 2.6146 20.362 2.32698C19.7202 2 18.8802 2 17.2 2L6.8 2C5.11984 2 4.27976 2 3.63803 2.32698C3.07354 2.6146 2.6146 3.07354 2.32698 3.63803C2 4.27976 2 5.11984 2 6.8L2 17.2C2 18.8802 2 19.7202 2.32698 20.362C2.6146 20.9265 3.07354 21.3854 3.63803 21.673C4.27976 22 5.11984 22 6.8 22H17.2C18.8802 22 19.7202 22 20.362 21.673C20.9265 21.3854 21.3854 20.9265 21.673 20.362C22 19.7202 22 18.8802 22 17.2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Videos</span>
              </NavLink>
            </li>
            <li>
              <NavLink to='/app/tutorial' title='Tutorial' className={({isActive}) => cn(s.navItem, {[s.active]: isActive})}>
                <svg width="100%" height="100%" className='svg-md' viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 20H5.2C4.07989 20 3.51984 20 3.09202 19.782C2.71569 19.5903 2.40973 19.2843 2.21799 18.908C2 18.4802 2 17.9201 2 16.8V7.2C2 6.07989 2 5.51984 2.21799 5.09202C2.40973 4.71569 2.71569 4.40973 3.09202 4.21799C3.51984 4 4.07989 4 5.2 4H5.6C7.84021 4 8.96031 4 9.81596 4.43597C10.5686 4.81947 11.1805 5.43139 11.564 6.18404C12 7.03968 12 8.15979 12 10.4M12 20V10.4M12 20H18.8C19.9201 20 20.4802 20 20.908 19.782C21.2843 19.5903 21.5903 19.2843 21.782 18.908C22 18.4802 22 17.9201 22 16.8V7.2C22 6.07989 22 5.51984 21.782 5.09202C21.5903 4.71569 21.2843 4.40973 20.908 4.21799C20.4802 4 19.9201 4 18.8 4H18.4C16.1598 4 15.0397 4 14.184 4.43597C13.4314 4.81947 12.8195 5.43139 12.436 6.18404C12 7.03968 12 8.15979 12 10.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Tutorial</span>
              </NavLink>
            </li>
          </ul>
        </div>
        <div>
          <span className={s.title}>General</span>
          <ul className={s.userNavLinks}>
            <li>
              <NavLink to='/app/profile' title='Profile' className={({isActive}) => cn(s.navItem, {[s.active]: isActive})} end>
                <svg width="100%" height="100%" className='svg-md' viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 20C5.33579 17.5226 8.50702 16 12 16C15.493 16 18.6642 17.5226 21 20M16.5 7.5C16.5 9.98528 14.4853 12 12 12C9.51472 12 7.5 9.98528 7.5 7.5C7.5 5.01472 9.51472 3 12 3C14.4853 3 16.5 5.01472 16.5 7.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Profile</span>
              </NavLink>
            </li>
            <li>
              <button onClick={() => handleSignOut()} className={s.navItem} title='Logout'>
                <svg width="100%" height="100%" className='svg-md' viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 17L21 12M21 12L16 7M21 12H9M12 17C12 17.93 12 18.395 11.8978 18.7765C11.6204 19.8117 10.8117 20.6204 9.77646 20.8978C9.39496 21 8.92997 21 8 21H7.5C6.10218 21 5.40326 21 4.85195 20.7716C4.11687 20.4672 3.53284 19.8831 3.22836 19.1481C3 18.5967 3 17.8978 3 16.5V7.5C3 6.10217 3 5.40326 3.22836 4.85195C3.53284 4.11687 4.11687 3.53284 4.85195 3.22836C5.40326 3 6.10218 3 7.5 3H8C8.92997 3 9.39496 3 9.77646 3.10222C10.8117 3.37962 11.6204 4.18827 11.8978 5.22354C12 5.60504 12 6.07003 12 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Logout</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  )
}

export default Navigation