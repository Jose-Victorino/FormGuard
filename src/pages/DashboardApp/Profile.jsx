import { useQueryClient } from '@tanstack/react-query'
import { UserAuth } from '@/hooks/useAuth'
import { userHooks } from '@/service/crudService'
import { applyTheme, setStoredTheme } from '@/library/theme'

import { useGlobal } from '@/context/Global'

import s from './Profile.module.scss'
import cn from 'classnames'
import useDebounced from '@/hooks/useDebounce'

const DEBOUNCE_MS = 400

/** @param {unknown} value */
const resolveTheme = (value) => (value === 'dark' ? 'dark' : value === 'light' ? 'light' : null)

function Profile() {
  const { state, set } = useGlobal()
  const queryClient = useQueryClient()

  const { session } = UserAuth()

  const userId = session?.user?.id

  const { data: { data: userData = {} } = {} } = userHooks.getById(
    { column: 'id', id: userId },
    { enabled: !!userId }
  )
  const { mutate: updateUser } = userHooks.updateData()

  const persistRacketSide = useDebounced((id, racket_side) => {
    updateUser({ id, payload: { racket_side } })
  }, DEBOUNCE_MS)

  const persistTheme = useDebounced((id, theme) => {
    updateUser({ id, payload: { theme } })
  }, DEBOUNCE_MS)

  const racketSide = userData?.racket_side === 'left' ? 'left' : 'right'
  const savedTheme = resolveTheme(userData?.theme)
  const theme = savedTheme ?? (state.theme === 'dark' ? 'dark' : 'light')

  const patchUser = (payload) => {
    if (!userId) return
    queryClient.setQueryData(['user', 'record', { column: 'id', id: userId }], (old) => {
      const prev = /** @type {{ data?: Record<string, unknown> } | undefined} */ (old)
      if (!prev?.data) return old
      return { ...prev, data: { ...prev.data, ...payload } }
    })
  }

  const toggleRacketSide = () => {
    if (!userId) return
    const next = racketSide === 'right' ? 'left' : 'right'
    patchUser({ racket_side: next })
    persistRacketSide(userId, next)
  }

  const toggleTheme = () => {
    if (!userId) return
    const next = theme === 'light' ? 'dark' : 'light'
    applyTheme(next)
    setStoredTheme(next)
    set('theme', next)
    patchUser({ theme: next })
    persistTheme(userId, next)
  }

  return (
    <>
      <h3>Profile</h3>
      <div className='flex-col gap-5'>
        <span>Racket Side</span>
        <button
          className={cn(s.toggle, {[s.on]: racketSide === 'right'})}
          onClick={toggleRacketSide}
        >
          <div><span>Left</span></div>
          <div><span>Right</span></div>
        </button>
      </div>
      <div className='flex-col gap-5'>
        <span>Theme</span>
        <button
          className={cn(s.toggle, {[s.on]: theme === 'dark'})}
          onClick={toggleTheme}
        >
          <div>
            <svg width="100%" height="100%" className='svg-sm' viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2V4M12 20V22M4 12H2M6.31412 6.31412L4.8999 4.8999M17.6859 6.31412L19.1001 4.8999M6.31412 17.69L4.8999 19.1042M17.6859 17.69L19.1001 19.1042M22 12H20M17 12C17 14.7614 14.7614 17 12 17C9.23858 17 7 14.7614 7 12C7 9.23858 9.23858 7 12 7C14.7614 7 17 9.23858 17 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <svg width="100%" height="100%" className='svg-sm' viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 15.8442C20.6866 16.4382 19.2286 16.7688 17.6935 16.7688C11.9153 16.7688 7.23116 12.0847 7.23116 6.30654C7.23116 4.77135 7.5618 3.3134 8.15577 2C4.52576 3.64163 2 7.2947 2 11.5377C2 17.3159 6.68414 22 12.4623 22C16.7053 22 20.3584 19.4742 22 15.8442Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>
      </div>
    </>
  )
}

export default Profile