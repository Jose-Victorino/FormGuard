import { sessionHooks } from '@/service/crudService'
import { UserAuth } from '@/hooks/useAuth'
import Skeleton from 'react-loading-skeleton'
import cn from 'classnames'

import { formatDuration } from '@/library/util'

import Button from '@/components/Button/Button'

import s from './TrainingActivity.module.scss'

function TrainingActivity() {
  const { session } = UserAuth()

  const userId = session?.user?.id

  const { data: { data = {} } = {}, isLoading, isError, refetch} = sessionHooks.getTrainingOverview(userId)

  if(isLoading) return (
    <article className={s.activity}>
      <Skeleton height={137} borderRadius={12}/>
      <Skeleton height={137} borderRadius={12}/>
      <Skeleton height={137} borderRadius={12}/>
      <Skeleton height={137} borderRadius={12}/>
    </article>
  )

  if(isError) return (
    <article className={cn(s.activity, s.errorCell)}>
      <span>Error fetching data</span>
      <Button
        text='Retry'
        onClick={() => refetch()}
      />
    </article>
  )

  const timeTotal = formatDuration(data?.total_seconds)
  const timeMonthly = formatDuration(data?.monthly_seconds)

  return (
    <article className={s.activity}>
      <div className={s.videos}>
        <h6>Total Videos</h6>
        <p>{data?.total_videos}</p>
        {data?.monthly_videos > 0 && <span className='text-green'>{`+${data.monthly_videos} this month`}</span>}
      </div>
      <div className={s.techniques}>
        <h6>Top Techniques</h6>
        <ol type='1'>
          {data?.top_technique_1 && <li>{data.top_technique_1}</li>}
          {data?.top_technique_2 && <li>{data.top_technique_2}</li>}
          {data?.top_technique_3 && <li>{data.top_technique_3}</li>}
        </ol>
      </div>
      <div className={s.streak}>
        <h6>Training Streak</h6>
        <p>{data?.current_streak} Days🔥</p>
        {data?.longest_streak > 0 && <span>{`Best: ${data.longest_streak}`}</span>}
      </div>
      <div className={s.trainingTime}>
        <h6>Training Time</h6>
        <p>{timeTotal}</p>
        {timeMonthly && <span className='text-green'>{`+${timeMonthly} this month`}</span>}
      </div>
    </article>
  )
}

export default TrainingActivity