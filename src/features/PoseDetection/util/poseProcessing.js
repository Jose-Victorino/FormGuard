import { LANDMARKER, MIN_VISIBILITY } from './util'

/**
 * @typedef {import('./types').Landmark} Landmark
 * @typedef {import('./types').LandmarkFrame} LandmarkFrame
 * @typedef {'right_elbow' | 'left_elbow' | 'right_knee' | 'left_knee' | 'torso_lean' | 'torso_rotation' | 'right_wrist_angle' | 'left_wrist_angle'} AngleKeys
 * @typedef {'preparation' | 'backswing' | 'contact' | 'follow_through'} PhaseLabels
 * @typedef {'serve' | 'clear' | 'smash'} Technique
 * @typedef {'forehand' | 'backhand'} TechniqueVariant
 * @typedef {LandmarkFrame & {
 *  angles: Record<AngleKeys, number>,
 * }} Frames
 * @typedef {Array<Frames & {label: PhaseLabels, value: number | null}>} Phases
 * @typedef {{
 *  powerMetric: {max: number},
 *  informational: {mean: number}
 * }} AngularVelocityStat
 * @typedef {Record<AngleKeys, AngularVelocityStat | null>} AngularVelocity
 * @typedef {{
 *  rangeOfMotion: {min: number, max: number},
 *  informational: {avg: number, std: number}
 * } | null} AngleStats
 * @typedef {Record<AngleKeys, AngleStats | null>} AllAngleStats
 * @typedef {{
 *  metric: 'wristSpeed' | 'elbowAngularVelocity',
 *  acceleration: {mean: number, max: number},
 *  deceleration: {mean: number, max: number},
 * }} VelocityProfile
 * @typedef {{
 *  hipPeakTime: number,
 *  shoulderPeakTime: number,
 *  leadTime: number,
 *  hipPeakAngularVelocity: number,
 *  shoulderPeakAngularVelocity: number
 * } | null} KinematicSequence
 * @typedef {{
 *  totalSamples: number,
 *  analyzedSamples: number,
 *  duration: number,
 *  angleStats: AllAngleStats | {},
 *  angularVelocity: AngularVelocity | {},
 *  phases: Phases,
 *  velocityProfile: VelocityProfile | {},
 *  kinematicSequence: KinematicSequence | {},
 *  avatarImage: string | null,
 *  debugOutput?: PhaseDetectionDebug
 * }} PoseStats
 */
/**
 * @typedef {{
 *  wristCoverage?: number,
 *  contactMetricUsed?: 'wristSpeed' | 'elbowAngularVelocity',
 *  wristSpeedSeries?: Array<number|undefined>,
 *  wristHeightSeries?: Array<number|undefined>
 *  elbowAngVelSeries?: Array<number|undefined>,
 *  hipRotVelSeries?: Array<number|undefined>,
 *  thresholdsUsed?: {wristCoverageThreshold: number, followThroughRatio: number, backswingMethod: 'elbowFlexion' | 'wristHeight' },
 *  shoulderRotVelSeries?: Array<number|undefined>,
 *  hipRotationRange?: {min: number, max: number} | null,
 *  shoulderRotationRange?: {min: number, max: number} | null,
 *  followThroughCandidateSelfRelative?: {idx: number, time: number, value: number} | null,
 *  midpointContactCandidate?: {time: number} | null,
 *  contactPhaseSkipped?: boolean,
 *  decayPeakReference?: {idx: number, time: number, value: number} | null,
 * }} PhaseDetectionDebug
 */
/**
 * @typedef {{
 *  wristCoverageThreshold: number,
 *  followThroughRatio: number,
 *  backswingMethod: 'elbowFlexion' | 'wristHeight',
 * }} Threshold
 */
/** @type {Record<string, Threshold>} */
const TECHNIQUE_THRESHOLDS = {
  'clear.forehand': { wristCoverageThreshold: 0.18, followThroughRatio: 0.011, backswingMethod: 'elbowFlexion' }, // yy
  'clear.backhand': { wristCoverageThreshold: 0.5, followThroughRatio: 0.25, backswingMethod: 'elbowFlexion' },   // everything is off
  'smash.forehand': { wristCoverageThreshold: 0.5, followThroughRatio: 0.15, backswingMethod: 'elbowFlexion' },   // acceptable
  'smash.backhand': { wristCoverageThreshold: 0.5, followThroughRatio: 0.25, backswingMethod: 'elbowFlexion' },   // yy
  'serve.forehand': { wristCoverageThreshold: 0.5, followThroughRatio: 0.28, backswingMethod: 'wristHeight' },    // yy
  'serve.backhand': { wristCoverageThreshold: 0.5, followThroughRatio: 0.0095, backswingMethod: 'wristHeight' },
}
/** @type {Threshold} */
const DEFAULT_THRESHOLDS = { wristCoverageThreshold: 0.5, followThroughRatio: 0.25, backswingMethod: 'elbowFlexion' }
const DEFAULT_VARIANT = 'forehand'

