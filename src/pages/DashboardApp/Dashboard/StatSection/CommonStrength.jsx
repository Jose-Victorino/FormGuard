import { sessionHooks } from '@/service/crudService'
import { UserAuth } from '@/hooks/useAuth'
import Skeleton from 'react-loading-skeleton'
import cn from 'classnames'

import { capitalizeFirstLetter } from '@/library/util'

import Button from '@/components/Button/Button'

import s from './CommonStrength.module.scss'

function CommonStrength() {
  const { session } = UserAuth()

  const userId = session?.user?.id

  const { data: { data: strengths = [] } = {}, isLoading, isError, refetch } = sessionHooks.getCommonStrengths(userId, 3)

  if(isLoading) return (
    <Skeleton height={150} borderRadius={12}/>
  )

  if(isError) return (
    <article className={cn(s.strength, s.errorCell)}>
      <span>Error fetching data</span>
      <Button
        text='Retry'
        onClick={() => refetch()}
      />
    </article>
  )

  return (
    <article className={s.strength}>
      <h6>Common Strengths</h6>
      <ul>
        {strengths.map(({category}) =>
          <li key={category}>{`✅ ${capitalizeFirstLetter(category.replaceAll('_', ' '))}`}</li>
        )}
      </ul>
    </article>
  )
}

export default CommonStrength