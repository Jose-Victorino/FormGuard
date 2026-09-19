import { Navigate, Outlet, useLocation } from 'react-router'
import { UserAuth } from '@/hooks/useAuth'

import s from './AuthLayout.module.scss'

import logo from '/Logo.png'

function AuthLayout() {
  const { session } = UserAuth()
  const { pathname } = useLocation()
  const isPasswordRecovery = pathname === '/auth/recover'

  if(session && !isPasswordRecovery) return <Navigate to='/app' replace/>

  return (
    <section className={s.authWrapper}>
      <div className={s.bg}>
        <img src={logo} alt="Logo" />
      </div>
      <div className={s.auth}>
        <Outlet />
      </div>
    </section>
  )
}

export default AuthLayout