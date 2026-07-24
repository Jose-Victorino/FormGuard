import { NavLink } from 'react-router'
import { sessionHooks } from '@/service/crudService'
import { UserAuth } from '@/hooks/useAuth'
import Skeleton from 'react-loading-skeleton'
import cn from 'classnames'

import Button from '@/components/Button/Button'

import { formatDate } from '@/library/util'

import s from './RecentSessions.module.scss'

const ASSESSMENT_BADGE = {
  'Excellent': 'badge-excellent',
  'Good': 'badge-good',
  'Needs Improvement': 'badge-needs-improvement',
}

function RecentSessions() {
  const { session } = UserAuth()

  const userId = session?.user?.id

  const { data: { data: sessions = [] } = {}, isLoading, isError, refetch } = sessionHooks.getRecentSessions(userId, { limit: 5 })

  if(isLoading) return (
    <Skeleton height={258} borderRadius={12}/>
  )

  if(isError) return (
    <article className={cn(s.recentSessions, s.errorCell)}>
      <span>Error fetching data</span>
      <Button
        text='Retry'
        onClick={() => refetch()}
      />
    </article>
  )

  return (
    <article className={s.recentSessions}>
      <div className='flex j-space-between'>
        <h6>Recent Sessions</h6>
        <NavLink to='/app/video' className='text-link'>View All</NavLink>
      </div>
      <ol>
        {sessions.map((item) =>
          <li key={item.id}>
            <div className={s.txt}>
              <NavLink to={`/app/video/${item.id}`} className='text-link'>{item.technique?.name}</NavLink>
              <span className={s.date}>{formatDate(item.created_at)}</span>
            </div>
            <div className={s.labelCont}>
              <span className={ASSESSMENT_BADGE[item.overall_assessment]}>{item.overall_assessment}</span>
            </div>
          </li>
        )}
      </ol>
    </article>
  )
}

export default RecentSessions