import { sessionHooks } from '@/service/crudService'
import { UserAuth } from '@/hooks/useAuth'
import Skeleton from 'react-loading-skeleton'
import cn from 'classnames'
import { Bar } from 'react-chartjs-2'

import Button from '@/components/Button/Button'

import s from './SessionComposition.module.scss'

const styles = getComputedStyle(document.documentElement)

const COLORS = {
  excellent:          styles.getPropertyValue('--color-serve').trim(),
  good:               styles.getPropertyValue('--color-clear').trim(),
  needs_improvement:  styles.getPropertyValue('--color-smash').trim(),
}

/**
 * @param {any} data 
 * @returns {import('chart.js').ChartOptions<"bar">}
 */
const getOptions = (data) => ({
  indexAxis: 'y',
  scales: {
    x: {
      stacked: true,
      max: 100,
      border: { display: false },
      ticks: { callback: (value) => `${value}%` },
    },
    y: {
      stacked: true,
      grid: { display: false },
      border: { display: false },
    },
  },
  plugins: {
    legend: { position: 'bottom' },
    tooltip: {
      callbacks: {
        label: (context) => {
          const percentage = context.parsed.x.toFixed(1)
          const raw = data[context.dataset.label.replaceAll(' ', '_').toLowerCase()]

          return `${context.dataset.label}: ${raw} (${percentage}%)`
        },
      },
    },
  }
})

function SessionComposition() {
  const { session } = UserAuth()

  const userId = session?.user?.id

  const { data: { data = [] } = {}, isLoading, isError, refetch } = sessionHooks.getSessionComposition(userId)

  if(isLoading) return (
    <Skeleton height={190} borderRadius={12}/>
  )

  if(isError) return (
    <article className={cn(s.sessionComposition, s.errorCell)}>
      <span>Error fetching data</span>
      <Button
        text='Retry'
        onClick={() => refetch()}
      />
    </article>
  )

  const sessionData = data[0]
  const { excellent, good, needs_improvement, total } = sessionData
  
  return (
    <article className={s.sessionComposition}>
      <h6>Session Composition</h6>
      <div>
        <p>Overall assessment</p>
        <div className={s.chartCont}>
          <Bar
            options={getOptions(sessionData)}
            data={{
              labels: [''],
              datasets: [
                {
                  label: 'Excellent',
                  data: [total > 0 ? (excellent / total) * 100 : 0],
                  barThickness: 12,
                  backgroundColor: COLORS.excellent,
                },
                {
                  label: 'Good',
                  data: [total > 0 ? (good / total) * 100 : 0],
                  barThickness: 12,
                  backgroundColor: COLORS.good,
                },
                {
                  label: 'Needs Improvement',
                  data: [total > 0 ? (needs_improvement / total) * 100 : 0],
                  barThickness: 12,
                  backgroundColor: COLORS.needs_improvement,
                },
              ]
            }}
          />
        </div>
      </div>
    </article>
  )
}

export default SessionComposition