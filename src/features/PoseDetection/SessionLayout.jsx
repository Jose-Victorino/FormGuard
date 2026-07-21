import { useState, useContext, createContext } from 'react'
import { useParams, Navigate, NavLink } from 'react-router'
import { UserAuth } from '@/hooks/useAuth'
import { techniqueHooks } from '@/service/crudService'

import useDocumentTitle from '@/hooks/useDocumentTitle'

import Loader from '@/components/Loader'
import PoseTracker from '@/features/PoseDetection/PoseTracker'
import PoseReplay from '@/features/PoseDetection/PoseReplay'

/**
 * @typedef {import('./util/types').LandmarkFrame} LandmarkFrame
 */
/**
 * @typedef {Object} Recording
 * @property {string} videoUrl
 * @property {Blob} blob
 * @property {LandmarkFrame[]} landmarks
 */
/**
 * @typedef {Object} SessionContextValue
 * @property {Recording | null} recording
 * @property {React.Dispatch<React.SetStateAction<Recording | null>>} setRecording
 */

/** @type {React.Context<SessionContextValue | null>} */
const SessionContext = createContext(null)

export const getSessionContext = () => {
  const context = useContext(SessionContext)
  if(!context) throw new Error('getSessionContext must be used inside SessionContext.Provider')
  return context
}

/**
 * TODO: Add a tutorial state (check if it's the user's first time)
 * 1. Specify the recording angel (provide a pic) - must be infront of them to either left or right depending on racket side
 * 2. Click "Get Ready" and stand in frame to begin recording.
 */
function SessionLayout() {
  const { technique_slug } = useParams()
  const { session, isLoading: isAuthLoading } = UserAuth()
  /** @type {[Recording | null, React.Dispatch<React.SetStateAction<Recording | null>>]} */
  const [recording, setRecording] = useState(null)

  const userId = session?.user?.id

  const { data: { data: techniqueData = {} } = {}, isLoading: isTechniqueLoading, isError: isTechniqueError } = techniqueHooks.getById(
    { column: 'slug', id: technique_slug }
  )

  useDocumentTitle('Session | FormGuard')

  if(isTechniqueLoading || isAuthLoading) return <Loader.Bar />
  if(isTechniqueError || Object.keys(techniqueData).length === 0) return <Navigate to='/' replace />

  return (
    <main className='container-parent'>
      <section className='container'>
        <NavLink to='/app'>Go back</NavLink>
        <SessionContext.Provider value={{recording, setRecording}}>
          {recording
            ? <PoseReplay userId={userId} techniqueData={techniqueData}/>
            : <PoseTracker />
          }
        </SessionContext.Provider>
      </section>
    </main>
  )
}

export default SessionLayout