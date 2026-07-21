import { useEffect } from 'react'
import { Outlet } from 'react-router'
import { UserAuth } from '@/hooks/useAuth'
import { userHooks } from '@/service/crudService'
import { applyTheme, setStoredTheme } from '@/library/theme'
import { useGlobal } from '@/context/Global'

import Navigation from '@/pages/DashboardApp/components/Navigation/Navigation'

import s from './MainLayout.module.scss'

function MainLayout() {
  const { set } = useGlobal()
  const { session } = UserAuth()
  const userId = session?.user?.id

  const { data: { data: userData } = {}, isSuccess } = userHooks.getById(
    { column: 'id', id: userId },
    { enabled: !!userId }
  )

  useEffect(() => {
    if (!isSuccess) return
    const theme = userData?.theme === 'dark' ? 'dark' : userData?.theme === 'light' ? 'light' : null
    if (!theme) return
    applyTheme(theme)
    setStoredTheme(theme)
    set('theme', theme)
  }, [isSuccess, userData?.theme])

  return (
    <main className='flex pos-r'>
      <Navigation />
      <div className={s.dashboardLayout}>
        <Outlet />
      </div>
      <div className={s.newRecording}>
        <button
          title='Start Recording'
          onClick={() => set('selectionModalToggle', true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className='svg-lg' viewBox="0 0 640 640">
            <path d="M352 128C352 110.3 337.7 96 320 96C302.3 96 288 110.3 288 128L288 288L128 288C110.3 288 96 302.3 96 320C96 337.7 110.3 352 128 352L288 352L288 512C288 529.7 302.3 544 320 544C337.7 544 352 529.7 352 512L352 352L512 352C529.7 352 544 337.7 544 320C544 302.3 529.7 288 512 288L352 288L352 128z"/>
          </svg>
        </button>
      </div>
    </main>
  )
}

export default MainLayout