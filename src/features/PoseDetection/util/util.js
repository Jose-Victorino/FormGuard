/** @typedef {import('./types').Landmark} Landmark */

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

/**
 * Whether the core body landmarks the pipeline depends on are both
 * confidently tracked and within frame bounds, for a SINGLE frame.
 *
 * Intended use: polled continuously, once per pose-estimation frame,
 * after the user taps "get ready" — NOT a one-off pre-click gate. Because
 * it's called every frame, treat it as a raw per-frame signal only; don't
 * trigger the countdown directly off a single `true` result (see
 * `createPoseReadyGate`, which debounces this into a stable trigger).
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
export const isAllVisible = (landmarks) => {
  if(!landmarks || landmarks?.length === 0) return false

  return CORE_LANDMARK_INDICES.every((i) => {
    const lm = landmarks[i]
    if(!lm) return false
    const { x, y, visibility } = lm
    if((visibility ?? 0) <= MIN_VISIBILITY) return false
    return x >= 0 && x <= 1 && y >= 0 && y <= 1
  })
}

/**
 * Stateful gate that turns per-frame `isAllVisible` checks into a
 * debounced "pose confirmed, start the countdown" trigger.
 *
 * Flow: user taps "get ready" -> call `tick(landmarks)` on every
 * pose-estimation frame -> `onReady()` fires once `isAllVisible` has held
 * true continuously for `holdMs`, at which point the caller should show
 * the countdown UI and start it.
 *
 * A single bad frame (self-occlusion mid-adjustment, brief tracking
 * jitter) shouldn't reset progress toward triggering — `lossToleranceMs`
 * absorbs short dropouts. But it still resets reliably if the person
 * actually steps out of frame or out of pose for longer than that.
 *
 * This gate is single-shot (fires once, then goes quiet) — it answers
 * "when should the countdown START", not "is the pose still held during
 * the countdown". If you want the countdown to cancel/reset when pose is
 * lost mid-countdown, that's a separate, lighter watch loop during the
 * countdown itself (simpler: no need to re-debounce the "lost" case with
 * the same hold time, since cancelling early is the safer failure mode
 * there) — call `reset()` on this gate to rearm it if you want the same
 * instance to detect "ready" again afterward.
 *
 * @param {{holdMs?: number, lossToleranceMs?: number, onReady?: () => void, onLost?: () => void}} opts
 */
export function createPoseReadyGate({ holdMs = 800, lossToleranceMs = 200, onReady, onLost } = {}) {
  let visibleSinceMs = null
  let lostSinceMs = null
  let fired = false
 
  return {
    /**
     * Call once per pose-estimation frame with the current landmarks.
     * @param {Landmark[]} landmarks
     * @param {number} [now] - override for testing; defaults to performance.now()
     */
    tick(landmarks, now = performance.now()) {
      if (fired) return
 
      const ok = isAllVisible(landmarks)
 
      if (ok) {
        lostSinceMs = null
        if (visibleSinceMs === null) visibleSinceMs = now
        if (now - visibleSinceMs >= holdMs) {
          fired = true
          onReady?.()
        }
      } else if (visibleSinceMs !== null) {
        if (lostSinceMs === null) lostSinceMs = now
        if (now - lostSinceMs >= lossToleranceMs) {
          visibleSinceMs = null
          lostSinceMs = null
          onLost?.()
        }
      }
    },
 
    /** Rearm the gate so it can fire onReady again (e.g. after a cancelled countdown). */
    reset() {
      visibleSinceMs = null
      lostSinceMs = null
      fired = false
    },
  }
}