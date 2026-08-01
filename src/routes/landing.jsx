import { lazy } from 'react'
import { redirect } from 'react-router'

import LandingLayout from '@/pages/LandingPage/LandingLayout'
const Home = lazy(() => import('@/pages/LandingPage/Home'))
const About = lazy(() => import('@/pages/LandingPage/About'))
const Contact = lazy(() => import('@/pages/LandingPage/Contact'))

/** @type {import('react-router').RouteObject[]} */
export const landingRoutes = [
  {
    path: '/', Component: LandingLayout,
    children: [
      {path: '*', loader: () => redirect('/')},
      {index: true, Component: Home},
      {path: 'about', Component: About},
      {path: 'contact-us', Component: Contact},
    ],
  },
]
/** @type {import('react-router').DOMRouterOpts} */
export const testingOpts = {}