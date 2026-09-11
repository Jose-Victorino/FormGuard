import { LANDMARKER, MIN_VISIBILITY } from './util'

/**
 * @typedef {import('./types').Landmark} Landmark
 * @typedef {import('./types').LandmarkFrame} LandmarkFrame
 * @typedef {'right_elbow' | 'left_elbow' | 'right_knee' | 'left_knee' | 'torso_lean' | 'torso_rotation' | 'right_wrist_angle' | 'left_wrist_angle'} AngleKeys
 * @typedef {'preparation' | 'backswing' | 'contact' | 'follow_through'} PhaseLabels
 * @typedef {'serve' | 'clear' | 'smash'} Technique
 * @typedef {'forehand' | 'backhand'} TechniqueVariation
 * @typedef {LandmarkFrame & {
 *  angles: Partial<Record<AngleKeys, number>>,
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
 *  metric: 'wristSpeed' | 'elbowAngularVelocity' | 'wristFlexAngularVelocity',
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
 *  contactMetricUsed?: 'wristSpeed' | 'elbowAngularVelocity' | 'wristFlexAngularVelocity',
 *  contactConfidence?: 'high' | 'medium' | 'low' | 'unusable',
 *  contactPeaks?: Record<string, number | null>,
 *  wristSpeedSeries?: Array<number|undefined>,
 *  wristHeightSeries?: Array<number|undefined>
 *  elbowAngVelSeries?: Array<number|undefined>,
 *  wristFlexAngVelSeries?: Array<number|undefined>,
 *  hipRotVelSeries?: Array<number|undefined>,
 *  thresholdsUsed?: {wristCoverageThreshold: number, followThroughRatio: number, backswingMethod: 'elbowFlexion' | 'wristHeight', disagreementStrategy?: 'localCoverage' | 'dominance', contactMethod?: 'velocityPeak' | 'elbowExtension' | 'offHandReady' },
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
 *  disagreementStrategy?: 'localCoverage' | 'dominance',
 *  contactMethod?: 'velocityPeak' | 'elbowExtension' | 'offHandReady',
 * }} Threshold
 */
