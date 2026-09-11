import { useState, useContext, createContext } from 'react'
import { useParams, Navigate, NavLink } from 'react-router'
import { UserAuth } from '@/hooks/useAuth'
import { techniqueHooks } from '@/service/crudService'

import useDocumentTitle from '@/hooks/useDocumentTitle'

import Loader from '@/components/Loader'
import Button from '@/components/Button/Button'
import PoseTracker from '@/features/PoseDetection/PoseTracker'
import VideoUpload from '@/features/PoseDetection/VideoUpload'
import PoseReplay from '@/features/PoseDetection/PoseReplay'

import s from './SessionLayout.module.scss'
import TutorialModal from './TutorialModal'

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
 * @property {React.Dispatch<React.SetStateAction<boolean>>} setIsInputLocked
 */

/** @type {React.Context<SessionContextValue | null>} */
const SessionContext = createContext(null)

export const useSessionContext = () => {
  const context = useContext(SessionContext)
  if(!context) throw new Error('getSessionContext must be used inside SessionContext.Provider')
  return context
}

function SessionLayout() {
  const { technique_slug } = useParams()
  const { session, isLoading: isAuthLoading } = UserAuth()
  /** @type {[Recording | null, React.Dispatch<React.SetStateAction<Recording | null>>]} */
  const [recording, setRecording] = useState(null)
  const [inputMode, setInputMode] = useState('record')
  const [isInputLocked, setIsInputLocked] = useState(false)
  const [toggleTutorialModal, setToggleTutorialModal] = useState(false)

  const userId = session?.user?.id

  const { data: { data: techniqueData = {} } = {}, isLoading: isTechniqueLoading, isError: isTechniqueError } = techniqueHooks.getById(
    { column: 'slug', id: technique_slug }
  )

  useDocumentTitle(`${(techniqueData?.name && techniqueData?.variation) ? `${techniqueData?.name} ${techniqueData?.variation} | ` : ''}FormGuard`)

  if(isTechniqueLoading || isAuthLoading) return <Loader.Bar />
  if(isTechniqueError || Object.keys(techniqueData).length === 0) return <Navigate to='/' replace />

  return (
    <main className='container-parent'>
      <section className='container flex-col gap-15 pad-block-15'>
        <SessionContext.Provider value={{recording, setRecording, setIsInputLocked}}>
          {recording
            ? <PoseReplay userId={userId} techniqueData={techniqueData}/>
            : <>
                <div className='flex-wrap j-space-between a-center gap-15'>
                  <NavLink to='/app'>Go back</NavLink>
                  <div className='flex gap-10'>
                    <Button
                      text='Record'
                      btnType={inputMode === 'record' ? 'primary' : 'secondary'}
                      color='green'
                      icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M128 128C92.7 128 64 156.7 64 192L64 448C64 483.3 92.7 512 128 512L384 512C419.3 512 448 483.3 448 448L448 192C448 156.7 419.3 128 384 128L128 128zM496 400L569.5 458.8C573.7 462.2 578.9 464 584.3 464C597.4 464 608 453.4 608 440.3L608 199.7C608 186.6 597.4 176 584.3 176C578.9 176 573.7 177.8 569.5 181.2L496 240L496 400z"/></svg>}
                      onClick={() => setInputMode('record')}
                      disabled={isInputLocked}
                      />
                    <Button
                      text='Upload Video'
                      btnType={inputMode === 'upload' ? 'primary' : 'secondary'}
                      color='green'
                      icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M342.6 73.4C330.1 60.9 309.8 60.9 297.3 73.4L169.3 201.4C156.8 213.9 156.8 234.2 169.3 246.7C181.8 259.2 202.1 259.2 214.6 246.7L288 173.3L288 384C288 401.7 302.3 416 320 416C337.7 416 352 401.7 352 384L352 173.3L425.4 246.7C437.9 259.2 458.2 259.2 470.7 246.7C483.2 234.2 483.2 213.9 470.7 201.4L342.7 73.4zM160 416C160 398.3 145.7 384 128 384C110.3 384 96 398.3 96 416L96 480C96 533 139 576 192 576L448 576C501 576 544 533 544 480L544 416C544 398.3 529.7 384 512 384C494.3 384 480 398.3 480 416L480 480C480 497.7 465.7 512 448 512L192 512C174.3 512 160 497.7 160 480L160 416z"/></svg>}
                      onClick={() => setInputMode('upload')}
                      disabled={isInputLocked}
                    />
                  </div>
                </div>
                <div className='flex-col a-center'>
                  <span className={s.note}>{techniqueData?.camera_pos} (configured in <NavLink to="/app/profile" className='text-link'>Profile</NavLink>)</span>
                  <p className={s.note}>See <button className='text-link' onClick={() => setToggleTutorialModal(true)}>tutorial</button> for more details</p>
                </div>
                {inputMode === 'record' ? <PoseTracker /> : <VideoUpload />}
              </>
          }
        </SessionContext.Provider>
      </section>
      {toggleTutorialModal && <TutorialModal technique={techniqueData} onClose={() => setToggleTutorialModal(false)}/>}
    </main>
  )
}

export default SessionLayout