import { useLayoutEffect } from 'react'
import { Chart, CategoryScale, LinearScale, BarElement, LineElement, PointElement, LineController, BarController, Tooltip, Legend, Colors } from 'chart.js'
import { useGlobal } from '@/context/Global'
import { UserAuth } from '@/hooks/useAuth'

import useDocumentTitle from '@/hooks/useDocumentTitle'

import { dashboardHooks } from './StatSection/api.hooks'
import TrainingActivity from './StatSection/TrainingActivity'
import RecentSessions from './StatSection/RecentSessions'
import BodyHeatmap from './StatSection/BodyHeatmap'
import CommonStrength from './StatSection/CommonStrength'
import CommonIssue from './StatSection/CommonIssue'
import IssueFrequency from './StatSection/IssueFrequency'
import Performance from './StatSection/Performance'
import SessionComposition from './StatSection/SessionComposition'

import s from './Dashboard.module.scss'
import Button from '@/components/Button/Button'
import Skeleton from 'react-loading-skeleton'

Chart.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, LineController, BarController, Tooltip, Legend, Colors)

Chart.defaults.responsive = true
Chart.defaults.maintainAspectRatio = false
// @ts-ignore
Chart.defaults.animation.duration = 500
Chart.defaults.plugins.tooltip.animation = false

function setChartDefaults(){
  const styles = getComputedStyle(document.documentElement)
  const colorText = styles.getPropertyValue('--color-text').trim()
  const colorGrid = styles.getPropertyValue('--color-chart-grid').trim()

  Chart.defaults.color = colorText
  Chart.defaults.scale.ticks.color = colorText
  Chart.defaults.scale.grid.color = colorGrid
  Chart.defaults.borderColor = colorGrid
}
setChartDefaults()

function Dashboard() {
  const { state, set } = useGlobal()
  const { session } = UserAuth()
  const userId = session?.user?.id

  useDocumentTitle('Dashboard | FormGuard')

  const {
    data: { data: overviewData } = {},
    isLoading: isOverviewLoading,
    isError: isOverviewError,
  } = dashboardHooks.getTrainingOverview(userId)

  // Treat "no videos yet" as a new user; if the check fails, fall back to the
  // normal dashboard so each StatSection can surface its own error/retry state.
  // const newUser = !isOverviewLoading && !isOverviewError && (overviewData?.total_videos ?? 0) === 0
  const newUser = false

  useLayoutEffect(() => {
    setChartDefaults()
    Object.values(Chart.instances).forEach(chart => {
      chart.update()
    })
  }, [state.theme])

  if(isOverviewLoading) return (
    <>
      <div className='flex-wrap j-space-between'>
        <Skeleton height={32} width={180} borderRadius={12}/>
        <Skeleton height={48} width={160} borderRadius={6}/>
      </div>
      <div className={s.statActivity}>
        <Skeleton height={137} borderRadius={12}/>
        <Skeleton height={137} borderRadius={12}/>
        <Skeleton height={137} borderRadius={12}/>
        <Skeleton height={137} borderRadius={12}/>
      </div>
      <Skeleton height={258} borderRadius={12}/>
      <div className={s.statGroup}>
        <Skeleton height={358} borderRadius={12}/>
        <Skeleton height={358} borderRadius={12}/>
      </div>
      <Skeleton height={358} borderRadius={12}/>
      <div className={s.statGroup}>
        <Skeleton height={150} borderRadius={12}/>
        <Skeleton height={150} borderRadius={12}/>
      </div>
    </>
  )

  return newUser ? (
    <div className='flex-col a-center gap-30'>
      <h3>Start your first session</h3>
      <Button
        text='New Recording'
        onClick={() => set('selectionModalToggle', true)}
      />
    </div>
  ) : (
    <>
      <div className='flex-wrap j-space-between'>
        <h3>Dashboard</h3>
        <Button
          text='New Recording'
          onClick={() => set('selectionModalToggle', true)}
        />
      </div>
      <TrainingActivity />
      <RecentSessions />
      <div className={s.statGroup}>
        <Performance />
        <IssueFrequency />
      </div>
      <BodyHeatmap />
      <div className={s.statGroup}>
        <CommonStrength />
        <CommonIssue />
      </div>
      <SessionComposition />
    </>
  )
}

export default Dashboard