/** @type {Record<string, Threshold>} */
const TECHNIQUE_THRESHOLDS = {
  'clear.forehand': { wristCoverageThreshold: 0.5, followThroughRatio: 0.3, backswingMethod: 'elbowFlexion', contactMethod: 'elbowExtension' },
  'clear.backhand': { wristCoverageThreshold: 0.18, followThroughRatio: 0.011, backswingMethod: 'elbowFlexion' },
  'smash.forehand': { wristCoverageThreshold: 0.5, followThroughRatio: 0.15, backswingMethod: 'elbowFlexion' },
  'smash.backhand': { wristCoverageThreshold: 0.16, followThroughRatio: 0.07, backswingMethod: 'elbowFlexion' },
  'serve.forehand': { wristCoverageThreshold: 0.5, followThroughRatio: 0.3, backswingMethod: 'wristHeight' },
  'serve.backhand': { wristCoverageThreshold: 0.5, followThroughRatio: 0.095, backswingMethod: 'wristHeight', contactMethod: 'offHandReady' },
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
 * Fraction of defined values within ±windowFrames of `idx` in `arr`,
 * clamped to array bounds. Used to sanity-check whether a candidate peak
 * (e.g. contact, from peak wrist speed or elbow angular velocity) sits in
 * a well-tracked neighborhood rather than right next to a data gap —
 * MediaPipe is prone to losing the wrist to motion blur/racket occlusion
 * at the exact moment a stroke matters most, which can silently shift a
 * peak pick away from the true contact frame even when overall clip
 * coverage looks fine.
 * @param {Array<number | undefined>} arr
 * @param {number} idx
 * @param {number} windowFrames
 * @returns {number} fraction in [0, 1]
 */
function _localCoverage(arr, idx, windowFrames = 5){
  const start = Math.max(0, idx - windowFrames)
  const end = Math.min(arr.length - 1, idx + windowFrames)
  let defined = 0
  let total = 0
  for(let i = start; i <= end; i++){
    total++
    if(arr[i] !== undefined) defined++
  }
  return total > 0 ? defined / total : 0
}

/**
 * How far a candidate peak stands out from its own runner-up in the same
 * series — used only by the 'dominance' disagreement strategy (currently
 * `clear.forehand` only, see TECHNIQUE_THRESHOLDS). A consistent-speed,
 * long-windup stroke can produce a wristSpeed peak that's a near-tie with
 * an earlier windup spike, which the default local-coverage fallback can't
 * distinguish from a genuine contact peak (both are well-tracked). Angular
 * velocity signals tend to be far more decisive at the true contact frame,
 * so ranking candidates by how much their peak clears their own second-
 * highest value favors a clearly-standout secondary signal over a
 * marginal wristSpeed "win". Returns Infinity if there's no other defined
 * value to compare against (i.e. an unambiguous peak).
 * @param {Array<number|undefined>} values
 * @param {number} peakIdx
 * @param {number[]} indices
 * @returns {number}
 */
function _peakDominance(values, peakIdx, indices){
  let second = -Infinity
  for(const i of indices){
    if(i === peakIdx) continue
    const v = values[i]
    if(v === undefined) continue
    if(v > second) second = v
  }
  if(second === -Infinity || second <= 0) return Infinity
  return values[peakIdx] / second
}

/**
 * Pick the contact frame by cross-validating peak wrist linear speed
 * against one or more secondary signals — which secondary signals apply
 * is decided by the caller based on what the technique guide actually
 * credits as that stroke's power source (see phaseDetection).
 *
 * A secondary peak landing within `agreementWindow` seconds of the wrist
 * speed peak counts as confirming it; the more secondary signals that
 * agree, the higher the resulting confidence. When none agree — or wrist
 * speed isn't usable at all — falls back to whichever candidate (wrist or
 * any secondary) sits in the best-tracked local neighborhood (see
 * `_localCoverage`), marked low confidence either way, since disagreement
 * between independent signals is itself a reason for caution.
 * @param {Array<number|undefined>} wristSpeed
 * @param {Array<{name: 'wristSpeed' | 'elbowAngularVelocity' | 'wristFlexAngularVelocity', series: Array<number|undefined>}>} secondarySignals
 * @param {Frames[]} frames
 * @param {number[]} allIdx
 * @param {{agreementWindow: number, coverageThreshold: number, disagreementStrategy?: 'localCoverage' | 'dominance'}} opts
 * @returns {{
 *  contactIdx: number | null,
 *  metricName: 'wristSpeed' | 'elbowAngularVelocity' | 'wristFlexAngularVelocity',
 *  metricSeries: Array<number|undefined> | null,
 *  confidence: 'high' | 'medium' | 'low' | 'unusable',
 *  peaks: Record<string, number | null>
 * }}
 */
function _detectContact(wristSpeed, secondarySignals, frames, allIdx, { agreementWindow, coverageThreshold, disagreementStrategy = 'localCoverage' }){
  const wristPeakIdx = _argExtreme(wristSpeed, allIdx, 'max')
  const secondaryPeaks = secondarySignals.map((sig) => ({
    ...sig,
    peakIdx: _argExtreme(sig.series, allIdx, 'max'),
  }))
  const peaks = {
    wristSpeed: wristPeakIdx,
    ...Object.fromEntries(secondaryPeaks.map((s) => [s.name, s.peakIdx])),
  }
  const usableSecondary = secondaryPeaks.filter((s) => s.peakIdx !== null)

  if(wristPeakIdx === null && usableSecondary.length === 0){
    return { contactIdx: null, metricName: null, metricSeries: null, confidence: 'unusable', peaks }
  }

  // No wrist signal at all — no cross-check possible, fall back to whichever
  // secondary peak is best-tracked.
  if(wristPeakIdx === null){
    const best = usableSecondary.reduce((a, b) =>
      _localCoverage(b.series, b.peakIdx) > _localCoverage(a.series, a.peakIdx) ? b : a
    )
    const confidence = _localCoverage(best.series, best.peakIdx) >= coverageThreshold ? 'medium' : 'low'
    return { contactIdx: best.peakIdx, metricName: best.name, metricSeries: best.series, confidence, peaks }
  }

  const wristCoverage = _localCoverage(wristSpeed, wristPeakIdx)

  // No secondary signal usable at all — judge on wrist's own local coverage.
  if(usableSecondary.length === 0){
    const confidence = wristCoverage >= coverageThreshold ? 'medium' : 'low'
    return { contactIdx: wristPeakIdx, metricName: 'wristSpeed', metricSeries: wristSpeed, confidence, peaks }
  }

  const agreeing = usableSecondary.filter((s) => Math.abs(frames[s.peakIdx].t - frames[wristPeakIdx].t) <= agreementWindow)

  if(agreeing.length > 0){
    const allAgree = agreeing.length === usableSecondary.length
    const confidence = (allAgree && wristCoverage >= coverageThreshold) ? 'high' : 'medium'
    return { contactIdx: wristPeakIdx, metricName: 'wristSpeed', metricSeries: wristSpeed, confidence, peaks }
  }

  // Disagreement across the board. Default strategy: trust whichever
  // candidate sits in the best-tracked neighborhood, since that one is more
  // likely a genuine extremum rather than an artifact picked next to a gap.
  const candidates = [{ name: 'wristSpeed', series: wristSpeed, peakIdx: wristPeakIdx }, ...usableSecondary]

  const best = disagreementStrategy === 'dominance'
    // 'dominance' strategy: trust whichever candidate's peak stands out most
    // clearly from its own runner-up (see _peakDominance) rather than
    // defaulting to local-coverage order, which silently favors wristSpeed
    // on a coverage tie purely by its position in `candidates`.
    ? candidates.reduce((a, b) =>
        _peakDominance(b.series, b.peakIdx, allIdx) > _peakDominance(a.series, a.peakIdx, allIdx) ? b : a
      )
    : candidates.reduce((a, b) =>
        _localCoverage(b.series, b.peakIdx) > _localCoverage(a.series, a.peakIdx) ? b : a
      )
  // @ts-ignore
  return { contactIdx: best.peakIdx, metricName: best.name, metricSeries: best.series, confidence: 'low', peaks }
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
    if(!vw || !vh){
      console.warn('extractAvatar: video has no dimensions after seek (vw/vh is 0) — skipping avatar')
      return null
    }
 
    const visiblePts = imageLandmarks.filter((p) => (p.visibility ?? 1) > visibilityThreshold)
    if(visiblePts.length === 0){
      console.warn('extractAvatar: no landmarks above visibility threshold on the chosen frame — skipping avatar')
      return null
    }
 
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

    if(cropW <= 0 || cropH <= 0){
      console.warn('extractAvatar: degenerate crop dimensions after clamping — skipping avatar', { cropW, cropH })
      return null
    }

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
 * Picks the best frame in `landmarks` for use as an avatar/thumbnail
 * snapshot — whichever frame has the largest visible bounding-box area, a
 * decent proxy for "person clearly and fully in frame". Meant to run
 * standalone (e.g. right after recording, before `processRecording`'s full
 * angle-extraction pass exists), so unlike `processRecording`'s own avatar
 * selection it doesn't also weight by extracted-angle count.
 * @param {LandmarkFrame[]} landmarks
 * @param {{visibilityThreshold?: number}} [options]
 * @returns {LandmarkFrame | null}
 */
export function pickBestAvatarFrame(landmarks, { visibilityThreshold = MIN_VISIBILITY } = {}){
  const candidates = (landmarks ?? []).filter((f) => f.imageLandmarks)
  if(!candidates.length) return null

  return candidates.reduce((best, f) =>
    landmarkBBoxArea(f.imageLandmarks, visibilityThreshold) > landmarkBBoxArea(best.imageLandmarks, visibilityThreshold) ? f : best
  )
}

/**
 * Detect four phases of a single stroke (smash/clear/serve): preparation,
 * backswing/load, contact, follow-through — tied to the racket arm's actual
 * motion, so a user's "contact" frame lines up against an expert's "contact"
 * frame for direct comparison.
 *
 * Contact is detected one of two ways, chosen per technique
 * (`contactMethod` in TECHNIQUE_THRESHOLDS):
 *  - 'velocityPeak' (default): cross-validating peak wrist LINEAR speed
 *    (from worldLandmarks positions — closer to true racket-head speed)
 *    against one or more secondary signals, chosen per the technique
 *    guide's described power source rather than applied uniformly:
 *     - 'elbowFlexion' techniques (clear/smash, all variants): the guide
 *       credits both full-arm extension AND a wrist snap/forearm rotation,
 *       so cross-check against both racket-elbow angular velocity and
 *       racket-wrist FLEXION angular velocity.
 *     - 'wristHeight' techniques (serve): the guide never credits elbow
 *       extension as the power source (short, compact, "wrist and finger
 *       movement") — elbow angular velocity is dropped as a cross-check
 *       signal entirely, leaving wrist flexion angular velocity.
 *  - 'elbowExtension' (`clear.forehand` only): a consistent-speed swing
 *    doesn't reliably produce a standout velocity spike at contact, so
 *    contact is instead the most-extended racket-elbow angle after the
 *    clip's deepest elbow flexion — see phaseDetection body for detail.
 *  - 'offHandReady' (`serve.backhand` only): the racket wrist's own
 *    "raise into ready position" motion can produce a speed spike
 *    comparable to (or bigger than) the actual flick, so peak-based
 *    detection can't tell them apart on magnitude alone. Instead uses the
 *    OFF-hand's highest point (which has no job in this stroke beyond
 *    reaching ready position and holding) to mark where the raise ends,
 *    then searches only from there for the racket wrist's flex-velocity
 *    peak — see phaseDetection body for detail.
 *
 * A secondary peak landing near the wrist-speed peak counts as agreement;
 * the more secondary signals that agree, the higher the resulting
 * `contactConfidence`. Disagreement — or a peak sitting next to a local
 * data gap — falls back to whichever candidate sits in a better-tracked
 * neighborhood (see `_localCoverage`), since MediaPipe is prone to losing
 * the wrist to motion blur/racket occlusion at exactly the moment contact
 * happens, even when the clip's overall coverage looks fine.
 * `contactConfidence` ('high'/'medium'/'low'/'unusable') is surfaced in
 * `debugOutput` so a low-confidence pick can be flagged rather than
 * silently trusted.
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
 *  variation: TechniqueVariation,
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
  variation,
  debug = false,
}){
  const thresholdKey = `${technique}.${variation || DEFAULT_VARIANT}`
  if(technique !== undefined && !TECHNIQUE_THRESHOLDS[thresholdKey]){
    console.error(`phaseDetection: unrecognized technique/variant "${thresholdKey}" — using default thresholds.`)
  }
  const { wristCoverageThreshold, followThroughRatio, backswingMethod, disagreementStrategy, contactMethod = 'velocityPeak' } = TECHNIQUE_THRESHOLDS[thresholdKey] ?? DEFAULT_THRESHOLDS

  if(!frames || frames.length < 2) return {
    phases: [],
    velocity: { metric: 'wristSpeed', acceleration: null, deceleration: null },
    kinematicSequence: null,
    debugOutput: null
  }

  const wristIdx = racketSide === 'right' ? LANDMARKER.right_wrist : LANDMARKER.left_wrist
  const offWristIdx = racketSide === 'right' ? LANDMARKER.left_wrist : LANDMARKER.right_wrist
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
  
  // Per-frame racket-elbow angular velocity (deg/s) — secondary signal for
  // 'elbowFlexion' techniques
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

  // Per-frame racket-wrist FLEXION angular velocity (deg/s) — the wrist
  // snap/forearm-rotation power source the technique guide credits for
  // smash/clear, and the only credited signal (besides wrist linear speed
  // itself) for serve's short, compact "wrist and finger movement".
  const wristFlexKey = `${racketSide}_wrist_angle`
  const wristFlexAngVel = new Array(frames.length).fill(undefined)
  for(let i = 1; i < frames.length; i++){
    const dt = frames[i].t - frames[i - 1].t
    if(dt <= 0) continue
    const a0 = frames[i - 1].angles[wristFlexKey]
    const a1 = frames[i].angles[wristFlexKey]
    if(a0 === undefined || a1 === undefined) continue
    wristFlexAngVel[i] = Math.abs(a1 - a0) / dt
  }

  const allIdx = frames.map((_, i) => i)
  const wristCoverage = wristSpeed.filter((v) => v !== undefined).length / (frames.length - 1)

  // Racket-elbow angle per frame — used both as a secondary contact-
  // validation signal ('elbowFlexion' backswingMethod) and, for
  // 'elbowExtension' contactMethod, as the primary signal contact is
  // located from.
  const elbowAngles = frames.map((f) => f.angles[elbowKey])

  // Per-frame racket-wrist height (worldLandmarks y; increases downward, same
  // convention as torso_lean's vertical reference). Alternate backswing
  // signal for strokes with minimal elbow-flexion excursion.
  const wristHeight = frames.map((f) => {
    const w = f.worldLandmarks?.[wristIdx]
    if(!w || (w.visibility ?? 0) <= visibilityThreshold) return undefined
    return w.y
  })

  // Per-frame OFF-hand wrist height, same convention as wristHeight above.
  // Used exclusively by 'offHandReady' contactMethod (serve.backhand): the
  // off-hand has no job in this stroke besides reaching ready position and
  // holding still, making its own highest point a cleaner "ready position
  // reached" marker than anything derived from the racket wrist, which is
  // still moving during the flick itself.
  const offWristHeight = frames.map((f) => {
    const w = f.worldLandmarks?.[offWristIdx]
    if(!w || (w.visibility ?? 0) <= visibilityThreshold) return undefined
    return w.y
  })

  // Which secondary signals cross-validate wrist speed depends on what the
  // technique guide actually credits as this stroke's power source — see
  // module doc above. Applying elbow angular velocity uniformly across all
  // techniques would treat serve's compact, elbow-barely-moves motion as if
  // it shared smash/clear's full-arm-extension power source, which the
  // guide doesn't support.
  /** @type {Array<{name: 'wristSpeed' | 'elbowAngularVelocity' | 'wristFlexAngularVelocity', series: Array<number|undefined>}>} */
  const secondarySignals = backswingMethod === 'wristHeight'
    ? [{ name: 'wristFlexAngularVelocity', series: wristFlexAngVel }]
    : [
        { name: 'elbowAngularVelocity', series: elbowAngVel },
        { name: 'wristFlexAngularVelocity', series: wristFlexAngVel },
      ]

  /** @type {number | null} */
  let contactIdx
  /** @type {'wristSpeed' | 'elbowAngularVelocity' | 'wristFlexAngularVelocity' | undefined} */
  let contactMetricName
  /** @type {Array<number|undefined> | null} */
  let contactMetric
  /** @type {'high' | 'medium' | 'low' | 'unusable'} */
  let contactConfidence
  /** @type {Record<string, number | null>} */
  let contactPeaksDebug
  /** @type {number} */
  let backswingIdx

  if(contactMethod === 'elbowExtension'){
    // clear.forehand-specific: a consistent-speed swing ("smooth wrist and
    // forearm motion" per the technique guide) doesn't reliably produce a
    // standout velocity spike at contact the way an explosive stroke does —
    // confirmed against real clips where the largest wristSpeed/angular-
    // velocity spikes all landed during the step-back-and-windup rather
    // than the swing itself, regardless of which signal or disagreement
    // strategy was trusted. Contact is instead located from arm geometry
    // directly, per the guide's "contact the shuttle at the highest
    // comfortable point above the body": backswing is the deepest elbow
    // flexion anywhere in the clip (the cocked load point from the step-
    // back windup), and contact is the most-extended elbow angle anywhere
    // after that — the top of the arm's reach.
    const validElbowIdx = allIdx.filter((i) => elbowAngles[i] !== undefined)

    if(validElbowIdx.length === 0){
      return { // no usable elbow-angle signal at all
        phases: [],
        velocity: { metric: 'wristSpeed', acceleration: null, deceleration: null },
        kinematicSequence: null,
        ...(debug && { debugOutput: {
          wristCoverage: _round(wristCoverage, 3),
          contactMetricUsed: undefined,
          contactConfidence: 'unusable',
          contactPeaks: { elbowMinIdx: null, elbowMaxIdx: null },
          wristSpeedSeries: wristSpeed,
          elbowAngVelSeries: elbowAngVel,
          wristFlexAngVelSeries: wristFlexAngVel,
          thresholdsUsed: { wristCoverageThreshold, followThroughRatio, backswingMethod, disagreementStrategy, contactMethod },
        } }),
      }
    }

    backswingIdx = _argExtreme(elbowAngles, allIdx, 'min') ?? 0
    const postBackswingIdx = allIdx.filter((i) => i >= backswingIdx)
    contactIdx = _argExtreme(elbowAngles, postBackswingIdx, 'max') ?? backswingIdx
    contactMetricName = 'wristSpeed'
    contactMetric = wristSpeed
    contactConfidence = 'medium' // position-based, not velocity cross-validated — see module doc
    contactPeaksDebug = { elbowMinIdx: backswingIdx, elbowMaxIdx: contactIdx }
  } else if(contactMethod === 'offHandReady'){
    // serve.backhand-specific: hands start down, one leg forward (racket
    // side), then both hands raise into ready position with a clear pause
    // before the flick — a small (~5-10°) elbow extension plus a wrist
    // flick. The raise can itself produce a wrist-speed spike comparable
    // to the flick's, so peak magnitude alone can't separate them (already
    // confirmed against a real clip where the raise's spike won out). Some
    // clips start already in ready position, so this can't assume a raise
    // is always present either.
    //
    // Anchors on the OFF-hand instead: it has no job in this stroke beyond
    // reaching ready position and holding, so its highest point (lowest
    // wristHeight value) marks the end of the raise — or, if the clip
    // starts in ready position already, lands near frame 0 and excludes
    // nothing. Contact is then the peak of wristFlexAngularVelocity (the
    // flick — the technique guide's credited power source for serve)
    // searched only from that point onward, keeping the raise's spike out
    // of the search entirely regardless of its magnitude.
    const validOffWristIdx = allIdx.filter((i) => offWristHeight[i] !== undefined)

    if(validOffWristIdx.length === 0){
      return { // no usable off-hand tracking at all
        phases: [],
        velocity: { metric: 'wristSpeed', acceleration: null, deceleration: null },
        kinematicSequence: null,
        ...(debug && { debugOutput: {
          wristCoverage: _round(wristCoverage, 3),
          contactMetricUsed: undefined,
          contactConfidence: 'unusable',
          contactPeaks: { offHandReadyIdx: null, wristFlexPeakIdx: null },
          wristSpeedSeries: wristSpeed,
          elbowAngVelSeries: elbowAngVel,
          wristFlexAngVelSeries: wristFlexAngVel,
          thresholdsUsed: { wristCoverageThreshold, followThroughRatio, backswingMethod, disagreementStrategy, contactMethod },
        } }),
      }
    }

    backswingIdx = _argExtreme(offWristHeight, allIdx, 'min') ?? 0
    const postReadyIdx = allIdx.filter((i) => i >= backswingIdx)
    contactIdx = _argExtreme(wristFlexAngVel, postReadyIdx, 'max') ?? backswingIdx
    contactMetricName = 'wristFlexAngularVelocity'
    contactMetric = wristFlexAngVel
    contactConfidence = 'medium' // position-anchored, not multi-signal cross-validated — see module doc
    contactPeaksDebug = { offHandReadyIdx: backswingIdx, wristFlexPeakIdx: contactIdx }
  } else {
    const CONTACT_AGREEMENT_WINDOW = 0.1 // seconds — peaks within this of each other count as agreeing
    const contact = _detectContact(wristSpeed, secondarySignals, frames, allIdx, {
      agreementWindow: CONTACT_AGREEMENT_WINDOW,
      coverageThreshold: wristCoverageThreshold,
      disagreementStrategy,
    })

    if(contact.contactIdx === null)
    return { // no usable motion signal at all
      phases: [],
      velocity: { metric: 'wristSpeed', acceleration: null, deceleration: null },
      kinematicSequence: null,
      ...(debug && { debugOutput: {
        wristCoverage: _round(wristCoverage, 3),
        contactMetricUsed: undefined,
        contactConfidence: 'unusable',
        contactPeaks: contact.peaks,
        wristSpeedSeries: wristSpeed,
        elbowAngVelSeries: elbowAngVel,
        wristFlexAngVelSeries: wristFlexAngVel,
        thresholdsUsed: { wristCoverageThreshold, followThroughRatio, backswingMethod, disagreementStrategy, contactMethod },
      } }),
    }

    contactIdx = contact.contactIdx
    contactMetricName = contact.metricName
    contactMetric = contact.metricSeries
    contactConfidence = contact.confidence
    contactPeaksDebug = contact.peaks

    const preContactIdx = allIdx.filter((i) => i <= contactIdx)

    // Backswing/load detection depends on stroke shape:
    //  - 'elbowFlexion' (overhead smash/clear, all variants): most-flexed
    //    racket elbow before contact — the "trophy position" cock is the load
    //    point for a full overhead stroke.
    //  - 'wristHeight' (serve): elbow angle barely varies in these compact,
    //    low-amplitude strokes, so it doesn't reliably mark a load point. Use
    //    the lowest racket-wrist position before contact instead — the
    //    racket-head drop/draw-back preceding the forward swing.
    backswingIdx = backswingMethod === 'wristHeight'
      ? _argExtreme(wristHeight, preContactIdx, 'max') ?? 0
      : _argExtreme(elbowAngles, preContactIdx, 'min') ?? 0
  }

  const useWristForContact = contactMetricName === 'wristSpeed'
  const contactValue = contactMetric[contactIdx]

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

  // Keyed by label, not by frame timestamp: on short/fast clips two phases
  // (e.g. backswing and contact) can legitimately land on the same frame.
  // Deduping by timestamp silently dropped whichever phase was inserted
  // later (usually 'contact'), even though contact detection itself had
  // succeeded — leaving a valid contactConfidence with no matching phase
  // entry. Every phase label is now always present in the output; a shared
  // timestamp across labels is meaningful signal, not noise to collapse.
  const seen = new Map()
  for(const { idx, label, value } of picks){
    seen.set(label, { ...frames[idx], label, value })
  }

  /** @type {PhaseDetectionDebug} */
  let debugOutput
  if(debug){
    const hipVals = hipTheta.filter((v) => v !== undefined)
    const shoulderVals = shoulderTheta.filter((v) => v !== undefined)

    debugOutput = {
      wristCoverage: _round(wristCoverage, 3),
      contactMetricUsed: contactMetricName,
      contactConfidence,
      contactPeaks: contactPeaksDebug,
      wristSpeedSeries: wristSpeed,
      wristHeightSeries: wristHeight,
      elbowAngVelSeries: elbowAngVel,
      wristFlexAngVelSeries: wristFlexAngVel,
      hipRotVelSeries: hipRotVel,
      shoulderRotVelSeries: shoulderRotVel,
      hipRotationRange: hipVals.length ? { min: _round(Math.min(...hipVals)), max: _round(Math.max(...hipVals)) } : null,
      shoulderRotationRange: shoulderVals.length ? { min: _round(Math.min(...shoulderVals)), max: _round(Math.max(...shoulderVals)) } : null,
      thresholdsUsed: { wristCoverageThreshold, followThroughRatio, backswingMethod, disagreementStrategy, contactMethod },
    }
  }

  return {
    // 'wristSpeed' is worldLandmarks units/sec (MediaPipe's world space
    // approximates meters); 'elbowAngularVelocity'/'wristFlexAngularVelocity'
    // are deg/sec. Check this field before comparing acceleration/
    // deceleration numbers across two different recordings — they're only
    // comparable if both used the same metric.
    phases: [...seen.values()].sort((a, b) => a.t - b.t),
    velocity: {
      metric: contactMetricName,
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
 *  variation: TechniqueVariation,
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
  variation,
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
    const result = phaseDetection(frames, racketSide, { visibilityThreshold, technique, variation, debug })
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
    if(!avatarImage) console.warn('processRecording: extractAvatar returned null for the best candidate frame — no avatar for this session')
  } else{
    console.warn('processRecording: no frames with imageLandmarks — skipping avatar entirely')
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