import { useRef } from 'react'
import { useParams } from 'react-router'
import { sessionHooks } from '@/service/crudService'
import cn from 'classnames'

import { formatTime, formatDate  } from '@/library/util'

import Loader from '@/components/Loader'

import s from './VideoPreview.module.scss'

function VideoPreview() {
  const { session_id } = useParams()
  const videoRef = useRef(null)

  const { data: { data: sessionData } = {}, isLoading: isSessionLoading, isError: isSessionError } = sessionHooks.getById({ id: session_id })

  if(isSessionLoading) return <Loader.Bar />

  const overallassessment = sessionData.overall_assessment.replaceAll(' ', '_').toLocaleLowerCase()
  const suggestions = JSON.parse(sessionData.suggestions)
  const strengths = sessionData.strength
  const issues = sessionData.issue

  return (
    <>
      <h4>{`${sessionData.technique?.variation} ${sessionData.technique?.name}`}</h4>
      <div className={s.feedback}>
        <div className='flex-col gap-20'>
          <div className={s.card}>
            <div className='flex-col gap-10'>
              <div className='flex' style={{ width: 'min(100%, 1200px, calc(80vh * 4 / 3))' }}>
                <video ref={videoRef} src={sessionData.video_url} style={{ width: '100%', height: '100%' }} controls muted crossOrigin="anonymous" />
              </div>
              <div className={s.date}>
                <span>{formatDate(sessionData.created_at)}</span>
                <span>{formatTime(sessionData.created_at)}</span>
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
            {suggestions.length > 0 &&
              <div className='flex-col gap-5'>
                <h6>ℹ️ Suggestions</h6>
                <ol className='flex-col gap-10'>
                  {suggestions.map((su) =>
                    <li key={su} className={s.suggestion}>
                      {su}
                    </li>
                  )}
                </ol>
              </div>
            }
          </div>
        </div>
        <div className={s.card}>
          <h5>Feedback</h5>
          <p className='text-justify'>{sessionData.feedback}</p>
          {strengths.length > 0 &&
            <div className='flex-col gap-5'>
              <h6>✅ Strengths</h6>
              <ul className={cn('list-unordered', s.strength)}>
                {strengths.map(({ category, reason }, i) =>
                  <li key={`${category}-${i}`}>
                    {reason}
                  </li>
                )}
              </ul>
            </div>
          }
          {issues.length > 0 &&
            <div className='flex-col gap-5'>
              <h6>‼️ Issues</h6>
              <ul className={cn('list-unordered', s.issue)}>
                {issues.map(({ category, reason }, i) =>
                  <li key={`${category}-${i}`}>
                    {reason}
                  </li>
                )}
              </ul>
            </div>
          }
        </div>
      </div>
    </>
  )
}

export default VideoPreview