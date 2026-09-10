import { lazy } from 'react'
import { Outlet, redirect } from 'react-router'
import { ProtectedRoute } from '@/hooks/useAuth'
import { techniqueHooks } from '@/service/crudService'

const SessionLayout = lazy(() => import('@/features/PoseDetection/SessionLayout'))
const MainLayout = lazy(() => import('@/pages/DashboardApp/MainLayout'))
const Dashboard = lazy(() => import('@/pages/DashboardApp/Dashboard/Dashboard'))
const Videos = lazy(() => import('@/pages/DashboardApp/Video/Videos'))
const Tutorial = lazy(() => import('@/pages/DashboardApp/Tutorial/Tutorial'))
const Profile = lazy(() => import('@/pages/DashboardApp/Profile'))
const VideoPreview = lazy(() => import('@/pages/DashboardApp/Video/VideoPreview'))
const Feedback = lazy(() => import('@/features/PoseDetection/Feedback'))

// Gate the whole dashboard subtree behind auth and keep technique lookups warm for it.
function ProtectedDashboard() {
  techniqueHooks.prefetchAll({ order: { column: 'slug', ascending: true } })

  return (
    <ProtectedRoute>
      <Outlet />
    </ProtectedRoute>
  )
}

/** @type {import('react-router').RouteObject[]} */
export const dashboardRoutes = [
  {
    Component: ProtectedDashboard,
    children: [
      {
        path: '/app', Component: MainLayout,
        children: [
          {path: '*', loader: () => redirect('/app')},
          {index: true, Component: Dashboard},
          {path: 'video', Component: Videos},
          {path: 'video/:session_id', Component: VideoPreview},
          {path: 'tutorial/:technique_id?', Component: Tutorial},
          {path: 'profile', Component: Profile},
        ],
      },
      {path: '/app/session/:technique_slug', Component: SessionLayout},
      {path: '/app/feedback/:session_id', Component: Feedback},
    ],
  },
]