import { dashboardHooks } from './api.hooks'
import { UserAuth } from '@/hooks/useAuth'
import Skeleton from 'react-loading-skeleton'
import cn from 'classnames'

import { capitalizeFirstLetter } from '@/library/util'

import Button from '@/components/Button/Button'

import s from './CommonIssue.module.scss'

const data = [
  {
    category: "weak_torso_rotation",
    total: 18
  },
  {
    category: "inaccurate_serve",
    total: 12
  },
  {
    category: "inconsistent_swing",
    total: 7
  }
]

function CommonIssue() {
  const { session } = UserAuth()

  const userId = session?.user?.id

  const { data: { data: issues = [] } = {}, isLoading, isError, refetch } = dashboardHooks.getCommonIssues(userId, 3)

  if(isLoading) return (
    <Skeleton height={150} borderRadius={12}/>
  )

  if(isError) return (
    <article className={cn(s.issue, s.errorCell)}>
      <span>Error fetching data</span>
      <Button
        text='Retry'
        onClick={() => refetch()}
      />
    </article>
  )

  return (
    <article className={s.issue}>
      <h6>Common Issues</h6>
      <ul>
        {issues.map(({category, total}) =>
          <li key={category}>{`⚠️ ${capitalizeFirstLetter(category.replaceAll('_', ' '))}`}</li>
        )}
      </ul>
    </article>
  )
}

export default CommonIssue