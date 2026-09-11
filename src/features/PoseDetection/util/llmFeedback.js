import { OpenRouter } from '@openrouter/sdk'

import { REFERENCES } from './references'

const model = import.meta.env.VITE_LLM_MODEL
const apiKey = import.meta.env.VITE_API_KEY

/**
 * @typedef {import('./poseProcessing').PoseStats} PoseStats
 * @typedef {import('./poseProcessing').AngleKeys} AngleKeys
 * @typedef {import('./poseProcessing').AllAngleStats} AllAngleStats
 * @typedef {import('./poseProcessing').AngularVelocity} AngularVelocity
 * @typedef {import('./poseProcessing').PhaseLabels} PhaseLabels
 * @typedef {import('./poseProcessing').Phases} Phases
 * @typedef {import('./poseProcessing').KinematicSequence} KinematicSequence
 * @typedef {{
 *  poseStats: PoseStats,
 *  technique: string,
 *  variation: string,
 *  racketSide: string,
 * }} SessionInfo
 * @typedef {{
 *  skill_level: 'Beginner' | 'Intermediate' | 'Expert',
 *  overall_assessment: 'Excellent' | 'Good' | 'Needs Improvement',
 *  feedback: string,
 *  strengths: Array<{category: string, reason: string}>,
 *  issues: Array<{category: string, reason: string}>,
 *  suggestions: string[],
 * }} Response
 */

const openRouter = new OpenRouter({ apiKey })

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

const PHASE_ORDER = /** @type {PhaseLabels[]} */ (['preparation', 'backswing', 'contact', 'follow_through'])
const ANGLE_KEYS = /** @type {AngleKeys[]} */ ([
  'right_elbow', 'left_elbow', 'right_knee', 'left_knee',
  'torso_lean', 'torso_rotation', 'right_wrist_angle', 'left_wrist_angle',
])

/** @type {Record<PhaseLabels, string>} */
const PHASE_TITLES = {
  preparation: 'Preparation',
  backswing: 'Backswing',
  contact: 'Contact',
  follow_through: 'Follow Through',
}

/** @type {Record<AngleKeys, string>} */
const ANGLE_TITLES = {
  right_elbow: 'Right Elbow',
  left_elbow: 'Left Elbow',
  right_knee: 'Right Knee',
  left_knee: 'Left Knee',
  torso_lean: 'Torso Lean',
  torso_rotation: 'Torso Rotation',
  right_wrist_angle: 'Right Wrist',
  left_wrist_angle: 'Left Wrist',
}

/**
 * Coaching reference knowledge per technique/variation — proper-execution
 * key points sourced from the FormGuard technique guide, keyed the same way
 * as `REFERENCES` (`${technique}.${variation}`). This grounds the LLM in
 * what "correct" actually looks like for this specific stroke, on top of
 * the numeric comparison against `REFERENCES` — the two are complementary,
 * not redundant: a technique/variation can have knowledge here before any
 * expert recording exists for it (see `REFERENCES`, currently only
 * `smash.forehand`).
 * @type {Record<string, {description: string, keyPoints: string[]}>}
 */
