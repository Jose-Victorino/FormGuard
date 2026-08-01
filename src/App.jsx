import { createBrowserRouter, RouterProvider } from 'react-router'
import { UserAuth } from './hooks/useAuth'
import { userHooks } from './service/crudService'
import { dashboardRoutes } from './routes/dashboard'
import { landingRoutes } from './routes/landing'
import { authRoutes } from './routes/auth'

import '@/styles/index.scss'
import 'react-loading-skeleton/dist/skeleton.css'

const router = createBrowserRouter([
  ...authRoutes,
  ...landingRoutes,
  ...dashboardRoutes,
])

function App() {
  const { session } = UserAuth()

  const userId = session?.user?.id

  userHooks.prefetchById({ column: 'id', id: userId })

  return <RouterProvider router={router} />
}

export default App
