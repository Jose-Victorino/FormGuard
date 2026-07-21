import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { getSessionContext } from './SessionLayout'
import { bucket, sessionHooks } from '@/service/crudService'

import Button from '@/components/Button/Button'

function PoseReplay({ userId, techniqueData }) {
  const navigate = useNavigate()
  const { recording, setRecording } = getSessionContext()
  const [submitError, setSubmitError] = useState(null)

  const videoRef = useRef(null)
  const rafRef = useRef(null)

  const { mutateAsync: createSession, isPending: isSubmitting } = sessionHooks.putData(false)

  useEffect(() => {
    /** @type {HTMLVideoElement} */
    const video = videoRef.current
    if(!video) return

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick)
    }

    const handlePlay = () => { rafRef.current = requestAnimationFrame(tick) }
    const handlePause = () => cancelAnimationFrame(rafRef.current)
    const handleSeeked = () => {}

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('seeked', handleSeeked)
    video.addEventListener('loadeddata', handleSeeked)

    return () => {
      cancelAnimationFrame(rafRef.current)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('seeked', handleSeeked)
      video.removeEventListener('loadeddata', handleSeeked)
    }
  }, [recording.landmarks])

  const confirmRecording = async () => {
    if(!recording?.blob) return

    setSubmitError(null)

    try{
      const fileName = `${userId}/${crypto.randomUUID()}.webm`

      await bucket().upload(fileName, recording.blob, { contentType: 'video/webm' })
      const videoUrl = bucket().getUrl(fileName)

      const { data: [inserted] } = await createSession({
        user_id: userId,
        technique_id: techniqueData.id,
        video_url: videoUrl,
        duration_seconds: Math.round(recording.landmarks.at(-1)?.t ?? 0),
        frames: recording.landmarks,
      })

      navigate(`/app/feedback/${inserted.id}`)
    } catch(err){
      setSubmitError('Could not save this recording. Please try again.')
    }
  }

  return (
    <>
      <div className='flex w-100' style={{ aspectRatio: '16 / 9', maxWidth: '100%'}}>
        <video ref={videoRef} src={recording?.videoUrl} style={{ width: '100%', height: '100%' }} controls />
      </div>
      <Button
        btnType='secondary'
        text='Record again'
        onClick={() => setRecording(null)}
        disabled={isSubmitting}
      />
      <Button
        text={isSubmitting ? 'Uploading...' : 'Continue'}
        onClick={() => confirmRecording()}
        disabled={isSubmitting}
      />
      {submitError && <span>{submitError}</span>}
    </>
  )
}

export default PoseReplay