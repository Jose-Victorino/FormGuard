import { useRef } from 'react'
import { useParams } from 'react-router'
import { sessionHooks } from '@/service/crudService'
import cn from 'classnames'

import Loader from '@/components/Loader'

import s from './VideoPreview.module.scss'

function VideoPreview() {
  const { session_id } = useParams()
  const videoRef = useRef(null)

  const { data: { data: sessionData } = {}, isLoading: isSessionLoading, isError: isSessionError } = sessionHooks.getById({ id: session_id })

  if(isSessionLoading) return <Loader.Bar />

  const overallassessment = sessionData.overall_assessment.replaceAll(' ', '_').toLocaleLowerCase()

  return (
    <>
      <h4>Forehand Serve</h4>
      <div className={s.feedback}>
        <div className='flex-col gap-20'>
          <div className={s.card}>
            <div className='flex-col gap-10'>
              <div className='flex' style={{ width: 'min(100%, 1200px, calc(80vh * 4 / 3))' }}>
                <video ref={videoRef} src={sessionData.video_url} style={{ width: '100%', height: '100%' }} controls muted crossOrigin="anonymous" />
              </div>
              <div className={s.date}>
                <span>Jan 31, 2026</span>
                <span>10:00 am</span>
              </div>
            </div>
            <div className='flex-col gap-15'>
              <div className='flex j-space-between'>
                <span>Overall assessment</span>
                <span className={s[`badge-${overallassessment}`]}>{sessionData.overall_assessment}</span>
              </div>
              <div className='flex j-space-between'>
                <span>Skill Level</span>
                <span className={s.skillBadge}>{sessionData.skill_level}</span>
              </div>
            </div>
            <div className='flex-col gap-5'>
              <h6>ℹ️ Suggestions</h6>
              <ol className='flex-col gap-10'>
                {JSON.parse(sessionData.suggestions).map((su) =>
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
          <p className='text-justify'>{sessionData.feedback}</p>
          <div className='flex-col gap-5'>
            <h6>✅ Strengths</h6>
            <ul className={cn('list-unordered', s.strength)}>
              {sessionData.strength.map(({ category, reason }, i) =>
                <li key={`${category}-${i}`}>
                  {reason}
                </li>
              )}
            </ul>
          </div>
          <div className='flex-col gap-5'>
            <h6>‼️ Issues</h6>
            <ul className={cn('list-unordered', s.issue)}>
              {sessionData.issue.map(({ category, reason }, i) =>
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