const ANGLE_KEYS = /** @type {AngleKeys[]} */ ([
  'right_elbow', 'left_elbow', 'right_knee', 'left_knee',
  'torso_lean', 'torso_rotation', 'right_wrist_angle', 'left_wrist_angle',
])

/**
 * Calculates the sample standard deviation of an array.
 * @param {number[]} values
 * @param {number} mean
 */
function _stdev(values, mean){
  if(values.length <= 1) return 0.0

  const sumSq = values.reduce((acc, v) => acc + (v - mean) ** 2, 0)
  return Math.sqrt(sumSq / (values.length - 1))
}

/**
 * Rounds a number to a specific number of decimal places.
 * @param {number} n - number
 * @param {number} d - decimal place
 */
function _round(n, d = 1){
  const f = 10 ** d
  return Math.round(n * f) / f
}

/**
 * Calculates the arithmetic mean (average) of an array of numbers.
 * @param {number[]} val 
 * @returns {number}
 */
function _mean(val){
  return val.reduce((a, b) => a + b, 0) / val.length
}

/**
 * Wrap an angle in degrees to (-180, 180].
 * @param {number} deg
 * @returns {number}
 */
function _wrapAngle180(deg){
  let a = deg % 360
  if(a > 180) a -= 360
  if(a <= -180) a += 360
  return a
}

/**
 * Wrap-safe angular difference in degrees — handles angles that wrap at
 * ±180 (like torso_rotation), while being a no-op for angles that never
 * wrap (elbow/knee flexion, which stay within 0-180 and are unaffected).
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function _angleDelta(a, b){
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

/**
 * Index of the min/max value in `values`, restricted to `indices`, skipping
 * undefined entries. Returns null if no valid entry exists in the range.
 * @param {Array<number | undefined>} values
 * @param {number[]} indices
 * @param {'min' | 'max'} mode
 * @returns {number | null}
 */
function _argExtreme(values, indices, mode){
  let bestIdx = null
  let bestVal = mode === 'min' ? Infinity : -Infinity

  for(const i of indices){
    const v = values[i]
    if(v === undefined) continue
    if((mode === 'min' && v < bestVal) || (mode === 'max' && v > bestVal)){
      bestVal = v
      bestIdx = i
    }
  }

  return bestIdx
}

/**
 * Mean/max of a per-frame metric array over an inclusive index range,
 * skipping undefined entries. Returns null if no valid values in range.
 * @param {Array<number | undefined>} metricArr
 * @param {number} startIdx
 * @param {number} endIdx
 * @returns {{mean: number, max: number} | null}
 */
function _windowStats(metricArr, startIdx, endIdx){
  const vals = []
  for(let i = startIdx; i <= endIdx; i++){
    if(metricArr[i] !== undefined) vals.push(metricArr[i])
  }
  if(!vals.length) return null
  return { mean: _round(_mean(vals)), max: _round(Math.max(...vals)) }
}

/**
 * Compute the angle formed by p1-p2-p3 (vertex at p2), in degrees.
 * Works in 3D using {x, y, z} — an upgrade over the original 2D-only
 * version, since worldLandmarks carry real depth. 
 * @param {{x:number, y:number, z:number}} p1
 * @param {{x:number, y:number, z:number}} p2
 * @param {{x:number, y:number, z:number}} p3
 * @returns {number} angle in degrees
 */
function calcAngle(p1, p2, p3){
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y, z: p1.z - p2.z }
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: p3.z - p2.z }

  const mag1 = Math.hypot(v1.x, v1.y, v1.z)
  const mag2 = Math.hypot(v2.x, v2.y, v2.z)

  const norm = mag1 * mag2

  if(norm < 1e-6) return 0.0

  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z
  const cosA = Math.min(1, Math.max(-1, dot / norm)) // clip to [-1, 1]

  return (Math.acos(cosA) * 180) / Math.PI
}

/**
 * Compute range-of-motion and informational stats for a list of angle values.
 * Returns null for an empty list.
 *
 * `rangeOfMotion` (min/max) is the metric safe to use for technique
 * comparison — it survives being computed over a single stroke's mixed
 * phases. `informational` (avg/std) blends physically distinct phases
 * (prep/backswing/contact/follow-through) into a number that represents no
 * real moment in the stroke — kept for display/debugging only, deliberately
 * separated so comparison logic can't reach for it by accident. See
 * phaseDetection() for phase-anchored angles, which is the right tool for
 * phase-specific comparison.
 * @param {number[]} values
 * @returns {AngleStats}
 */
