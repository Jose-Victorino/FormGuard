/** @typedef {import('./types').Landmark} Landmark */

import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

export const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
// 'lite' | 'full' | 'heavy'
export const MODEL_URL = '/models/MediaPipe/pose_landmarker_heavy.task'

/**
 * Spin up a PoseLandmarker instance with the settings shared by every
 * consumer (live webcam tracking, offline video-file processing).
 * @param {'VIDEO' | 'IMAGE'} runningMode
 * @returns {Promise<PoseLandmarker>}
 */
export async function createPoseLandmarker(runningMode = 'VIDEO'){
  const vision = await FilesetResolver.forVisionTasks(WASM_URL)
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: 'GPU',
    },
    runningMode,
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })
}

export const LANDMARKER = {
  nose: 0,
  left_eye_inner: 1, left_eye: 2, left_eye_outer: 3,
  right_eye_inner: 4, right_eye: 5, right_eye_outer: 6,
  left_ear: 7, right_ear: 8,
  left_mouth: 9, right_mouth: 10,
  
  left_shoulder: 11, right_shoulder: 12,
  left_elbow: 13, right_elbow: 14,
  left_wrist: 15, right_wrist: 16,
  
  left_pinky: 17, right_pinky: 18,
  left_index: 19, right_index: 20,
  left_thumb: 21, right_thumb: 22,

  left_hip: 23, right_hip: 24,
  left_knee: 25, right_knee: 26,
  left_ankle: 27, right_ankle: 28,
  left_heel: 29, right_heel: 30,
  left_foot_index: 31, right_foot_index: 32,
}

export const CORE_LANDMARK_INDICES = [
  LANDMARKER.left_shoulder, LANDMARKER.right_shoulder,
  LANDMARKER.left_elbow, LANDMARKER.right_elbow,
  LANDMARKER.left_wrist, LANDMARKER.right_wrist,
  LANDMARKER.left_index, LANDMARKER.right_index,
  LANDMARKER.left_hip, LANDMARKER.right_hip,
  LANDMARKER.left_knee, LANDMARKER.right_knee,
  LANDMARKER.left_ankle, LANDMARKER.right_ankle,
]

export const MIN_VISIBILITY = 0.6

export function drawCanvas({ctx, video, imageLandmarks, width, height}){
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(video, 0, 0, width, height)

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
}

/**
 * Whether the core body landmarks the pipeline depends on are both
 * confidently tracked and within frame bounds, for a SINGLE frame.
 *
 * A landmark's x/y is only meaningful evidence of true position when
 * MediaPipe is confident about it, so each core landmark must pass BOTH:
 *  - visibility > MIN_VISIBILITY (not occluded/guessed)
 *  - x, y within [0, 1] (actually in frame)
 * If visibility is low, the bounds check is skipped for that point rather
 * than failed — a turned stance naturally drops visibility on an occluded
 * joint without that joint being off-screen, and its coordinate in that
 * state isn't reliable either way.
 *
 * @param {Landmark[]} landmarks
 * @returns {Boolean}
 */
export function isAllVisible(landmarks) {
  if(!landmarks || landmarks.length === 0) return false

  return CORE_LANDMARK_INDICES.every((i) => {
    const lm = landmarks[i]
    if(!lm) return false
    const { x, y, visibility } = lm
    if((visibility ?? 0) <= MIN_VISIBILITY) return false
    return x >= 0 && x <= 1 && y >= 0 && y <= 1
  })
}