const TECHNIQUE_KNOWLEDGE = {
  'clear.forehand': {
    description: "A stroke that sends the shuttle high and deep into the opponent's backcourt, hit from the forehand side.",
    keyPoints: [
      'Proper shoulder rotation',
      'Balanced body position',
      'Contact point above the body',
      'Controlled racket follow-through',
      'Smooth weight transfer',
    ],
  },
  'clear.backhand': {
    description: "A stroke that sends the shuttle high and deep into the opponent's backcourt, hit from the backhand side.",
    keyPoints: [
      'Correct backhand grip',
      'Proper body positioning',
      'Controlled wrist movement',
      'Stable balance during the stroke',
      'Recovery after execution',
    ],
  },
  'smash.forehand': {
    description: 'An attacking stroke that drives the shuttle downward with speed and power, hit from the forehand side.',
    keyPoints: [
      'High contact point',
      'Proper shoulder and hip rotation',
      'Fast racket acceleration',
      'Controlled body balance',
      'Strong follow-through',
    ],
  },
  'smash.backhand': {
    description: 'An attacking stroke that drives the shuttle downward with speed and power, hit from the backhand side.',
    keyPoints: [
      'Correct backhand grip',
      'Proper timing',
      'Controlled wrist action',
      'Stable posture',
      'Quick recovery',
    ],
  },
  'serve.forehand': {
    description: 'A service technique using a forehand grip and swinging motion to send the shuttle across the net.',
    keyPoints: [
      'Stable stance',
      'Controlled racket movement',
      'Proper contact point',
      'Accurate shuttle placement',
    ],
  },
  'serve.backhand': {
    description: 'A short-serve technique from the backhand side, focused on precise, controlled placement.',
    keyPoints: [
      'Proper backhand grip',
      'Controlled wrist movement',
      'Stable body position',
      'Accurate shuttle contact',
    ],
  },
}

/**
 * Formats a number for the prompt, falling back to an em dash when a stat
 * is missing for a given key — keeps the measurement block readable instead
 * of printing "undefined".
 * @param {number | undefined | null} n
 */
function _fmt(n){
  return (n === undefined || n === null) ? '—' : n
}

/**
 * Renders the phase-by-phase angle snapshot: one line per angle present at
 * each phase, plus its timestamp in seconds. Phases are looked up by label
 * (not iterated in array order) since `phases` from `poseProcessing.js` is
 * sorted by timestamp, not by phase order. Deliberately omits raw
 * landmark coordinates — they carry no interpretable coaching signal beyond
 * what's already captured in the derived angles.
 * @param {Phases} phases
 */
function _renderPhases(phases){
  const byLabel = Object.fromEntries((phases ?? []).map((p) => [p.label, p]))

  const blocks = PHASE_ORDER.map((label, i) => {
    const phase = byLabel[label]
    if(!phase) return null

    const angleLines = ANGLE_KEYS
      .filter((k) => phase.angles?.[k] !== undefined)
      .map((k) => `  - ${ANGLE_TITLES[k]}: ${_fmt(phase.angles[k])}°`)
      .join('\n')

    return [
      `${i + 1}. ${PHASE_TITLES[label]}`,
      `- Timestamp: ${_fmt(phase.t)}s`,
      angleLines || '  - No angle data available',
    ].join('\n')
  }).filter(Boolean)

  return blocks.length ? blocks.join('\n\n') : 'No phase data available'
}

/**
 * Renders overall (whole-clip) angle statistics: range of motion + mean/std,
 * one line per angle key present in `angleStats`.
 * @param {AllAngleStats | {}} angleStats
 */
function _renderAngleStats(angleStats){
  const lines = ANGLE_KEYS
    .filter((k) => angleStats?.[k])
    .map((k) => {
      const { rangeOfMotion, informational } = angleStats[k]
      return `- ${ANGLE_TITLES[k]}: Mean ${_fmt(informational?.avg)}°; Minimum ${_fmt(rangeOfMotion?.min)}°; Maximum ${_fmt(rangeOfMotion?.max)}°; Standard Deviation ${_fmt(informational?.std)}°`
    })

  return lines.length ? lines.join('\n') : 'No angle statistics available'
}

/**
 * Renders angular velocity statistics (peak + mean, °/s) — reflects
 * movement explosiveness and fluidity — one line per angle key present in
 * `angularVelocity`.
 * @param {AngularVelocity | {}} angularVelocity
 */
function _renderAngularVelocity(angularVelocity){
  const lines = ANGLE_KEYS
    .filter((k) => angularVelocity?.[k])
    .map((k) => {
      const { powerMetric, informational } = angularVelocity[k]
      return `- ${ANGLE_TITLES[k]}: Peak ${_fmt(powerMetric?.max)}°/s; Mean ${_fmt(informational?.mean)}°/s`
    })

  return lines.length ? lines.join('\n') : 'No angular velocity data available'
}

