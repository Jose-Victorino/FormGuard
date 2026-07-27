import { useState, useEffect, useRef } from 'react'
import { Navigate, NavLink, useParams } from 'react-router'
import { bucket, sessionHooks, userHooks } from '@/service/crudService'
import { UserAuth } from '@/hooks/useAuth'
import cn from 'classnames'

import useDocumentTitle from '@/hooks/useDocumentTitle'

import Loader from '@/components/Loader'
import Button from '@/components/Button/Button'

import { processRecording } from './util/poseProcessing'

import s from './Feedback.module.scss'

const LLM_RESPONSE = {
  skill_level: "Intermediate",
  overall_assesment: "Needs Improvement",
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

function Feedback() {
  const { session_id } = useParams()
  const { session: authSession } = UserAuth()
  const videoRef = useRef(null)

  useDocumentTitle('Feedback | FormGuard')

  const userId = authSession?.user?.id

  // const { data: { data: sessionData } = {}, isLoading: isSessionLoading, isError: isSessionError } = sessionHooks.getById({ id: session_id })
  // const { data: userRes, isLoading: isUserLoading } = userHooks.getById(
  //   { column: 'id', id: userId },
  //   { enabled: !!userId }
  // )
  // const racketSide = userRes?.data?.racket_side

  // const { mutate: updateSession } = sessionHooks.updateData()

  // const [stats, setStats] = useState(null)

  // const hasValidRacketSide = racketSide === 'left' || racketSide === 'right'

  // useEffect(() => {
  //   if(!sessionData || !hasValidRacketSide) return

  //   let cancelled = false

  //   const run = async () => {
  //     const result = await processRecording({
  //       progressCallback: (pct, msg) => console.log(pct, msg),
  //       videoUrl: sessionData.video_url,
  //       landmarks: sessionData.frames ?? [],
  //       technique: sessionData.technique?.name?.toLocaleLowerCase(),
  //       racketSide,
  //       debug: true
  //     })

  //     if(cancelled) return

  //     // setStats(result)
  //     console.log(result) //? next step, phase & debug response

  //     // Persist the avatar the same way the video itself was persisted, so
  //     // it survives past this browser session too instead of just living as
  //     // an in-memory data URL.
  //     if(result.avatarImage){
  //       try{
  //         const avatarBlob = await (await fetch(result.avatarImage)).blob()
  //         const fileName = `${userId}/${session_id}-thumbnail.jpg`

  //         await bucket().upload(fileName, avatarBlob, { contentType: 'image/jpeg', upsert: true })

  //         if(!cancelled)
  //           updateSession({ payload: { thumbnail_url: bucket().getUrl(fileName) }, id: session_id })
  //       } catch(err){
  //         console.error('Failed to persist avatar thumbnail:', err)
  //       }
  //     }
  //   }

  //   run()

  //   return () => { cancelled = true }
  // }, [sessionData, hasValidRacketSide, racketSide, userId, session_id, updateSession])

  // if(isSessionLoading || isUserLoading) return <Loader.Bar />

  // // Refetchable by ID, so this only happens for a bad/deleted session id
  // if(isSessionError || !sessionData) return <Navigate to='/app' replace />

  // if(!hasValidRacketSide) return (
  //   <div>
  //     <p>We need your racket side to analyze this session.</p>
  //     <NavLink to='/app/profile' className='text-link'>Set it in your profile</NavLink>
  //   </div>
  // )

  const overallAssesment = LLM_RESPONSE.overall_assesment.replaceAll(' ', '_').toLocaleLowerCase()

  return (
    <main className='container-parent flex-col gap-15 pad-block-20'>
      <div className={cn('container', s.feedback)}>
        <div className={cn('flex-col gap-20', s.left)}>
          <div className={s.card}>
            <h4>Session Complete</h4>
            <div className='flex w-100' style={{ aspectRatio: '4 / 3', maxWidth: '100%'}}>
              <video ref={videoRef} style={{ width: '100%', height: '100%' }} controls />
            </div>
            <div className='flex-col gap-15'>
              <div className='flex j-space-between'>
                <span>Overall Assesment</span>
                <span className={s[`badge-${overallAssesment}`]}>{LLM_RESPONSE.overall_assesment}</span>
              </div>
              <div className='flex j-space-between'>
                <span>Skill Level</span>
                <span className={s.skillBadge}>{LLM_RESPONSE.skill_level}</span>
              </div>
            </div>
            <Button
              text='Back to Dashboard'
              span
            />
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
          <div className='flex-col gap-5'>
            <h6>ℹ️ Suggestions</h6>
            <ol className={cn('list-ordered', s.suggestion)}>
              {LLM_RESPONSE.suggestions.map((s) =>
                <li key={s}>
                  {s}
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