function angleStats(values){
  if(!values || values.length === 0) return null

  const mean = _mean(values)

  return {
    rangeOfMotion: {
      min: _round(Math.min(...values)),
      max: _round(Math.max(...values)),
    },
    informational: {
      avg: _round(mean),
      std: _round(_stdev(values, mean)),
    }
  }
}

/**
 * Extract eight key angles from one person's 33 MediaPipe landmarks.
 * All joints involved in each calculation must have visibility > 0.5
 * otherwise that angle is recorded as missing.
 * @param {Landmark[]} worldLandmarks
 * @param {{visibilityThreshold?: number}} options
 * @returns {Record<AngleKeys, number>}
 */
function extractAngles(worldLandmarks, { visibilityThreshold }){
  const {
    left_shoulder, right_shoulder,
    left_elbow, right_elbow,
    left_wrist, right_wrist, 
    left_index, right_index,
    left_hip, right_hip,
    left_knee, right_knee,
    left_ankle, right_ankle,
  } = LANDMARKER

  const visOk = (...indices) => indices.every((i) => (worldLandmarks[i]?.visibility ?? 0) > visibilityThreshold)

  const ls = worldLandmarks[left_shoulder]
  const rs = worldLandmarks[right_shoulder]
  const lh = worldLandmarks[left_hip]
  const rh = worldLandmarks[right_hip]
  const angles = {}

  if(visOk(right_shoulder, right_elbow, right_wrist))
    angles.right_elbow = calcAngle(rs, worldLandmarks[right_elbow], worldLandmarks[right_wrist])

  if(visOk(left_shoulder, left_elbow, left_wrist))
    angles.left_elbow = calcAngle(ls, worldLandmarks[left_elbow], worldLandmarks[left_wrist])

  if(visOk(right_elbow, right_wrist, right_index))
    angles.right_wrist_angle = calcAngle(worldLandmarks[right_elbow], worldLandmarks[right_wrist], worldLandmarks[right_index])

  if(visOk(left_elbow, left_wrist, left_index))
    angles.left_wrist_angle = calcAngle(worldLandmarks[left_elbow], worldLandmarks[left_wrist], worldLandmarks[left_index])

  if(visOk(right_hip, right_knee, right_ankle))
    angles.right_knee = calcAngle(rh, worldLandmarks[right_knee], worldLandmarks[right_ankle])

  if(visOk(left_hip, left_knee, left_ankle))
    angles.left_knee = calcAngle(lh, worldLandmarks[left_knee], worldLandmarks[left_ankle])

  // Shared prerequisite for both torso_lean (frontal-plane tilt) and
  // torso_rotation (transverse-plane twist): need both shoulders + both hips.
  if(visOk(left_shoulder, right_shoulder, left_hip, right_hip)){
    // --- torso_lean: frontal-plane tilt (existing) ---
    const shoulderMid = {
      x: (ls.x + rs.x) / 2,
      y: (ls.y + rs.y) / 2,
    }
    const hipMid = {
      x: (lh.x + rh.x) / 2,
      y: (lh.y + rh.y) / 2,
    }
    const torsoVec = { x: shoulderMid.x - hipMid.x, y: shoulderMid.y - hipMid.y }
    const norm = Math.hypot(torsoVec.x, torsoVec.y)

    if(norm > 1e-6){
      // Vertical reference is (0, -1): "up" in a y-down coordinate system,
      // matching MediaPipe's convention for both image and world landmarks.
      const cosA = Math.min(1, Math.max(-1, (torsoVec.y * -1) / norm))
      let lean = (Math.acos(cosA) * 180) / Math.PI
      if(torsoVec.x > 0) lean = -lean
      angles.torso_lean = lean
    }

    // --- torso_rotation: transverse-plane twist ---
    // Hip-shoulder separation angle ("X-factor"): how far the shoulder line
    // has rotated relative to the hip line about the vertical (y) axis.
    // Projects both segments onto the horizontal (x/z) plane and takes the
    // signed angular difference between their orientations.
    // Positive/negative sign indicates rotation direction; treat as
    // consistent within one recording, but note sign convention isn't tied
    // to racket side — a left- vs right-handed player's "coil" direction
    // will read with opposite signs. Fine for range-of-motion comparison
    // (min/max), worth revisiting if a signed same-direction comparison
    // across players is needed later.
    const shoulderVecXZ = { x: rs.x - ls.x, z: rs.z - ls.z }
    const hipVecXZ = { x: rh.x - lh.x, z: rh.z - lh.z }
    const shoulderNorm = Math.hypot(shoulderVecXZ.x, shoulderVecXZ.z)
    const hipNorm = Math.hypot(hipVecXZ.x, hipVecXZ.z)

    if(shoulderNorm > 1e-6 && hipNorm > 1e-6){
      const shoulderTheta = Math.atan2(shoulderVecXZ.z, shoulderVecXZ.x) * (180 / Math.PI)
      const hipTheta = Math.atan2(hipVecXZ.z, hipVecXZ.x) * (180 / Math.PI)
      angles.torso_rotation = _wrapAngle180(shoulderTheta - hipTheta)
    }
  }

  return angles
}

