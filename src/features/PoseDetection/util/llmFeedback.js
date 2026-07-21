import ollama from 'ollama'

const model = import.meta.env.VITE_LLM_MODEL

/**
 * @typedef {import('./poseProcessing').PoseStats} PoseStats
 */

export const TECHNIQUE_ISSUES = {
  serve: [
    "unstable_posture",
    "poor_balance",

    "poor_positioning",

    "poor_timing",
    "poor_coordination",

    "insufficient_elbow_extension",
    "poor_wrist_control",

    "limited_shoulder_rotation",
    "weak_torso_rotation",

    "inaccurate_serve",
    "inconsistent_execution",
  ],

  clear: [
    "unstable_posture",
    "poor_balance",

    "poor_footwork",
    "poor_positioning",
    "slow_recovery",

    "poor_timing",
    "poor_coordination",

    "insufficient_elbow_extension",
    "poor_wrist_control",
    "incomplete_follow_through",
    "inconsistent_swing",

    "limited_shoulder_rotation",
    "weak_torso_rotation",
    "limited_hip_rotation",

    "inaccurate_clear",
    "inconsistent_execution",
  ],

  smash: [
    "unstable_posture",
    "poor_balance",

    "poor_footwork",
    "poor_positioning",
    "slow_recovery",

    "poor_timing",
    "poor_coordination",

    "insufficient_elbow_extension",
    "poor_wrist_control",
    "incomplete_follow_through",
    "inconsistent_swing",

    "limited_shoulder_rotation",
    "weak_torso_rotation",
    "limited_hip_rotation",

    "weak_smash",
    "inconsistent_execution",
  ],
}

export const TECHNIQUE_STRENGTHS = {
  serve: [
    "balanced_stance",
    "stable_posture",
    "good_wrist_control",
    "good_timing",
    "accurate_serve",
  ],
  clear: [
    "good_footwork",
    "good_positioning",
    "good_elbow_extension",
    "proper_follow_through",
    "controlled_clear",
  ],
  smash: [
    "good_footwork",
    "powerful_smash",
    "good_wrist_control",
    "good_shoulder_rotation",
    "effective_torso_rotation",
  ],
}

/**
 * @param {string} technique
 * @param {string} variation
 * @returns {string}
 */
function buildPrompt(technique, variation){
  const issuesCategories = TECHNIQUE_ISSUES[technique]
  const strengthCategories = TECHNIQUE_STRENGTHS[technique]
  const lines = [
    ""
  ]

  return lines.join('')
}

/**
 * 
 * @param {PoseStats} poseStats 
 * @param {string} technique 
 * @param {string} variation 
 * @returns 
 */
async function analyze(poseStats, technique, variation){
  const prompt = buildPrompt(technique, variation)
  const response = await ollama.chat({
    model,
    messages: [
      {
        role: 'user',
        content: 'What is JavaScript?',
      }
    ],
  })

  let rawResponse = ''

  if(response.done)
    rawResponse = response.message.content
  else return 'Loading response.'

  
}