import React from 'react'

import s from './SessionComposition.module.scss'
import { Bar } from 'react-chartjs-2'

const styles = getComputedStyle(document.documentElement)

const COLORS = {
  excellent:          styles.getPropertyValue('--color-serve').trim(),
  good:               styles.getPropertyValue('--color-clear').trim(),
  needs_improvement:  styles.getPropertyValue('--color-smash').trim(),
}

function SessionComposition() {
  const rawData = {
    excellent: 9,
    good: 7,
    needs_improvement: 5,
  }

  const total = Object.values(rawData).reduce(
    (sum, value) => sum + value,
    0
  )

  return (
    <article className={s.sessionComposition}>
      <h6>Session Composition</h6>
      <div className={s.chartCont}>
        <Bar
          options={{
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
                    const raw = rawData[context.dataset.label.replaceAll(' ', '_').toLowerCase()]

                    return `${context.dataset.label}: ${raw} (${percentage}%)`
                  },
                },
              },
            }
          }}
          data={{
            labels: [''],
            datasets: [
              {
                label: 'Excellent',
                data: [(rawData.excellent / total) * 100],
                barThickness: 12,
                backgroundColor: COLORS.excellent,
              },
              {
                label: 'Good',
                data: [(rawData.good / total) * 100],
                barThickness: 12,
                backgroundColor: COLORS.good,
              },
              {
                label: 'Needs Improvement',
                data: [(rawData.needs_improvement / total) * 100],
                barThickness: 12,
                backgroundColor: COLORS.needs_improvement,
              },
            ]
          }}
        />
      </div>
    </article>
  )
}

export default SessionComposition