/**
 * Renders the hip-to-shoulder kinematic sequence — hips rotating ahead of
 * shoulders (a positive lead time) is the hallmark of a powerful, well-
 * sequenced stroke, so this is called out separately from the raw angle data.
 * `kinematicSequence` is `null` (not `{}`) whenever `phaseDetection` couldn't
 * find both a hip and shoulder rotation peak — e.g. too little visible
 * rotation in the clip — so this checks falsiness before `Object.keys`
 * rather than assuming the empty case is always an object.
 * @param {KinematicSequence | {}} kinematicSequence
 */
function _renderKinematicSequence(kinematicSequence){
  if(!kinematicSequence || !Object.keys(kinematicSequence).length) return 'Not available for this clip'

  //@ts-ignore
  const { hipPeakTime, shoulderPeakTime, leadTime, hipPeakAngularVelocity, shoulderPeakAngularVelocity } = kinematicSequence

  return [
    `- Hip rotation peaked at ${_fmt(hipPeakTime)}s (${_fmt(hipPeakAngularVelocity)}°/s)`,
    `- Shoulder rotation peaked at ${_fmt(shoulderPeakTime)}s (${_fmt(shoulderPeakAngularVelocity)}°/s)`,
    `- Hip-to-shoulder lead time: ${_fmt(leadTime)}s`,
  ].join('\n')
}

/**
 * Renders one full measurement block (phase snapshots, overall angle stats,
 * angular velocity, kinematic sequence) from a `PoseStats`-shaped object.
 * Used for both the athlete's own data and an expert `REFERENCES` entry,
 * since a reference is just a previously-captured `PoseStats` recording
 * (see `library/references.js`) — same renderer, no duplicated formatting.
 * @param {PoseStats} poseStats
 */
function _renderMeasurementBlock(poseStats){
  return [
    '### Angle Statistics & Timestamps per Phase',
    _renderPhases(poseStats.phases),
    '',
    '### Overall Angle Statistics',
    _renderAngleStats(poseStats.angleStats),
    '',
    '### Angular Velocity Statistics (°/s; reflects movement explosiveness and fluidity)',
    _renderAngularVelocity(poseStats.angularVelocity),
    '',
    '### Kinematic Sequence (hip-to-shoulder rotation timing)',
    _renderKinematicSequence(poseStats.kinematicSequence),
  ].join('\n')
}


/**
 * Builds the system + user messages sent to the LLM. Kept as two messages
 * (rather than one combined string, as the original stub implied) so the
 * persona/constraints/output-format instructions live in `system` and the
 * per-session measurements live in `user` — standard chat-completions
 * separation, and keeps the instructions stable across sessions for
 * prompt caching.
 * @param {SessionInfo} sessionInfo
 * @returns {{system: string, user: string}}
 */
