import { lazy, useLayoutEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router'
import { techniqueHooks } from './service/crudService'
import { applyTheme, getStoredTheme } from '@/library/theme'
import { useGlobal } from '@/context/Global'

import SessionLayout from '@/features/PoseDetection/SessionLayout'
import MainLayout from '@/pages/DashboardApp/MainLayout'
import Dashboard from '@/pages/DashboardApp/Dashboard/Dashboard'
import Videos from '@/pages/DashboardApp/Video/Videos'
import Profile from '@/pages/DashboardApp/Profile'
import VideoPreview from '@/pages/DashboardApp/Video/VideoPreview'
import { ProtectedRoute } from './hooks/useAuth'
import Feedback from './features/PoseDetection/Feedback'
import SelectionModal from './pages/DashboardApp/Video/SelectionModal'

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