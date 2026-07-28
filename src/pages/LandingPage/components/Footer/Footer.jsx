import { Link } from 'react-router'
import cn from 'classnames'

import { scrollReset } from '@/library/util'

import s from './Footer.module.scss'

function Footer() {
  return (
    <footer className={cn('container-parent', s.footer)}>
      <section className={cn('container flex-wrap gap-40', s.main)}>
        <div className={cn('flex-col a-center gap-20', s.left)}>
          <img src='/Logo.png' loading='lazy' height={140} alt="Logo" />
        </div>
        <div className='flex-col gap-30'>
          <p className='text-center'>Explore</p>
          <ul className={cn('flex-col gap-10', s.navLink)}>
            <li>
              <Link to='/' onClick={() => scrollReset()}>
                Home
              </Link>
            </li>
            <li>
              <Link to='/about' onClick={() => scrollReset()}>
                About
              </Link>
            </li>
            <li>
              <Link to='/contact-us' onClick={() => scrollReset()}>
                Contact us
              </Link>
            </li>
          </ul>
        </div>
        {/* <div className='flex-col gap-30'>
          <p className='text-center'>Information</p>
          <ul className={cn('flex-col gap-10', s.navLink)}>
            <li>
              <Link to='/policy/privacy' onClick={() => scrollReset()}>
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to='/policy/terms-of-service' onClick={() => scrollReset()}>
                Terms of Services
              </Link>
            </li>
          </ul>
        </div> */}
      </section>
      <section className='container flex j-center pad-block-10'>
        <p>© FormGuard 2026</p>
      </section>
    </footer>
  )
}

export default Footer