import { useState } from 'react'
import { NavLink } from 'react-router'
import { useGlobal } from '@/context/Global'
import { sessionHooks, techniqueHooks } from '@/service/crudService'
import Skeleton from 'react-loading-skeleton'

import useDocumentTitle from '@/hooks/useDocumentTitle'

import Input from '@/components/Input'
import Button from '@/components/Button/Button'

import { formatDate, formatTime, wordCap } from '@/library/util'

import s from './Videos.module.scss'

// TODO: add dropdown filters for techniques and dates
function Videos() {
  const { set } = useGlobal()
  const [technique, setTechnique] = useState('All')
  useDocumentTitle('Videos | FormGuard')

  const { data: { data: optionsData = [] } = {}, isLoading: isTechniqueLoading } = techniqueHooks.getAll({ order: { column: 'slug', ascending: true}})
  const { data: { data: videosData = [] } = {}, isLoading: isVideosLoading } = sessionHooks.getAll({
    select: 'id, technique(name, variation), overall_assessment, thumbnail_url, created_at',
  })

  if(isTechniqueLoading || isVideosLoading) return (
    <>
      <div className='flex j-space-between gap-10'>
        <Skeleton height={48} width={120} borderRadius={6}/>
        <Skeleton height={40} width={160} borderRadius={6}/>
      </div>
      <ul className={s.videoList}>
        <Skeleton className={s.videoCard} height={230} borderRadius={6}/>
        <Skeleton className={s.videoCard} height={230} borderRadius={6}/>
        <Skeleton className={s.videoCard} height={230} borderRadius={6}/>
        <Skeleton className={s.videoCard} height={230} borderRadius={6}/>
        <Skeleton className={s.videoCard} height={230} borderRadius={6}/>
        <Skeleton className={s.videoCard} height={230} borderRadius={6}/>
        <Skeleton className={s.videoCard} height={230} borderRadius={6}/>
        <Skeleton className={s.videoCard} height={230} borderRadius={6}/>
      </ul>
    </>
  )

  const techniqueOptions = ['All', ...new Set(optionsData?.map(({slug}) => slug))].reduce((acc, technique) => {
    acc[technique] = wordCap(technique?.replaceAll('_', ' '))
    return acc
  }, {})

  
  return videosData.length > 0 ? (
    <>
      <div className='flex j-space-between gap-10'>
        <h3>Videos</h3>
        {/* <Input type='select' name='technique' value={technique} onChange={(e) => setTechnique(e.target.value)} options={techniqueOptions} /> */}
      </div>
      <ul className={s.videoList}>
        {videosData.map((vid) => {
          const vidDate = formatDate(vid.created_at)
          const vidTime = formatTime(vid.created_at)

          return (
            <li key={vid.id} className={s.videoCard}>
              <NavLink to={`/app/video/${vid.id}`}>
                <div className={s.thumbnailCont}>
                  <img src={vid.thumbnail_url} loading='lazy' alt='video thumbnail' crossOrigin="anonymous" />
                  <div>
                    <span className={`badge-${vid.overall_assessment?.replaceAll(' ', '_').toLocaleLowerCase()}`}>{vid.overall_assessment}</span>
                  </div>
                </div>
                <div className={s.content}>
                  <div className={s.top}>
                    <p>{`${vid.technique.variation} ${vid.technique.name}`}</p>
                  </div>
                  <div className={s.date}>
                    <span>{vidDate}</span>
                    <span>{vidTime}</span>
                  </div>
                </div>
              </NavLink>
            </li>
          )
          }
        )}
      </ul>
    </>
  ) :
  <div className='flex-col a-center gap-30'>
    <h3>Start your first session</h3>
    <Button
      text='New Recording'
      onClick={() => set('selectionModalToggle', true)}
    />
  </div>
}

export default Videos