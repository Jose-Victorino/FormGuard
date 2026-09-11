import { useState, useEffect, useRef } from 'react'
import { Navigate, NavLink, useParams } from 'react-router'
import { bucket, sessionHooks, userHooks, issueService, strengthService } from '@/service/crudService'
import { UserAuth } from '@/hooks/useAuth'
import cn from 'classnames'

import useDocumentTitle from '@/hooks/useDocumentTitle'

import Loader from '@/components/Loader'
import Button from '@/components/Button/Button'

import { processRecording } from './util/poseProcessing'
import { analyze } from './util/llmFeedback'

import s from './Feedback.module.scss'

function Feedback() {
  const { session_id } = useParams()
  const { session: authSession } = UserAuth()
  const videoRef = useRef(null)

  useDocumentTitle('Feedback | FormGuard')

  const userId = authSession?.user?.id

  const { data: { data: sessionData } = {}, isLoading: isSessionLoading, isError: isSessionError } = sessionHooks.getById({ id: session_id })
  const { data: userRes, isLoading: isUserLoading } = userHooks.getById(
    { column: 'id', id: userId },
    { enabled: !!userId }
  )
  const racketSide = userRes?.data?.racket_side

  const { mutate: updateSession } = sessionHooks.updateData()

  const [results, setResults] = useState(null)
  const [analysisFailed, setAnalysisFailed] = useState(false)
  const [loadingStage, setLoadingStage] = useState('Analyzing pose')
  // Tracks which session_id this component has already started analyzing.
  // `sessionData` gets a new object reference every time `updateSession`
  // below invalidates the `session` query, and effects also fire twice on
  // mount under dev StrictMode — both would otherwise start (or think they
  // need to cancel) a second `run()`. Checked at every await point inside
  // `run()` too, so the one real run only bails out if the user genuinely
  // navigates to a different session_id, not on either of those.
  const analyzedSessionRef = useRef(null)

  const hasValidRacketSide = racketSide === 'left' || racketSide === 'right'

  useEffect(() => {
    if(!sessionData || !hasValidRacketSide) return
    if(analyzedSessionRef.current === session_id) return
    analyzedSessionRef.current = session_id

    const run = async () => {
      setLoadingStage('Analyzing pose')
      const technique = sessionData.technique?.name?.toLocaleLowerCase()
      const variation = sessionData.technique?.variation?.toLocaleLowerCase()

      const result = await processRecording({
        progressCallback: (pct, msg) => console.log(pct, msg),
        videoUrl: sessionData.video_url,
        landmarks: sessionData.frames ?? [],
        technique,
        variation,
        racketSide,
      })

      // Checked against the ref (not a per-invocation `cancelled` boolean)
      // so this survives StrictMode's dev-only run→cleanup→run and the
      // sessionData reference churn our own `updateSession` calls cause by
      // invalidating the `session` query below — both would otherwise flip
      // a naive `cancelled` flag mid-flight and abort this run before it
      // ever reaches the avatar upload or `analyze()`. Only a genuine
      // navigation to a different session_id changes the ref.
      if(analyzedSessionRef.current !== session_id) return

      // Persist the avatar the same way the video itself was persisted, so
      // it survives past this browser session too instead of just living as
      // an in-memory data URL.
      console.log(sessionData, result)
      if(result.avatarImage){
        try{
          const now = new Date().toLocaleString("en-US", {
            timeZone: "Asia/Manila",
            month: "numeric",
            day: "numeric",
            year: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).replace(/[/:,\s]+/g, "-")

          const avatarBlob = await (await fetch(result.avatarImage)).blob()
          const fileName = `${userId}_${now}.jpg`

          await bucket().upload(fileName, avatarBlob, { contentType: 'image/jpeg', upsert: true })

          if(analyzedSessionRef.current === session_id)
            updateSession({
              payload: {
                thumbnail_url: bucket().getUrl(fileName),
                thumbnail_path: fileName
              },
              id: session_id
            })
        } catch(err){
          console.error('Failed to persist avatar thumbnail:', err)
        }
      }

      if(analyzedSessionRef.current !== session_id) return
      setLoadingStage('Generating feedback')
      const analysis = await analyze({ poseStats: result, technique, variation, racketSide })
      
      if(analyzedSessionRef.current !== session_id) return

      if(!analysis){
        setAnalysisFailed(true)
        return
      }

      setResults(analysis)

      updateSession({
        payload: {
          skill_level: analysis.skill_level,
          overall_assessment: analysis.overall_assessment,
          feedback: analysis.feedback,
          suggestions: JSON.stringify(analysis.suggestions ?? []),
          status: 'complete',
        },
        id: session_id,
      })

      if(analysis.issues?.length){
        issueService
          .putData(analysis.issues.map(({ category, reason }) => ({ session_id, category, reason })))
          .catch((err) => console.error('Failed to persist issue rows:', err))
      }

      if(analysis.strengths?.length){
        strengthService
          .putData(analysis.strengths.map(({ category, reason }) => ({ session_id, category, reason })))
          .catch((err) => console.error('Failed to persist strength rows:', err))
      }
    }

    run()
  }, [sessionData, racketSide, updateSession])

  if(isSessionLoading || isUserLoading) return <><Loader.Bar /></>
  console.log(sessionData)
  
  // Refetchable by ID, so this only happens for a bad/deleted session id or completed session
  if(isSessionError || !sessionData || sessionData?.status === 'complete') return <Navigate to='/app' replace />

  if(!hasValidRacketSide) return (
    <div>
      <p>We need your racket side to analyze this session.</p>
      <NavLink to='/app/profile' className='text-link'>Set it in your profile</NavLink>
    </div>
  )

  if(analysisFailed) return (
    <div>
      <p>We couldn't generate feedback for this session. Please try again later.</p>
      <NavLink to='/app' className='text-link'>Back to Dashboard</NavLink>
    </div>
  )

  if(!results) return (
    <div className={s.loadingWrap}>
      <Loader.Bar />
      <p className={s.loadingText}>{loadingStage}&hellip;</p>
    </div>
  )

  const overallassessment = results.overall_assessment.replaceAll(' ', '_').toLocaleLowerCase()

  return (
    <main className='container-parent flex-col gap-15 pad-block-20'>
      <div className={cn('container', s.feedback)}>
        <div className={cn('flex-col gap-20', s.left)}>
          <div className={s.card}>
            <h4>Session Complete</h4>
            <div className='flex w-100' style={{maxWidth: '100%'}}>
              <video ref={videoRef} src={sessionData.video_url} style={{ width: '100%', height: '100%' }} controls muted crossOrigin="anonymous" />
            </div>
            <div className='flex-col gap-15'>
              <div className='flex j-space-between'>
                <span>Overall assessment</span>
                <span className={s[`badge-${overallassessment}`]}>{results.overall_assessment}</span>
              </div>
              <div className='flex j-space-between'>
                <span>Skill Level</span>
                <span className={s.skillBadge}>{results.skill_level}</span>
              </div>
            </div>
            <Button
              role='link'
              to='/app'
              text='Back to Dashboard'
              span
            />
          </div>
        </div>
        <div className={s.card}>
          <h5>Feedback</h5>
          <p className='text-justify'>{results.feedback}</p>
          <div className='flex-col gap-5'>
            <h6>✅ Strengths</h6>
            <ul className={cn('list-unordered', s.strength)}>
              {results.strengths.map(({ category, reason }, i) =>
                <li key={`${category}-${i}`}>
                  {reason}
                </li>
              )}
            </ul>
          </div>
          <div className='flex-col gap-5'>
            <h6>‼️ Issues</h6>
            <ul className={cn('list-unordered', s.issue)}>
              {results.issues.map(({ category, reason }, i) =>
                <li key={`${category}-${i}`}>
                  {reason}
                </li>
              )}
            </ul>
          </div>
          <div className='flex-col gap-5'>
            <h6>ℹ️ Suggestions</h6>
            <ol className={cn('list-ordered', s.suggestion)}>
              {results.suggestions.map((suggestion, i) =>
                <li key={i}>
                  {suggestion}
                </li>
              )}
            </ol>
          </div>
        </div>
      </div>
    </main>
  )
}

export default Feedback