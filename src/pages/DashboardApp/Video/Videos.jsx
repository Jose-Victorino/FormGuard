import { useState } from 'react'
import { NavLink } from 'react-router'
import { techniqueHooks } from '@/service/crudService'

import useDocumentTitle from '@/hooks/useDocumentTitle'

import { wordCap } from '@/library/util'

import s from './Videos.module.scss'
import Input from '@/components/Input'

// TODO: add dropdown filters for techniques and dates
function Videos() {
  const [technique, setTechnique] = useState('All')
  useDocumentTitle('Videos | FormGuard')

  const { data: { data: optionsData = [] } = {}, isLoading } = techniqueHooks.getAll({ order: { column: 'slug', ascending: true}})

  const techniqueOptions = ['All', ...new Set(optionsData?.map(({slug}) => slug))].reduce((acc, technique) => {
    acc[technique] = wordCap(technique.replaceAll('_', ' '))
    return acc
  }, {})
  
  return (
    <>
      <div className='flex-col gap-10'>
        <h3>Videos</h3>
        <div className='flex j-end'>
          <Input type='select' name='technique' value={technique} onChange={(e) => setTechnique(e.target.value)} options={techniqueOptions} />
        </div>
      </div>
      <ul className={s.videoList}>
        <li className={s.videoCard}>
          <NavLink to='/app/video/123'>
            <div className={s.thumbnailCont}>
              <img src="/E113IHI5.jpg" alt="yes" />
              <div>
                <span className='badge-needs-improvement'>Needs Inprovement</span>
              </div>
            </div>
            <div className={s.content}>
              <div className={s.top}>
                <p>Forehand Serve</p>
              </div>
              <div className={s.date}>
                <span>Jan 31, 2026</span>
                <span>10:00 am</span>
              </div>
            </div>
          </NavLink>
        </li>
      </ul>
    </>
  )
}

export default Videos