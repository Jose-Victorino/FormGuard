import { useState, useEffect, useRef } from 'react'
import { NavLink } from 'react-router'
import { useSessionContext } from './SessionLayout'

import { createPoseLandmarker, drawCanvas, isAllVisible } from './util/util'

import Button from '@/components/Button/Button'

import s from './PoseTracker.module.scss'

const RECORDER_MIME_CANDIDATES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4',
]

const _getSupportedMimeType = () => {
  if(typeof MediaRecorder === 'undefined') return null
  return RECORDER_MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null
}

function PoseTracker() {
  const { setRecording, setIsInputLocked } = useSessionContext()

  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const landmarkLog = useRef([])
  const recordingStartTime = useRef(null)
  const sizeRef = useRef({ width: 768, height: 576 })

  const poseLandmarkerRef = useRef(null)
  const rafIdRef = useRef(null)
  const lastVideoTimeRef = useRef(-1)
  const cameraStreamRef = useRef(null)

  const [isRecording, setIsRecording] = useState(false)
  const isRecordingRef = useRef(false)

  const [isBodyVisible, setIsBodyVisible] = useState(false)

  const [isModelReady, setIsModelReady] = useState(false)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [setupError, setSetupError] = useState(null)

  const isReady = isModelReady && isCameraReady

  const setRecordingSynced = (next) => {
    isRecordingRef.current = next
    setIsRecording(next)
  }

  const startRecording = () => {
    const mimeType = _getSupportedMimeType()
    if(!mimeType){
      console.error('No supported MediaRecorder mimeType found in this browser')
      setSetupError('Recording is not supported in this browser.')
      setRecordingSynced(false)
      return
    }

    const stream = cameraStreamRef.current
    if(!stream){
      console.error('No camera stream available to record from')
      setSetupError('Recording could not be started in this browser.')
      setRecordingSynced(false)
      return
    }

    let recorder
    try{
      recorder = new MediaRecorder(stream, { mimeType })
    } catch(err){
      console.error('Failed to start MediaRecorder:', err)
      setSetupError('Recording could not be started in this browser.')
      setRecordingSynced(false)
      return
    }

    chunksRef.current = []
    landmarkLog.current = []
    recordingStartTime.current = performance.now()
    setRecordingSynced(true)

    recorder.ondataavailable = (e) => {
      if(e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      setRecording?.({ videoUrl: URL.createObjectURL(blob), blob, landmarks: landmarkLog.current })
    }

    recorder.start()
    recorderRef.current = recorder
  }

  const stopRecording = () => {
    setRecordingSynced(false)
    recorderRef.current?.stop()
  }

  useEffect(() => {
    if(!containerRef.current || !canvasRef.current) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      const { width, height } = entry.contentRect
      if(width === 0 || height === 0) return

      sizeRef.current = { width, height }
      canvasRef.current.width = width
      canvasRef.current.height = height
    })

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if(!videoRef.current || !canvasRef.current) return

    let cancelled = false
    let stream = null
    
    /** @type {import('@mediapipe/tasks-vision').PoseLandmarkerCallback} */
    const handleResults = ((result) => {
      const imageLandmarks = result.landmarks?.[0]
      const worldLandmarks = result.worldLandmarks?.[0]

      const isWholeBodyVisible = isAllVisible(imageLandmarks)
      setIsBodyVisible(isWholeBodyVisible)

      if(!imageLandmarks){
        setIsBodyVisible(false)
        return
      }

      drawCanvas({
        ctx: canvasRef.current.getContext('2d'),
        video: videoRef.current,
        imageLandmarks,
        width: sizeRef.current.width,
        height: sizeRef.current.height,
      })
      
      if(isRecordingRef.current && recordingStartTime.current !== null) {
        landmarkLog.current.push({
          t: (performance.now() - recordingStartTime.current) / 1000,
          imageLandmarks,
          worldLandmarks,
        })
      }
    })

    const renderLoop = () => {
      const video = videoRef.current
      /** @type {import('@mediapipe/tasks-vision').PoseLandmarker} */
      const poseLandmarker = poseLandmarkerRef.current
      if(!video || !poseLandmarker) return

      if(video.currentTime !== lastVideoTimeRef.current){
        lastVideoTimeRef.current = video.currentTime
        poseLandmarker.detectForVideo(video, performance.now(), handleResults)
      }

      rafIdRef.current = requestAnimationFrame(renderLoop)
    }

    const setup = async () => {
      try{
        const poseLandmarker = await createPoseLandmarker('VIDEO')

        if(cancelled){
          poseLandmarker.close()
          return
        }
        poseLandmarkerRef.current = poseLandmarker
        setIsModelReady(true)

        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 768 }, height: { ideal: 576 }, aspectRatio: { ideal: 4 / 3 } },
          audio: false,
        })

        if(cancelled){
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        cameraStreamRef.current = stream
        videoRef.current.srcObject = stream
        await videoRef.current.play()

        if(cancelled) return

        setIsCameraReady(true)
        renderLoop()
      } catch(err){
        if(cancelled) return
        console.error('PoseTracker setup failed:', err)
        setSetupError(
          err?.name === 'NotAllowedError'
            ? 'Camera access was denied. Please allow camera access and reload.'
            : 'Could not start the camera or pose model. Please reload and try again.'
        )
      }
    }

    setup()

    return () => {
      cancelled = true
      if(rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      stream?.getTracks().forEach((t) => t.stop())
      cameraStreamRef.current = null
      poseLandmarkerRef.current?.close()
      poseLandmarkerRef.current = null
    }
  }, [])

  // Lock the Record/Upload Video mode switch while the pose gate is armed
  // (isRecording) so switching away doesn't leave it ticking in the
  // background.
  useEffect(() => {
    setIsInputLocked?.(isRecording)
    return () => setIsInputLocked?.(false)
  }, [isRecording, setIsInputLocked])

  return (
    <>
      <div className='flex-col a-center gap-5'>
        <div ref={containerRef} className='pos-r' style={{ width: 'min(100%, 1200px, calc(80vh * 4 / 3))', aspectRatio: '4 / 3' }}>
          <video ref={videoRef} className='pos-a w-100' style={{ height: '100%', visibility: 'hidden'}}/>
          <canvas ref={canvasRef} className='pos-a w-100' style={{ height: '100%' }} />
          <div className={s.phaseText}>
            {setupError ? <span>{setupError}</span> :
              <>
                {!isReady && <span>Loading video capture</span>}
                {isReady && !isBodyVisible && <span>Get your whole body in frame</span>}
              </>
            }
          </div>
        </div>
      </div>
      <Button
        text={isRecording ? 'Stop Recording' : 'Start Recording'}
        onClick={() => isRecording ? stopRecording() : startRecording()}
        span
      />
    </>
  )
}

export default PoseTracker