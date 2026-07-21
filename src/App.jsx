import { lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router'

const AuthLayout = lazy(() => import('@/pages/Auth/AuthLayout'))
const LandingApp = lazy(() => import('./LandingApp'))
const DashboardApp = lazy(() => import('./DashboardApp'))
const Login = lazy(() => import('@/pages/Auth/Login'))
const SignUp = lazy(() => import('@/pages/Auth/SignUp'))
const ForgotPassword = lazy(() => import('@/pages/Auth/ForgotPassword'))
const Recover = lazy(() => import('@/pages/Auth/Recover'))

import '@/styles/index.scss'
import 'react-loading-skeleton/dist/skeleton.css'
import { UserAuth } from './hooks/useAuth'
import { userHooks } from './service/crudService'

function App() {
  const { session } = UserAuth()

  const userId = session?.user?.id

  userHooks.prefetchById({ column: 'id', id: userId })

  return (
    <Routes>
      <Route path='*' element={<LandingApp />}/>
      <Route path='/app/*' element={<DashboardApp />}/>
      <Route path='/auth' element={<AuthLayout />}>
        <Route index element={<Navigate to='/auth/login' replace />} />
        <Route path='*' element={<Navigate to='/auth/login' replace />} />
        <Route path='login' element={<Login />}/>
        <Route path='sign-up' element={<SignUp />}/>
        <Route path='forgot-password' element={<ForgotPassword />}/>
        <Route path='recover' element={<Recover />}/>
      </Route>
    </Routes>
  )
}

export default App
