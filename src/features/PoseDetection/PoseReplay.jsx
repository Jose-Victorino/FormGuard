import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useSessionContext } from './SessionLayout'
import { bucket, sessionHooks } from '@/service/crudService'

import Button from '@/components/Button/Button'
import { processRecording } from './util/poseProcessing'

function PoseReplay({ userId, techniqueData }) {
  const navigate = useNavigate()
  const { recording, setRecording } = useSessionContext()
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
      const now = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Manila",
        month: "numeric",
        day: "numeric",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).replace(/[/:,\s]+/g, "-")

      // recording.blob is a webm Blob when it came from the live webcam
      // recorder, but an arbitrary File (mp4/mov/ogg/webm) when it came from
      // VideoUpload — keep the real content type/extension either way.
      const contentType = recording.blob.type || 'video/webm'
      const extension = contentType.split('/')[1]?.split(';')[0] || 'webm'
      const fileName = `${userId}/${crypto.randomUUID()}_${now}.${extension}`

      await bucket().upload(fileName, recording.blob, { contentType })
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
      console.error('Could not save recording:', err)
      setSubmitError('Could not save this recording. Please try again.')
    }

    const result = await processRecording({
      progressCallback: (pct, msg) => console.log(pct, msg),
      videoUrl: recording.videoUrl,
      landmarks: recording.landmarks,
      technique: techniqueData.name,
      variant: techniqueData.variation,
      racketSide: 'right',
      debug: true
    })
    console.log(result) //? next step, phase & debug response
  }

  return (
    <>
      <div className='flex' style={{ aspectRatio: '4 / 3', width: 'min(100%, 1200px, calc(80vh * 4 / 3))' }}>
        <video ref={videoRef} src={recording?.videoUrl} style={{ width: '100%', height: '100%' }} controls />
      </div>
      <div className='flex gap-15'>
        <Button
          btnType='secondary'
          text='Record again'
          onClick={() => setRecording(null)}
          span
          disabled={isSubmitting}
          />
        <Button
          text={isSubmitting ? 'Uploading...' : 'Continue'}
          onClick={() => confirmRecording()}
          span
          disabled={isSubmitting}
        />
      </div>
      {submitError && <span>{submitError}</span>}
    </>
  )
}

export default PoseReplay