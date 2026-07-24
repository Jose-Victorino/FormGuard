import { useState } from 'react'
import { Line } from 'react-chartjs-2'
import { sessionHooks } from '@/service/crudService'
import { UserAuth } from '@/hooks/useAuth'
import Skeleton from 'react-loading-skeleton'
import cn from 'classnames'

import Input from '@/components/Input'
import Button from '@/components/Button/Button'

import s from './Performance.module.scss'

const styles = getComputedStyle(document.documentElement)

const COLORS = {
  Serve: styles.getPropertyValue('--color-serve').trim(),
  Clear: styles.getPropertyValue('--color-clear').trim(),
  Smash: styles.getPropertyValue('--color-smash').trim(),
}

const ASSESSMENT_TO_VALUE = {
  'Needs Improvement': 0,
  'Good': 1,
  'Excellent': 2,
}

const VALUE_TO_ASSESSMENT = {
  0: 'Needs Improvement',
  1: 'Good',
  2: 'Excellent',
}

const PerformanceData = [
  {
    name: 'Serve',
    overall_assessment: 'Good',
    created_at: '2026-05-22 19:37:58.789024+00'
  },
  {
    name: 'Serve',
    overall_assessment: 'Good',
    created_at: '2026-05-24 19:37:58.789024+00'
  },
  {
    name: 'Serve',
    overall_assessment: 'Needs Improvement',
    created_at: '2026-05-27 19:37:58.789024+00'
  },
  {
    name: 'Serve',
    overall_assessment: 'Excellent',
    created_at: '2026-05-28 19:37:58.789024+00'
  },
]

function Performance() {
  const { session } = UserAuth()
  
  const [technique, setTechnique] = useState('serve')
  const [view, setView] = useState('30d')
  
  const userId = session?.user?.id

  const { data: { data: performanceData = [] } = {}, isLoading, isError, refetch } = sessionHooks.getPerformance(userId, { period: view, technique_name: technique })
  
  if(isLoading) return (
    <Skeleton height={358} borderRadius={12}/>
  )

  if(isError) return (
    <article className={cn(s.performance, s.errorCell)}>
      <span>Error fetching data</span>
      <Button
        text='Retry'
        onClick={() => refetch()}
      />
    </article>
  )

  const techniques = [...new Set(performanceData.map(item => item.name))]

  const labels = [
    ...new Set(
      performanceData.map(item =>
        new Date(item.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      )
    ),
  ]
  const grouped = {}

  for(const item of performanceData){
    const date = new Date(item.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })

    if(!grouped[item.name])
      grouped[item.name] = {}

    grouped[item.name][date] = ASSESSMENT_TO_VALUE[item.overall_assessment]
  }
  const datasets = techniques.map(name => ({
    label: name,
    data: labels.map(date => grouped[name]?.[date] ?? null),
    tension: 0.1,
    backgroundColor: COLORS[name],
    borderColor: COLORS[name],
  }))

  return (
    <article className={s.performance}>
      <div className='flex-wrap j-space-between'>
        <h6>Performance Trend</h6>
        <div className='flex-wrap gap-10'>
          <Input type='select' name='technique' value={technique} onChange={(e) => setTechnique(e.target.value)} options={{
            serve: 'Serve',
            smash: 'Smash',
            clear: 'Clear',
          }}/>
          <Input type='select' name='technique' value={view} onChange={(e) => setView(e.target.value)} options={{
            '30d': 'Last 30 days',
            'all': 'All time',
          }}/>
        </div>
      </div>
      <div style={{
        height: '280px',
        width: '100%',
      }}>
        <Line
          options={{
            scales: {
              y: {
                min: 0,
                max: 2,
                ticks: {
                  stepSize: 1,
                  callback: (value) => VALUE_TO_ASSESSMENT?.[value] || '',
                },
              },
            },
            plugins: {
              tooltip: {
                callbacks: {
                  label: (context) => `${context.dataset.label}: ${VALUE_TO_ASSESSMENT[context.raw]}`,
                },
              },
            },
          }}
          data={{
            labels,
            datasets,
          }}
        />
      </div>
    </article>
  )
}

export default Performance