/**
 * Compute angular velocity (degrees/second) for each angle across a sequence
 * of frames belonging to a single subject. Calculated as the difference in
 * valid angles between adjacent frames divided by the actual time delta.
 * @param {Array<{t: number, angles: Object<AngleKeys, number>}>} frames sorted by t ascending
 * @returns {AngularVelocity}
 */
function computeAngularVelocity(frames){
  const velSeries = /** @type {Record<AngleKeys, number[]>} */ (Object.fromEntries(ANGLE_KEYS.map(k => [k, []])))

  for(let i = 1; i < frames.length; i++){
    const prev = frames[i - 1]
    const curr = frames[i]
    const dt = curr.t - prev.t

    if(dt <= 0) continue

    for(const key of ANGLE_KEYS){
      const v0 = prev.angles[key]
      const v1 = curr.angles[key]
      if(v0 !== undefined && v1 !== undefined){
        velSeries[key].push(_angleDelta(v1, v0) / dt)
      }
    }
  }

  const result = /** @type {AngularVelocity} */ (Object.fromEntries(ANGLE_KEYS.map(k => [k, null])))
  for(const [key, vels] of Object.entries(velSeries)){
    if(vels.length){
      result[key] = {
        powerMetric: { max: _round(Math.max(...vels)) },
        informational: { mean: _round(_mean(vels)) },
      }
    }
  }

  return result
}

/**
 * Load a video element off-DOM and resolve once its metadata (dimensions,
 * duration) is available.
 * @param {string} videoUrl
 * @returns {Promise<HTMLVideoElement>}
 */
function loadVideo(videoUrl){
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.crossOrigin = 'anonymous'
    video.src = videoUrl
 
    const onReady = () => {
      video.removeEventListener('loadedmetadata', onReady)
      video.removeEventListener('error', onError)
      resolve(video)
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
 * completes, so the frame is ready to draw.
 * @param {HTMLVideoElement} videoEl
 * @param {number} t
 * @returns {Promise<void>}
 */
function _seekVideoTo(videoEl, t){
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      videoEl.removeEventListener('seeked', onSeeked)
      videoEl.removeEventListener('error', onError)
      resolve()
    }
    const onError = (e) => {
      videoEl.removeEventListener('seeked', onSeeked)
      videoEl.removeEventListener('error', onError)
      reject(e)
    }
    videoEl.addEventListener('seeked', onSeeked)
    videoEl.addEventListener('error', onError)
    videoEl.currentTime = t
  })
}

/** @typedef {{visibilityThreshold?: number, padding?: number, maxDim?: number, quality?: number}} AvatarOptions */
/**
 * Seek to timestamp `t` in the video, crop around the person using their
 * imageLandmarks bounding extents (with padding), and return a base64 JPEG
 * data URL suitable for use as an avatar image.
 * @param {string} videoUrl
 * @param {number} t timestamp in seconds
 * @param {Landmark[]} imageLandmarks normalized [0,1] landmarks for this frame
 * @param {AvatarOptions} [opts]
 * @returns {Promise<string | null>}
 */
