import { useRef } from 'react'
import cn from 'classnames'

import s from './VideoPreview.module.scss'

const LLM_RESPONSE = {
  skill_level: "Intermediate",
  overall_assessment: "Needs Improvement",
  feedback: "LLM feedback lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione debitis recusandae mollitia? Corrupti corporis dicta minus ipsum quia eaque pariatur facilis dignissimos repellat minima magni dolores aut quod voluptate inventore voluptatum, dolor fugiat. In, itaque excepturi nam provident consequuntur fugiat mollitia voluptatem eligendi sit voluptatibus ducimus a rem neque. lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione debitis recusandae mollitia? Corrupti corporis dicta minus ipsum quia eaque pariatur facilis dignissimos repellat minima magni dolores aut quod voluptate inventore voluptatum, dolor fugiat. In, itaque excepturi nam provident consequuntur fugiat mollitia voluptatem eligendi sit voluptatibus ducimus a rem neque.lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione debitis recusandae mollitia? Corrupti corporis dicta minus ipsum quia eaque pariatur facilis dignissimos repellat minima magni dolores aut quod voluptate inventore voluptatum, dolor fugiat. In, itaque excepturi nam provident consequuntur fugiat mollitia voluptatem.",
  strengths: [
    {
      "category": "",
      "reason": "Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione debitis recusandae"
    },
    {
      "category": "",
      "reason": "Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione"
    },
    {
      "category": "",
      "reason": "Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione debitis recusandae. Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione debitis recusandae"
    },
  ],
  issues: [
    {
      "category": "",
      "reason": "Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione debitis recusandae"
    },
    {
      "category": "",
      "reason": "Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione"
    },
    {
      "category": "",
      "reason": "Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione debitis recusandae. Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione debitis recusandae"
    },
  ],
  suggestions: [
    "Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione debitis recusandae",
    "Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione",
    "Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione debitis recusandae. Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic ratione debitis recusandae"
  ],
}

function VideoPreview() {
  const videoRef = useRef(null)

  const overallassessment = LLM_RESPONSE.overall_assessment.replaceAll(' ', '_').toLocaleLowerCase()

  return (
    <>
      <h4>Forehand Serve</h4>
      <div className={s.feedback}>
        <div className='flex-col gap-20'>
          <div className={s.card}>
            <div className='flex-col gap-10'>
              <div className='flex' style={{ aspectRatio: '4 / 3', width: 'min(100%, 1200px, calc(80vh * 4 / 3))' }}>
                <video ref={videoRef} style={{ width: '100%', height: '100%' }} controls />
              </div>
              <div className={s.date}>
                <span>Jan 31, 2026</span>
                <span>10:00 am</span>
              </div>
            </div>
            <div className='flex-col gap-15'>
              <div className='flex j-space-between'>
                <span>Overall assessment</span>
                <span className={s[`badge-${overallassessment}`]}>{LLM_RESPONSE.overall_assessment}</span>
              </div>
              <div className='flex j-space-between'>
                <span>Skill Level</span>
                <span className={s.skillBadge}>{LLM_RESPONSE.skill_level}</span>
              </div>
            </div>
            <div className='flex-col gap-5'>
              <h6>ℹ️ Suggestions</h6>
              <ol className='flex-col gap-10'>
                {LLM_RESPONSE.suggestions.map((su) =>
                  <li key={su} className={s.suggestion}>
                    {su}
                  </li>
                )}
              </ol>
            </div>
          </div>
        </div>
        <div className={s.card}>
          <h5>Feedback</h5>
          <p className='text-justify'>{LLM_RESPONSE.feedback}</p>
          <div className='flex-col gap-5'>
            <h6>✅ Strengths</h6>
            <ul className={cn('list-unordered', s.strength)}>
              {LLM_RESPONSE.strengths.map(({ category, reason }, i) =>
                <li key={`${category}-${i}`}>
                  {reason}
                </li>
              )}
            </ul>
          </div>
          <div className='flex-col gap-5'>
            <h6>‼️ Issues</h6>
            <ul className={cn('list-unordered', s.issue)}>
              {LLM_RESPONSE.issues.map(({ category, reason }, i) =>
                <li key={`${category}-${i}`}>
                  {reason}
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}

export default VideoPreview