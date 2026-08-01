import { UserAuth } from '@/hooks/useAuth'
import { lazy } from 'react'
import { redirect } from 'react-router'

const AuthLayout = lazy(() => import('@/pages/Auth/AuthLayout'))
const Login = lazy(() => import('@/pages/Auth/Login'))
const SignUp = lazy(() => import('@/pages/Auth/SignUp'))
const ForgotPassword = lazy(() => import('@/pages/Auth/ForgotPassword'))
const Recover = lazy(() => import('@/pages/Auth/Recover'))

/** @type {import('react-router').RouteObject[]} */
export const authRoutes = [
  {
    path: '/auth', Component: AuthLayout,
    children: [
      {path: '*', loader: () => redirect('/auth/login')},
      {path: 'login', Component: Login},
      {path: 'sign-up', Component: SignUp},
      {path: 'forgot-password', Component: ForgotPassword},
      {path: 'recover', Component: Recover},
    ],
  },
]
/** @type {import('react-router').DOMRouterOpts} */
export const testingOpts = {}