function buildPrompt({ poseStats, technique, variation, racketSide }){
  const { analyzedSamples, duration } = poseStats
  const key = `${technique}.${variation}`

  const issueCategories = TECHNIQUE_ISSUES[technique] ?? []
  const strengthCategories = TECHNIQUE_STRENGTHS[technique] ?? []
  const knowledge = TECHNIQUE_KNOWLEDGE[key]
  const reference = REFERENCES[key]

  const overviewBlock = [
    '## Athlete',
    '### Video Overview',
    `- Number of analyzed samples: ${analyzedSamples}`,
    `- Video Duration: ${duration} seconds`,
    `- Racket Side: ${racketSide}`,
  ].join('\n')

  const expertBlock = [
    '## Expert',
    reference
      ? _renderMeasurementBlock(reference)
      : 'No expert reference data is available yet for this technique/variation — evaluate the athlete on technique fundamentals alone, without a numeric comparison.',
  ].join('\n')

  const user = [
    overviewBlock,
    _renderMeasurementBlock(poseStats),
    expertBlock,
  ].join('\n\n')

  const personaBlock = [
    'You are a professional badminton AI coach. Your speaking style is a sports commentator capable of',
    'making feedback relatable so they remember a flaw, or offering a word of affirmation to engage them.',
    `Perform a comparative analysis of the \`${variation} ${technique}\` technique using the athlete's`,
    'skeletal key-point statistics, compared against the expert data in a similar format when available.',
  ].join('\n')

  const knowledgeBlock = knowledge ? [
    `## What a correct ${variation} ${technique} looks like`,
    knowledge.description,
    'Key points to maintain:',
    ...knowledge.keyPoints.map((p) => `- ${p}`),
  ].join('\n') : null

  const constraintsBlock = [
    '## Output constraints — strictly enforced',
    "- **Never** mention frame numbers or the word 'frame' in any field.",
    '- **Never** mention any angles anywhere.',
    "- **Never** mention 'expert' anywhere.",
    '- **Avoid** using big and profound words, keep it simple and understandable',
    '- When referencing a specific moment use the timestamp in seconds only (ex. "at 10 seconds into the video").',
    '- Prefer describing movement patterns over single-snapshot observations whenever possible.',
  ].join('\n')

  const strengthsBlock = [
    '### Allowed strength categories',
    'You MUST select strengths only from the following list. Choose at most 3. Do not invent new strength categories.',
    strengthCategories.join(', '),
  ].join('\n')

  const issuesBlock = [
    '### Allowed issue categories',
    'You MUST select issues only from the following list. Choose at most 3. Do not invent new issue categories.',
    issueCategories.join(', '),
  ].join('\n')

  const jsonBlock = [
    '### JSON response',
    "ONLY return the following JSON — don't include any extra text, Markdown, line breaks, or explanations:",
    JSON.stringify({
      skill_level: '<Beginner | Intermediate | Expert>',
      overall_assessment: '<Excellent | Good | Needs Improvement>',
      feedback: '<Overall coaching feedback, 150-250 words. Write like an encouraging coach. Avoid stiff phrases like "overall performance" or "in summary". Make it fun to read>',
      strengths: [{ category: '<strength category>', reason: '<why this is a strength>' }],
      issues: [{ category: '<issue category>', reason: '<why this is an issue>' }],
      suggestions: ['<actionable tip 1>', '<actionable tip 2>', '<actionable tip 3>'],
    }, null, 2),
  ].join('\n')

  const system = [personaBlock, knowledgeBlock, constraintsBlock, strengthsBlock, issuesBlock, jsonBlock]
    .filter(Boolean)
    .join('\n\n')

  return { system, user }
}

/**
 * Strips ```json fences some models add despite instructions not to, and
 * parses the result. Returns null (rather than throwing) on malformed JSON
 * so the caller can fall back gracefully instead of crashing the feedback
 * flow — same "fallback over silent failure" rule as poseProcessing.js,
 * except here the failure is loud (console.error) since there's no
 * reasonable default feedback to fall back to.
 * @param {string} content
 */
function _parseResponse(content){
  const cleaned = content.replace(/```json|```/g, '').trim()
  try{
    return JSON.parse(cleaned)
  } catch(err){
    console.error('llmFeedback: failed to parse LLM response as JSON:', err, content)
    return null
  }
}

/**
 * Drops any strength/issue entries whose category isn't in the allowed
 * list for this technique — a model can still hallucinate a category
 * despite the prompt constraint, and a hallucinated category would silently
 * break the Dashboard's body-heatmap mapping (see Issue & Strength
 * Taxonomy) if it reached the database.
 * @param {any} result
 * @param {string} technique
 */
function _sanitizeResult(result, technique){
  if(!result) return result

  const allowedIssues = new Set(TECHNIQUE_ISSUES[technique] ?? [])
  const allowedStrengths = new Set(TECHNIQUE_STRENGTHS[technique] ?? [])

  return {
    ...result,
    strengths: (result.strengths ?? []).filter((s) => allowedStrengths.has(s.category)).slice(0, 3),
    issues: (result.issues ?? []).filter((i) => allowedIssues.has(i.category)).slice(0, 3),
  }
}

