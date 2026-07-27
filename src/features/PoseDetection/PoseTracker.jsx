import { useState, useEffect, useRef } from 'react'
import { NavLink } from 'react-router'
import { useSessionContext } from './SessionLayout'

import { createPoseLandmarker, createPoseReadyGate, drawCanvas, isAllVisible } from './util/util'

import Button from '@/components/Button/Button'

import s from './PoseTracker.module.scss'

const POSE_HOLD_MS = 800
const POSE_LOSS_TOLERANCE_MS = 200
const COUNTDOWN_SECONDS = 3

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

// 'idle'      -> user hasn't clicked "Get Ready" yet
// 'waiting'   -> waiting for isAllVisible to hold steady (gate is ticking)
// 'countdown' -> pose confirmed, counting down; cancels back to 'waiting'
//                if pose is lost mid-countdown
// 'recording' -> MediaRecorder is active
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
  // The raw camera stream (no drawn skeleton) — recorded as-is so the saved
  // video is clean footage; the canvas is overlay for live display only.
  const cameraStreamRef = useRef(null)

  const [phase, setPhase] = useState('idle')
  const phaseRef = useRef('idle')
  const gateRef = useRef(null)
  const countdownIntervalRef = useRef(null)
  const countdownLossSinceRef = useRef(null)
 
  const [countdownValue, setCountdownValue] = useState(null)
  const [isBodyVisible, setIsBodyVisible] = useState(false)
 
  // Split "model loaded" from "camera streaming" so the UI doesn't claim
  // readiness before video is actually playing (issue #1).
  const [isModelReady, setIsModelReady] = useState(false)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [setupError, setSetupError] = useState(null)

  const isReady = isModelReady && isCameraReady
  const isCancelPhase = phase === 'waiting' || phase === 'countdown'

  const setPhaseSynced = (next) => {
    phaseRef.current = next
    setPhase(next)
  }

  const startRecording = () => {
    const mimeType = _getSupportedMimeType()
    if(!mimeType){
      console.error('No supported MediaRecorder mimeType found in this browser')
      setSetupError('Recording is not supported in this browser.')
      setPhaseSynced('idle')
      return
    }

    const stream = cameraStreamRef.current
    if(!stream){
      console.error('No camera stream available to record from')
      setSetupError('Recording could not be started in this browser.')
      setPhaseSynced('idle')
      return
    }

    let recorder
    try{
      recorder = new MediaRecorder(stream, { mimeType })
    } catch(err){
      console.error('Failed to start MediaRecorder:', err)
      setSetupError('Recording could not be started in this browser.')
      setPhaseSynced('idle')
      return
    }

    chunksRef.current = []
    landmarkLog.current = []
    recordingStartTime.current = performance.now()
    setPhaseSynced('recording')

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
    setPhaseSynced('idle')
    recorderRef.current?.stop()
  }

  const beginWaiting = () => {
    gateRef.current = createPoseReadyGate({
      holdMs: POSE_HOLD_MS,
      onReady: startCountdown,
    })
    setPhaseSynced('waiting')
  }

  const startCountdown = () => {
    setPhaseSynced('countdown')
    let remaining = COUNTDOWN_SECONDS
    setCountdownValue(remaining)

    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1
      if(remaining <= 0){
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
        setCountdownValue(null)
        startRecording()
      } else{
        setCountdownValue(remaining)
      }
    }, 1000)
    countdownLossSinceRef.current = null
  }

  const cancelCountdown = () => {
    if(countdownIntervalRef.current){
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    setCountdownValue(null)
    gateRef.current?.reset()
    setPhaseSynced('waiting')
  }

  const cancelReady = () => {
    if(countdownIntervalRef.current){
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    setCountdownValue(null)
    gateRef.current = null
    countdownLossSinceRef.current = null
    setPhaseSynced('idle')
  }

  const buttonText = {
    idle: 'Get Ready',
    waiting: 'Cancel',
    countdown: 'Cancel',
    recording: 'Stop Recording',
  }[phase]

  const buttonAction = {
    idle: beginWaiting,
    waiting: cancelReady,
    countdown: cancelReady,
    recording: stopRecording,
  }[phase]

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

      const handlePotentialCountdownLoss = (visible, now) => {
        if(phaseRef.current !== 'countdown') return
        if(visible){
          countdownLossSinceRef.current = null
          return
        }
        if(countdownLossSinceRef.current === null) countdownLossSinceRef.current = now
        if(now - countdownLossSinceRef.current >= POSE_LOSS_TOLERANCE_MS){
          countdownLossSinceRef.current = null
          cancelCountdown()
        }
      }

      if(!imageLandmarks){
        setIsBodyVisible(false)
        if(phaseRef.current === 'countdown') handlePotentialCountdownLoss(!!imageLandmarks && isWholeBodyVisible, performance.now())
        return
      }

      drawCanvas({
        ctx: canvasRef.current.getContext('2d'),
        video: videoRef.current,
        imageLandmarks,
        width: sizeRef.current.width,
        height: sizeRef.current.height,
      })
      
      if(phaseRef.current === 'recording' && recordingStartTime.current !== null) {
        landmarkLog.current.push({
          t: (performance.now() - recordingStartTime.current) / 1000,
          imageLandmarks,
          worldLandmarks,
        })
      }
 
      if(phaseRef.current === 'waiting'){
        gateRef.current?.tick(isWholeBodyVisible)
      } else if(phaseRef.current === 'countdown' && !isWholeBodyVisible){
        handlePotentialCountdownLoss(!!imageLandmarks && isWholeBodyVisible, performance.now())
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

  useEffect(() => {
    return () => {
      if(countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [])

  // Lock the Record/Upload Video mode switch while the pose gate is armed
  // (phase 'waiting') so switching away doesn't leave it ticking in the
  // background.
  useEffect(() => {
    setIsInputLocked?.(phase === 'waiting')
    return () => setIsInputLocked?.(false)
  }, [phase, setIsInputLocked])

  return (
    <>
      <div className='flex-col a-center gap-5'>
        <p className={s.note}>Camera must be in front 30°-45° degrees towards your racket side (configured in <NavLink to="/app/profile" className='text-link'>Profile</NavLink>)</p>
        <div ref={containerRef} className='pos-r' style={{ width: 'min(100%, 1200px, calc(80vh * 4 / 3))', aspectRatio: '4 / 3' }}>
          <video ref={videoRef} className='pos-a w-100' style={{ height: '100%', visibility: 'hidden'}}/>
          <canvas ref={canvasRef} className='pos-a w-100' style={{ height: '100%' }} />
          <div className={s.phaseText}>
            {setupError ? <span>{setupError}</span> :
              <>
                {!isReady && <span>Loading video capture</span>}
                {phase === 'waiting' && !isBodyVisible && <span>Get your whole body in frame</span>}
                {phase === 'waiting' && isBodyVisible && <span>Hold still…</span>}
                {phase === 'countdown' && countdownValue !== null && <span>Recording starts in {countdownValue}</span>}
              </>
            }
          </div>
        </div>
      </div>
      <Button
        text={buttonText}
        color={isCancelPhase ? 'red' : 'blue'}
        onClick={buttonAction}
        disabled={!!setupError || (phase === 'idle' && !isReady)}
        span
      />
      {/* <Button text='Start Recording' onClick={() => startRecording()}/> */}
    </>
  )
}

export default PoseTracker