import { useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { sessionHooks } from '@/service/crudService'
import { UserAuth } from '@/hooks/useAuth'
import Skeleton from 'react-loading-skeleton'
import cn from 'classnames'

import Input from '@/components/Input'
import Button from '@/components/Button/Button'

import s from './IssueFrequency.module.scss'

const styles = getComputedStyle(document.documentElement)
const color = styles.getPropertyValue('--color-chart').trim()

const issueData = [
  {
    technique: 'Smash',
    issue_count: 5,
  },
  {
    technique: 'Serve',
    issue_count: 3,
  },
  {
    technique: 'Clear',
    issue_count: 1,
  },
]

function IssueFrequency() {
  const { session } = UserAuth()
  
  const [view, setView] = useState('30d')
  
  const userId = session?.user?.id

  const { data: { data: issues = [] } = {}, isLoading, isError, refetch } = sessionHooks.getIssuesByTechnique(userId, { period: view })

  if(isLoading) return (
    <Skeleton height={358} borderRadius={12}/>
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

  const labels = issues.map(({technique}) => technique)
  const data = issues.map(({issue_count}) => issue_count)

  return (
    <article className={s.issue}>
      <div className='flex-wrap j-space-between'>
        <h6>Issue Frequency</h6>
        <Input type='select' name='technique' value={view} onChange={(e) => setView(e.target.value)} options={{
          '30d': 'Last 30 days',
          'all': 'All time',
        }}/>
      </div>
      <div style={{
        height: '280px',
        width: '100%',
      }}>
        <Bar
          options={{
            indexAxis: 'y',
            scales: {
              x: {
                ticks: {
                  stepSize: 1,
                }
              }
            }
          }}
          data={{
            labels,
            datasets: [{
              label: 'Issue',
              data,
              backgroundColor: color,
              borderColor: color,
              borderRadius: 5,
            }],
          }}
        />
      </div>
    </article>
  )
}

export default IssueFrequency