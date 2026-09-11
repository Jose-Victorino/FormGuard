import { useEffect, useRef, useState } from 'react'
import cn from 'classnames'
import { useSessionContext } from './SessionLayout'

import { createPoseLandmarker, isAllVisible } from './util/util'

import Button from '@/components/Button/Button'

import s from './VideoUpload.module.scss'

const ACCEPTED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']
const MAX_FILE_BYTES = 40 * 1024 * 1024 // 40MB
const SAMPLE_FPS = 30

/**
 * Wait for an off-DOM video element's metadata to be ready.
 * @param {HTMLVideoElement} video
 * @returns {Promise<void>}
 */
function _waitForMetadata(video){
  return new Promise((resolve, reject) => {
    const onReady = () => {
      video.removeEventListener('loadedmetadata', onReady)
      video.removeEventListener('error', onError)
      resolve()
    }
    const onError = (e) => {
      video.removeEventListener('loadedmetadata', onReady)
      video.removeEventListener('error', onError)
      reject(e)
    }
    video.addEventListener('loadedmetadata', onReady)
    video.addEventListener('error', onError)
  })
}

/**
 * Seek a video element to a timestamp (seconds) and resolve once the seek
 * completes, so the frame is ready for pose detection.
 * @param {HTMLVideoElement} video
 * @param {number} t
 * @returns {Promise<void>}
 */
function _seekTo(video, t){
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
      resolve()
    }
    const onError = (e) => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
      reject(e)
    }
    video.addEventListener('seeked', onSeeked)
    video.addEventListener('error', onError)
    video.currentTime = t
  })
}

/**
 * Step through an uploaded video file at SAMPLE_FPS, running pose detection
 * on each sampled frame, producing the same LandmarkFrame[] shape the live
 * webcam tracker records (see ./util/types LandmarkFrame) so downstream
 * consumers (PoseReplay, processRecording) don't need to know which path
 * a recording came from.
 * @param {File} file
 * @param {(pct: number) => void} onProgress
 * @returns {Promise<import('./util/types').LandmarkFrame[]>}
 */
async function _extractLandmarksFromFile(file, onProgress){
  const poseLandmarker = await createPoseLandmarker('VIDEO')
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.src = URL.createObjectURL(file)

  try{
    await _waitForMetadata(video)

    const duration = video.duration
    if(!isFinite(duration) || duration <= 0) throw new Error('Could not read video duration.')

    const frameInterval = 1 / SAMPLE_FPS
    const landmarks = []

    for(let t = 0; t < duration; t += frameInterval){
      await _seekTo(video, t)

      const result = await new Promise((resolve) => {
        poseLandmarker.detectForVideo(video, Math.round(t * 1000), resolve)
      })

      const imageLandmarks = result.landmarks?.[0]
      const worldLandmarks = result.worldLandmarks?.[0]
      if(imageLandmarks) landmarks.push({ t, imageLandmarks, worldLandmarks })

      onProgress?.(Math.min(1, t / duration))
    }

    return landmarks
  } finally{
    poseLandmarker.close()
    URL.revokeObjectURL(video.src)
  }
}

function VideoUpload() {
  const { setRecording, setIsInputLocked } = useSessionContext()
  const inputRef = useRef(null)

  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [warning, setWarning] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragDepthRef = useRef(0)

  const openFilePicker = () => inputRef.current?.click()

  const processFile = async (file) => {
    if(!file) return

    setError(null)
    setWarning(null)

    if(!ACCEPTED_TYPES.includes(file.type)){
      setError('Please upload a MP4, MOV, or WebM video.')
      return
    }
    if(file.size > MAX_FILE_BYTES){
      setError('That video is too large — please keep it under 40MB.')
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    setIsProcessing(true)
    setProgress(0)

    try{
      const landmarks = await _extractLandmarksFromFile(file, setProgress)

      if(landmarks.length === 0){
        setError('No pose was detected anywhere in this video. Try a different clip.')
        setIsProcessing(false)
        return
      }

      // Full-body visibility isn't required to proceed — partial/occluded
      // frames still carry usable landmarks — but flag it since analysis
      // quality depends on how much of the body stayed in frame.
      const anyFullyVisible = landmarks.some((frame) => isAllVisible(frame.imageLandmarks))
      if(!anyFullyVisible){
        setWarning('This video never shows the full body in frame at once, so analysis may be less accurate. You can still continue.')
      }

      setRecording?.({ videoUrl: objectUrl, blob: file, landmarks })
    } catch(err){
      console.error('Video upload processing failed:', err)
      setError('Could not process this video. Please try a different file.')
      setIsProcessing(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    processFile(file)
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    if(isProcessing || previewUrl) return
    dragDepthRef.current += 1
    setIsDragging(true)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    if(e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if(dragDepthRef.current === 0) setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    dragDepthRef.current = 0
    setIsDragging(false)
    if(isProcessing || previewUrl) return

    const file = e.dataTransfer?.files?.[0]
    processFile(file)
  }

  useEffect(() => {
    setIsInputLocked?.(isProcessing)
    return () => setIsInputLocked?.(false)
  }, [isProcessing, setIsInputLocked])

  const wrapperStyle = previewUrl ? {
    width: 'fit-content',
    maxWidth: '1200px',
    maxHeight: '80vh',
    marginInline: 'auto'
  } : {
    aspectRatio: '4 / 3',
    width: 'min(100%, 1200px, calc(80vh * 4 / 3))'
  }

  return (
    <>
      {error && <span className={s.error}>{error}</span>}
      {warning && <span className={s.warning}>{warning}</span>}

      <div className='flex j-center'>
        <div className='flex pos-r' style={wrapperStyle}>
          {previewUrl
            ? <video src={previewUrl} className='w-100' style={{maxWidth: '100%', maxHeight: '80vh', width: 'auto', height: 'auto'}} muted />
            : <div
                className={cn(s.dropzone, { [s.dragging]: isDragging })}
                onClick={openFilePicker}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <span>{isDragging ? 'Drop to upload' : 'Click or drag a video here'}</span>
                <span className={s.hint}>under 40MB</span>
              </div>
          }
          {isProcessing &&
            <div className={s.progressOverlay}>
              <span>Extracting pose… {Math.round(progress * 100)}%</span>
              <div className={s.progressTrack}>
                <div className={s.progressFill} style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            </div>
          }
        </div>
      </div>
      <input
        ref={inputRef}
        type='file'
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <Button
        text={previewUrl ? 'Choose a different video' : 'Upload Video'}
        onClick={openFilePicker}
        span
      />
    </>
  )
}

export default VideoUpload