export async function extractAvatar(videoUrl, t, imageLandmarks, opts = {}){
  const {
    visibilityThreshold = MIN_VISIBILITY,
    padding = 0.12,
    maxDim = 320,
    quality = 0.88,
  } = opts
 
  let videoEl
  try{
    videoEl = await loadVideo(videoUrl)
    await _seekVideoTo(videoEl, t)
 
    const vw = videoEl.videoWidth
    const vh = videoEl.videoHeight
    if(!vw || !vh) return null
 
    const visiblePts = imageLandmarks.filter((p) => (p.visibility ?? 1) > visibilityThreshold)
    if(visiblePts.length === 0) return null
 
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
    for(const p of visiblePts){
      const px = p.x * vw
      const py = p.y * vh
      if(px < x1) x1 = px
      if(py < y1) y1 = py
      if(px > x2) x2 = px
      if(py > y2) y2 = py
    }
 
    // 12% padding so shoulders and head are clearly visible
    const padX = (x2 - x1) * padding
    const padY = (y2 - y1) * padding
    x1 -= padX
    y1 -= padY
    x2 += padX
    y2 += padY
 
    let cropW = x2 - x1
    let cropH = y2 - y1

    // Force a 4:3 aspect ratio by expanding the shorter dimension.
    const targetAspect = 4 / 3
    const currentAspect = cropW / cropH

    const cx = (x1 + x2) / 2
    const cy = (y1 + y2) / 2

    if(currentAspect > targetAspect){
      cropH = cropW / targetAspect
    }else{
      cropW = cropH * targetAspect
    }

    x1 = cx - cropW / 2
    x2 = cx + cropW / 2
    y1 = cy - cropH / 2
    y2 = cy + cropH / 2

    // Clamp to the video bounds while preserving the aspect ratio.
    if(x1 < 0){
      x2 -= x1
      x1 = 0
    }
    if(x2 > vw){
      x1 -= x2 - vw
      x2 = vw
    }
    if(y1 < 0){
      y2 -= y1
      y1 = 0
    }
    if(y2 > vh){
      y1 -= y2 - vh
      y2 = vh
    }

    x1 = Math.max(0, x1)
    y1 = Math.max(0, y1)
    x2 = Math.min(vw, x2)
    y2 = Math.min(vh, y2)

    cropW = x2 - x1
    cropH = y2 - y1

    // Final safety check in case clamping slightly changed the aspect ratio.
    const finalAspect = cropW / cropH

    if(finalAspect > targetAspect){
      cropW = cropH * targetAspect
      x1 = Math.max(0, Math.min(vw - cropW, (x1 + x2) / 2 - cropW / 2))
    }else if(finalAspect < targetAspect){
      cropH = cropW / targetAspect
      y1 = Math.max(0, Math.min(vh - cropH, (y1 + y2) / 2 - cropH / 2))
    }

    if(cropW <= 0 || cropH <= 0) return null

    // Resize while preserving the 4:3 aspect ratio.
    const scale = Math.min(maxDim / Math.max(cropW, cropH), 1)
    const outW = Math.round(cropW * scale)
    const outH = Math.round(cropH * scale)
 
    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH

    const ctx = canvas.getContext('2d')
    ctx.drawImage(videoEl, x1, y1, cropW, cropH, 0, 0, outW, outH)
 
    return canvas.toDataURL('image/jpeg', quality)
  } catch(err){
    console.error('extractAvatar failed:', err)
    return null
  } finally{
    if(videoEl){
      videoEl.src = ''
      videoEl.load()
    }
  }
}

/**
 * Rough bounding-box area proxy from a frame's imageLandmarks, in normalized
 * (0-1) units. Used only to *compare* frames within the same recording (to
 * pick the best avatar source) — not a real pixel area, since it skips the
 * video's aspect ratio.
 * @param {Landmark[]} imageLandmarks
 * @param {number} visibilityThreshold
 * @returns {number}
 */
function landmarkBBoxArea(imageLandmarks, visibilityThreshold){
  const pts = imageLandmarks.filter((p) => (p.visibility ?? 1) > visibilityThreshold)
  if(pts.length === 0) return 0

  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
  for(const p of pts){
    if(p.x < x1) x1 = p.x
    if(p.y < y1) y1 = p.y
    if(p.x > x2) x2 = p.x
    if(p.y > y2) y2 = p.y
  }
  return Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
}

/**
 * Detect four phases of a single stroke (smash/clear/serve): preparation,
 * backswing/load, contact, follow-through — tied to the racket arm's actual
 * motion, so a user's "contact" frame lines up against an expert's "contact"
 * frame for direct comparison.
 *
 * Contact is primarily detected via peak wrist LINEAR speed (from
 * worldLandmarks positions — closer to true racket-head speed than an
 * angle-based proxy). Falls back to peak racket-elbow ANGULAR velocity if
 * wrist tracking isn't reliable across enough of the clip.
 * 
 * Also returns phase-windowed velocity stats: acceleration (backswing ->
 * contact, i.e. swing-building power) and deceleration (contact ->
 * follow-through, i.e. control). These use whichever metric (wristSpeed or
 * elbowAngularVelocity) was used for contact detection — check
 * `velocity.metric` before comparing numbers across two different
 * recordings, since units differ between the two.
 * @param {Frames[]} frames
 * @param {'right' | 'left'} racketSide which arm holds the racket
 * @param {{
 *  visibilityThreshold?: number
 *  technique: Technique,
 *  variant: TechniqueVariant,
 *  debug: Boolean,
 * }} opts
 * @returns {{
 *  phases: Phases,
 *  velocity: VelocityProfile,
 *  kinematicSequence: KinematicSequence,
 *  debugOutput?: PhaseDetectionDebug
 * }}
 */