/** @type {Response} */
const LLM_RESPONSE = {
  skill_level: "Intermediate",
  overall_assessment: "Needs Improvement",
  feedback: "LLM feedback lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione debitis recusandae mollitia? Corrupti corporis dicta minus ipsum quia eaque pariatur facilis dignissimos repellat minima magni dolores aut quod voluptate inventore voluptatum, dolor fugiat. In, itaque excepturi nam provident consequuntur fugiat mollitia voluptatem eligendi sit voluptatibus ducimus a rem neque. lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione debitis recusandae mollitia? Corrupti corporis dicta minus ipsum quia eaque pariatur facilis dignissimos repellat minima magni dolores aut quod voluptate inventore voluptatum, dolor fugiat. In, itaque excepturi nam provident consequuntur fugiat mollitia voluptatem eligendi sit voluptatibus ducimus a rem neque.lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione debitis recusandae mollitia? Corrupti corporis dicta minus ipsum quia eaque pariatur facilis dignissimos repellat minima magni dolores aut quod voluptate inventore voluptatum, dolor fugiat. In, itaque excepturi nam provident consequuntur fugiat mollitia voluptatem.",
  strengths: [
    {
      "category": "powerful_smash",
      "reason": "Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione debitis recusandae"
    },
    {
      "category": "good_wrist_control",
      "reason": "Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione"
    },
    {
      "category": "good_shoulder_rotation",
      "reason": "Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione debitis recusandae. Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione debitis recusandae"
    },
  ],
  issues: [
    {
      "category": "unstable_posture",
      "reason": "Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione debitis recusandae"
    },
    {
      "category": "poor_timing",
      "reason": "Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione"
    },
    {
      "category": "weak_torso_rotation",
      "reason": "Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione debitis recusandae. Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione debitis recusandae"
    },
  ],
  suggestions: [
    "Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione debitis recusandae",
    "Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione",
    "Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione debitis recusandae. Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione debitis recusandae"
  ],
}

/**
 * Runs the full coaching-feedback step for one session: builds the prompt
 * from `poseStats` (+ expert reference, when available), sends it to the
 * configured LLM, and returns the parsed/sanitized structured result ready
 * to merge onto the session row (`skill_level`, `overall_assessment`,
 * `feedback`, `suggestions`, `strengths`, `issues` — see Supabase Schema).
 * Returns null on any failure so the caller can leave those columns null
 * and retry later rather than partially writing a broken session.
 * @param {SessionInfo} sessionInfo
 * @returns {Promise<Response | null>}
 */
export async function analyze(sessionInfo){
  const { technique } = sessionInfo
  const prompt = buildPrompt(sessionInfo)

  try{
    const result = await openRouter.chat.send({
      chatRequest: {
        model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        stream: false,
      },
    })

    // `send()`'s declared return type is always the streaming|non-streaming
    // union regardless of the `stream: false` we passed, so `choices` isn't
    // on the narrowed type even though it's always present at runtime here
    // — duck-type check instead of trusting the SDK's overload resolution.
    if(!result || !('choices' in result)){
      console.error('llmFeedback: expected a non-streaming ChatResult but got something else:', result)
      return null
    }

    const rawContent = result.choices?.[0]?.message?.content
    // Assistant content is `string | ChatContentItems[] | null` — join text
    // parts if the provider returned content blocks instead of a plain string.
    const content = Array.isArray(rawContent)
      ? rawContent.map((part) => (part.type === 'text' ? part.text : '')).join('')
      : rawContent

    if(!content){
      console.error('llmFeedback: LLM response had no message content:', result)
      return null
    }

    const parsed = _parseResponse(content)
    return _sanitizeResult(parsed, technique)

    // return LLM_RESPONSE
  } catch(err){
    console.error('llmFeedback: analyze() failed:', err)
    return null
  }
}