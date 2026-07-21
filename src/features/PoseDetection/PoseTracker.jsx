import { useState, useEffect, useRef } from 'react'
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import { getSessionContext } from './SessionLayout'

import { createPoseReadyGate, isAllVisible } from './util/util'

import Button from '@/components/Button/Button'

const FPS = 60
const POSE_HOLD_MS = 800
const POSE_LOSS_TOLERANCE_MS = 200
const COUNTDOWN_SECONDS = 3

// from Google's CDN at runtime, same as you would the wasm bundle.
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
// Swap "lite" for "full" or "heavy" for more accuracy at the cost of speed.
const MODEL_URL = '/models/MediaPipe/pose_landmarker_full.task'

// 'idle'      -> user hasn't clicked "Get Ready" yet
// 'waiting'   -> waiting for isAllVisible to hold steady (gate is ticking)
// 'countdown' -> pose confirmed, counting down; cancels back to 'waiting'
//                if pose is lost mid-countdown
// 'recording' -> MediaRecorder is active
function PoseTracker() {
  const { setRecording } = getSessionContext()

  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const landmarkLog = useRef([])
  const recordingStartTime = useRef(null)
  const sizeRef = useRef({ width: 768, height: 432 })

  const poseLandmarkerRef = useRef(null)
  const rafIdRef = useRef(null)
  const lastVideoTimeRef = useRef(-1)

  const [phase, setPhase] = useState('idle')
  const phaseRef = useRef('idle')
  const gateRef = useRef(null)
  const countdownIntervalRef = useRef(null)
 
  const [countdownValue, setCountdownValue] = useState(null)
  const [isBodyVisible, setIsBodyVisible] = useState(false)
  const [isModelReady, setIsModelReady] = useState(false)

  const setPhaseSynced = (next) => {
    phaseRef.current = next
    setPhase(next)
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

    /** @type {HTMLCanvasElement} */
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    let cancelled = false
    let stream = null
    
    /** @type {import('@mediapipe/tasks-vision').PoseLandmarkerCallback} */
    const handleResults = ((result) => {
      const { width, height } = sizeRef.current
      const imageLandmarks = result.landmarks?.[0]
      const worldLandmarks = result.worldLandmarks?.[0]
      /** @type {HTMLVideoElement} */
      const video = videoRef.current

      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(video, 0, 0, width, height)

      if(!imageLandmarks){
        setIsBodyVisible(false)
        if(phaseRef.current === 'countdown') cancelCountdown()
        return
      }

      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      PoseLandmarker.POSE_CONNECTIONS.forEach(({start, end}) => {
        const fromLandmark = imageLandmarks[start]
        const toLandmark = imageLandmarks[end]
        if(!fromLandmark || !toLandmark) return
        
        ctx.beginPath()
        ctx.moveTo(fromLandmark.x * width, fromLandmark.y * height)
        ctx.lineTo(toLandmark.x * width, toLandmark.y * height)
        ctx.stroke()
      })
      
      ctx.fillStyle = '#42f14a'
      imageLandmarks.forEach((landmark) => {
        const x = landmark.x * width
        const y = landmark.y * height
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, 2 * Math.PI)
        ctx.fill()
      })
      
      if(phaseRef.current === 'recording' && recordingStartTime.current !== null) {
        landmarkLog.current.push({
          t: (performance.now() - recordingStartTime.current) / 1000,
          imageLandmarks,
          worldLandmarks,
        })
      }

      const isWholeBodyVisible = isAllVisible(imageLandmarks)
      setIsBodyVisible(isWholeBodyVisible)
 
      if(phaseRef.current === 'waiting'){
        gateRef.current?.tick(imageLandmarks)
      } else if(phaseRef.current === 'countdown' && !isWholeBodyVisible){
        cancelCountdown()
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
      const vision = await FilesetResolver.forVisionTasks(WASM_URL)
      
      const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })

      if(cancelled){
        poseLandmarker.close()
        return
      }
      poseLandmarkerRef.current = poseLandmarker
      setIsModelReady(true)

      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 768, height: 432 },
        audio: false,
      })

      if(cancelled){
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      videoRef.current.srcObject = stream
      await videoRef.current.play()
      renderLoop()
    }

    setup()

    return () => {
      cancelled = true
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      stream?.getTracks().forEach((t) => t.stop())
      poseLandmarkerRef.current?.close()
      poseLandmarkerRef.current = null
    }
  }, [])

  // Countdown interval isn't owned by the mount-time effect above (it's
  // started/stopped from click handlers), so it needs its own unmount cleanup.
  useEffect(() => {
    return () => {
      if(countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [])

  const startRecording = () => {
    if(typeof MediaRecorder === 'undefined'){
      console.error('MediaRecorder not supported in this browser')
      return
    }

    const canvas = canvasRef.current
    const stream = canvas.captureStream(FPS)
    
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' })
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
  
  // Click "Get Ready": start watching for a steady, fully-visible pose.
  const beginWaiting = () => {
    gateRef.current = createPoseReadyGate({
      holdMs: POSE_HOLD_MS,
      lossToleranceMs: POSE_LOSS_TOLERANCE_MS,
      onReady: startCountdown,
    })
    setPhaseSynced('waiting')
  }

  // Gate fired: pose held steady long enough. Begin the visible countdown.
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
  }

  // Pose lost mid-countdown: cancel and drop back to 'waiting' rather than
  // all the way to 'idle' — the user hasn't given up, they just moved.
  const cancelCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    setCountdownValue(null)
    gateRef.current?.reset()
    setPhaseSynced('waiting')
  }

  // User explicitly backs out of "waiting" or "countdown" via the Cancel button.
  const cancelReady = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    setCountdownValue(null)
    gateRef.current = null
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

  return (
    <div>
      <div>
        <div ref={containerRef} className='pos-r w-100' style={{ aspectRatio: '16 / 9', maxWidth: '1200px'}}>
          <video ref={videoRef} className='pos-a w-100' style={{ height: '100%', visibility: 'hidden'}}/>
          <canvas ref={canvasRef} className='pos-a w-100' style={{ height: '100%' }} />
          {phase === 'countdown' && countdownValue !== null && (
            <div
              className='pos-a flex a-center j-center'
              style={{ inset: 0, fontSize: '96px', fontWeight: 700, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.6)', pointerEvents: 'none' }}
            >
              {countdownValue}
            </div>
          )}
        </div>
      </div>
      <div className='flex gap-10 a-center'>
        <Button
          text={buttonText}
          onClick={buttonAction}
          disabled={phase === 'idle' && !isModelReady}
        />
        {/* <Button text='Start Recording' onClick={() => startRecording()}/> */}
        {!isModelReady && <span>Loading video capture</span>}
        {phase === 'waiting' && !isBodyVisible && <span>Get your whole body in frame</span>}
        {phase === 'waiting' && isBodyVisible && <span>Hold still…</span>}
        {phase === 'countdown' && <span>Recording starts in {countdownValue}</span>}
      </div>
    </div>
  )
}

export default PoseTracker