function phaseDetection(frames, racketSide, {
    visibilityThreshold = MIN_VISIBILITY,
    technique,
    variant,
    debug = false,
  }){
  const thresholdKey = `${technique}.${variant || DEFAULT_VARIANT}`
  if(technique !== undefined && !TECHNIQUE_THRESHOLDS[thresholdKey]){
    console.error(`phaseDetection: unrecognized technique/variant "${thresholdKey}" — using default thresholds.`)
  }
  const { wristCoverageThreshold, followThroughRatio, backswingMethod } = TECHNIQUE_THRESHOLDS[thresholdKey] ?? DEFAULT_THRESHOLDS

  if(!frames || frames.length < 2) return {
    phases: [],
    velocity: { metric: 'wristSpeed', acceleration: null, deceleration: null },
    kinematicSequence: null,
    debugOutput: null
  }

  const wristIdx = racketSide === 'right' ? LANDMARKER.right_wrist : LANDMARKER.left_wrist
  const { left_shoulder, right_shoulder, left_hip, right_hip } = LANDMARKER
  
  // Per-frame wrist linear speed (units/sec, in worldLandmarks' metric space)
  const wristSpeed = new Array(frames.length).fill(undefined)
  for(let i = 1; i < frames.length; i++){
    const dt = frames[i].t - frames[i - 1].t
    if(dt <= 0) continue
    const wA = frames[i].worldLandmarks?.[wristIdx]
    const wB = frames[i - 1].worldLandmarks?.[wristIdx]
    if(!wA || !wB) continue
    if((wA.visibility ?? 0) <= visibilityThreshold || (wB.visibility ?? 0) <= visibilityThreshold) continue
    wristSpeed[i] = Math.hypot(wA.x - wB.x, wA.y - wB.y, wA.z - wB.z) / dt
  }
  
  // Per-frame racket-elbow angular velocity (deg/s) — fallback signal
  const elbowKey = `${racketSide}_elbow`
  const elbowAngVel = new Array(frames.length).fill(undefined)
  for(let i = 1; i < frames.length; i++){
    const dt = frames[i].t - frames[i - 1].t
    if(dt <= 0) continue
    const a0 = frames[i - 1].angles[elbowKey]
    const a1 = frames[i].angles[elbowKey]
    if(a0 === undefined || a1 === undefined) continue
    elbowAngVel[i] = Math.abs(a1 - a0) / dt
  }

  const allIdx = frames.map((_, i) => i)
  const wristCoverage = wristSpeed.filter((v) => v !== undefined).length / (frames.length - 1)
  const useWristForContact = wristCoverage >= wristCoverageThreshold

  const contactMetric = useWristForContact ? wristSpeed : elbowAngVel
  const contactIdx = _argExtreme(contactMetric, allIdx, 'max')
  if(contactIdx === null) 
  return { // no usable motion signal at all
    phases: [],
    velocity: { metric: useWristForContact ? 'wristSpeed' : 'elbowAngularVelocity', acceleration: null, deceleration: null },
    kinematicSequence: null,
    ...(debug && { debugOutput: null }),
  }
  const contactValue = contactMetric[contactIdx]

  // Backswing/load: most-flexed racket elbow angle before contact
  const elbowAngles = frames.map((f) => f.angles[elbowKey])
  const preContactIdx = allIdx.filter((i) => i <= contactIdx)

  // Per-frame racket-wrist height (worldLandmarks y; increases downward, same
  // convention as torso_lean's vertical reference). Alternate backswing
  // signal for strokes with minimal elbow-flexion excursion.
  const wristHeight = frames.map((f) => {
    const w = f.worldLandmarks?.[wristIdx]
    if(!w || (w.visibility ?? 0) <= visibilityThreshold) return undefined
    return w.y
  })

  // Backswing/load detection depends on stroke shape:
  //  - 'elbowFlexion' (overhead smash/clear, all variants): most-flexed
  //    racket elbow before contact — the "trophy position" cock is the load
  //    point for a full overhead stroke.
  //  - 'wristHeight' (serve): elbow angle barely varies in these compact,
  //    low-amplitude strokes, so it doesn't reliably mark a load point. Use
  //    the lowest racket-wrist position before contact instead — the
  //    racket-head drop/draw-back preceding the forward swing.
  const backswingIdx = backswingMethod === 'wristHeight'
    ? _argExtreme(wristHeight, preContactIdx, 'max') ?? 0
    : _argExtreme(elbowAngles, preContactIdx, 'min') ?? 0

  const swingWindow = allIdx.filter((i) => i >= backswingIdx && i <= contactIdx)
  const shoulderTheta = new Array(frames.length).fill(undefined)
  const hipTheta = new Array(frames.length).fill(undefined)

  for(let i = 0; i < frames.length; i++){
    const wl = frames[i].worldLandmarks
    if(!wl) continue
    const ls = wl[left_shoulder], rs = wl[right_shoulder]
    const lh = wl[left_hip], rh = wl[right_hip]
    if(!ls || !rs || !lh || !rh) continue
    if([ls, rs, lh, rh].some((p) => (p.visibility ?? 0) <= visibilityThreshold)) continue

    const sVec = { x: rs.x - ls.x, z: rs.z - ls.z }
    const hVec = { x: rh.x - lh.x, z: rh.z - lh.z }
    const sNorm = Math.hypot(sVec.x, sVec.z)
    const hNorm = Math.hypot(hVec.x, hVec.z)
    if(sNorm <= 1e-6 || hNorm <= 1e-6) continue

    shoulderTheta[i] = Math.atan2(sVec.z, sVec.x) * (180 / Math.PI)
    hipTheta[i] = Math.atan2(hVec.z, hVec.x) * (180 / Math.PI)
  }

  // Per-frame rotational speed (deg/s), wrap-safe around the ±180 boundary.
  const shoulderRotVel = new Array(frames.length).fill(undefined)
  const hipRotVel = new Array(frames.length).fill(undefined)
  for(let i = 1; i < frames.length; i++){
    const dt = frames[i].t - frames[i - 1].t
    if(dt <= 0) continue
    if(shoulderTheta[i] !== undefined && shoulderTheta[i - 1] !== undefined){
      shoulderRotVel[i] = _angleDelta(shoulderTheta[i], shoulderTheta[i - 1]) / dt
    }
    if(hipTheta[i] !== undefined && hipTheta[i - 1] !== undefined){
      hipRotVel[i] = _angleDelta(hipTheta[i], hipTheta[i - 1]) / dt
    }
  }

  const peakHipRotIdx = _argExtreme(hipRotVel, swingWindow, 'max')
  const peakShoulderRotIdx = _argExtreme(shoulderRotVel, swingWindow, 'max')

  const kinematicSequence = (peakHipRotIdx === null || peakShoulderRotIdx === null) ? null : {
    hipPeakTime: frames[peakHipRotIdx].t,
    shoulderPeakTime: frames[peakShoulderRotIdx].t,
    leadTime: _round(frames[peakShoulderRotIdx].t - frames[peakHipRotIdx].t, 3),
    hipPeakAngularVelocity: _round(hipRotVel[peakHipRotIdx]),
    shoulderPeakAngularVelocity: _round(shoulderRotVel[peakShoulderRotIdx]),
  }

  // Preparation: quietest wrist-speed moment at or before backswing
  const prepWindow = allIdx.filter((i) => i <= backswingIdx)
  const preparationIdx = _argExtreme(wristSpeed, prepWindow, 'min') ?? 0

  // Follow-through: first frame after contact where speed drops to <=25% of
  // peak; else the last frame in the clip
  let followThroughIdx = frames.length - 1
  const threshold = contactValue * followThroughRatio
  for(let i = contactIdx + 1; i < frames.length; i++){
    if(contactMetric[i] !== undefined && contactMetric[i] <= threshold){
      followThroughIdx = i
      break
    }
  }

  // Phase-windowed velocity: acceleration (backswing -> contact) and
  // deceleration (contact -> follow-through) on the same metric used for
  // contact detection, so units stay consistent within one call.
  const acceleration = _windowStats(contactMetric, backswingIdx, contactIdx)
  const deceleration = _windowStats(contactMetric, contactIdx, followThroughIdx)

  const picks = [
    { idx: preparationIdx, label: 'preparation', value: wristSpeed[preparationIdx] ?? null },
    { idx: backswingIdx, label: 'backswing', value: elbowAngles[backswingIdx] ?? null },
    { idx: contactIdx, label: 'contact', value: contactValue },
    { idx: followThroughIdx, label: 'follow_through', value: contactMetric[followThroughIdx] ?? null },
  ]

  const seen = new Map()
  for(const { idx, label, value } of picks){
    const t = frames[idx].t
    if(!seen.has(t)) seen.set(t, { ...frames[idx], label, value })
  }

  /** @type {PhaseDetectionDebug} */
  let debugOutput
  if(debug){
    const hipVals = hipTheta.filter((v) => v !== undefined)
    const shoulderVals = shoulderTheta.filter((v) => v !== undefined)

    debugOutput = {
      wristCoverage: _round(wristCoverage, 3),
      contactMetricUsed: useWristForContact ? 'wristSpeed' : 'elbowAngularVelocity',
      wristSpeedSeries: wristSpeed,
      wristHeightSeries: wristHeight,
      elbowAngVelSeries: elbowAngVel,
      hipRotVelSeries: hipRotVel,
      shoulderRotVelSeries: shoulderRotVel,
      hipRotationRange: hipVals.length ? { min: _round(Math.min(...hipVals)), max: _round(Math.max(...hipVals)) } : null,
      shoulderRotationRange: shoulderVals.length ? { min: _round(Math.min(...shoulderVals)), max: _round(Math.max(...shoulderVals)) } : null,
      thresholdsUsed: { wristCoverageThreshold, followThroughRatio, backswingMethod },
    }
  }

  return {
    // 'wristSpeed' is worldLandmarks units/sec (MediaPipe's world space
    // approximates meters); 'elbowAngularVelocity' is deg/sec. Check this
    // field before comparing acceleration/deceleration numbers across
    // two different recordings — they're only comparable if both used
    // the same metric.
    phases: [...seen.values()].sort((a, b) => a.t - b.t),
    velocity: {
      metric: useWristForContact ? 'wristSpeed' : 'elbowAngularVelocity',
      acceleration, // backswing -> contact: swing-building power
      deceleration, // contact -> follow-through: control/deceleration
    },
    kinematicSequence,
    ...(debugOutput && { debugOutput }),
  }
}

