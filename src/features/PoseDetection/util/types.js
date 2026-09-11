/**
 * @typedef {{
 *  x: number,
 *  y: number,
 *  z: number,
 *  visibility?: number
 * }} Landmark
 */
/**
 * @typedef {Object} LandmarkFrame
 * @property {number} t ms elapsed since recording started 
 * @property {Landmark[]} imageLandmarks 2D, normalized [0,1] to the video frame — use for skeleton overlay rendering 
 * @property {Landmark[]} worldLandmarks 3D, metric meters, hip-centered — use for angle/biomechanical comparison
 */

export {}