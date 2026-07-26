import { lazy, useLayoutEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router'
import { techniqueHooks } from './service/crudService'
import { applyTheme, getStoredTheme } from '@/library/theme'
import { useGlobal } from '@/context/Global'
import { ProtectedRoute } from './hooks/useAuth'

const SessionLayout = lazy(() => import('@/features/PoseDetection/SessionLayout'))
const MainLayout = lazy(() => import('@/pages/DashboardApp/MainLayout'))
const Dashboard = lazy(() => import('@/pages/DashboardApp/Dashboard/Dashboard'))
const Videos = lazy(() => import('@/pages/DashboardApp/Video/Videos'))
const Profile = lazy(() => import('@/pages/DashboardApp/Profile'))
const VideoPreview = lazy(() => import('@/pages/DashboardApp/Video/VideoPreview'))
const Feedback = lazy(() => import('./features/PoseDetection/Feedback'))
const SelectionModal = lazy(() => import('./pages/DashboardApp/Video/SelectionModal'))

function MainApp() {
  const { state, set } = useGlobal()
  techniqueHooks.prefetchAll({ order: { column: 'slug', ascending: true } })

  useLayoutEffect(() => {
    const theme = getStoredTheme()
    applyTheme(theme)
    set('theme', theme)
  }, [])

  return (
    <ProtectedRoute>
      <Routes>
        <Route path='*' element={<MainLayout />}>
          <Route path='*' element={<Navigate to='/app' replace />} />
          <Route index element={<Dashboard />} />
          <Route path='video' element={<Videos />} />
          <Route path='video/:session_id' element={<VideoPreview />} />
          <Route path='profile' element={<Profile />} />
        </Route>
        <Route path='session/:technique_slug' element={<SessionLayout />} />
        <Route path='feedback/:session_id' element={<Feedback />}/>
      </Routes>
      {state.selectionModalToggle && <SelectionModal onClose={() => set('selectionModalToggle', false)}/>}
    </ProtectedRoute>
  )
}

export default MainApp