/**
 * Process a MediaPipe pose recording end-to-end: extract angles per frame,
 * then aggregate angle statistics, angular velocity, phases, kinematic
 * sequencing, and an avatar snapshot.
 * @param {{
 *  videoUrl: string,
 *  landmarks: LandmarkFrame[],
 *  visibilityThreshold?: number,
 *  avatarOptions?: AvatarOptions,
 *  technique: Technique,
 *  variant: TechniqueVariant,
 *  racketSide: 'right' | 'left',
 *  debug?: boolean,
 *  progressCallback?: (pct: number, msg: string) => void
 * }} options
 * @returns {Promise<PoseStats>}
 */
export async function processRecording({
  videoUrl,
  landmarks,
  visibilityThreshold = MIN_VISIBILITY,
  avatarOptions = {},
  technique,
  variant,
  racketSide,
  debug = false,
  progressCallback,
}){
  const report = (pct, msg) => {
    if(progressCallback) progressCallback(pct, msg)
  }

  const rawLandmarks = landmarks || []
  report(2, `Processing ${rawLandmarks.length} recorded samples...`)

  /**
   * Build per-frame angle data; drop frames with no usable angles at all
   * (matches the original's "if not ang: continue" gating).
   */
  const frames = /**@type {Frames[]} */ ([])

  for(const sample of rawLandmarks){
    const angles = extractAngles(sample.worldLandmarks, { visibilityThreshold })
    if(Object.keys(angles).length === 0) continue

    frames.push({ ...sample, angles })
  }
  frames.sort((a, b) => a.t - b.t)

  report(30, `Extracted angles for ${frames.length}/${rawLandmarks.length} samples`)

  if(frames.length === 0){
    return {
      totalSamples: rawLandmarks.length,
      analyzedSamples: 0,
      duration: 0,
      angleStats: {},
      angularVelocity: {},
      phases: [],
      velocityProfile: null,
      kinematicSequence: null,
      avatarImage: null,
    }
  }

  report(50, 'Aggregating angle statistics...')

  const angleSeries = /** @type {Record<AngleKeys, number[]>} */ (Object.fromEntries(ANGLE_KEYS.map(k => [k, []])))
  for(const fr of frames){
    for(const [k, v] of Object.entries(fr.angles)){
      if(angleSeries[k]) angleSeries[k].push(v)
    }
  }

  const stats = /** @type {AllAngleStats} */ (Object.fromEntries(ANGLE_KEYS.map(k => [k, angleStats(angleSeries[k])])))

  const angVel = computeAngularVelocity(frames)
  
  report(65, 'Detecting stroke phases...')

  let phases = []
  let velocityProfile = null
  let kinematicSequence = null
  let debugOutput = null
  if(racketSide === 'right' || racketSide === 'left'){
    const result = phaseDetection(frames, racketSide, { visibilityThreshold, technique, variant, debug })
    phases = result.phases
    velocityProfile = result.velocity
    kinematicSequence = result.kinematicSequence
    debugOutput = result.debugOutput ?? null
  } else{
    console.error('processRecording: racketSide not provided.')
  }

  report(80, 'Selecting avatar snapshot...')

  const avatarCandidates = frames.filter((f) => f.imageLandmarks)
  let avatarImage = null

  if(avatarCandidates.length > 0){
    const best = avatarCandidates.reduce((max, f) => {
      const fScore = landmarkBBoxArea(f.imageLandmarks, visibilityThreshold) * Object.keys(f.angles).length
      const maxScore = landmarkBBoxArea(max.imageLandmarks, visibilityThreshold) * Object.keys(max.angles).length
      return fScore > maxScore ? f : max
    })
    avatarImage = await extractAvatar(videoUrl, best.t, best.imageLandmarks, avatarOptions)
  }

  report(100, 'Processing complete.')

  return {
    totalSamples: rawLandmarks.length,
    analyzedSamples: frames.length,
    duration: _round(frames[frames.length - 1].t - frames[0].t),
    angleStats: stats,
    angularVelocity: angVel,
    phases,
    velocityProfile,
    kinematicSequence,
    avatarImage,
    debugOutput,
  }
}