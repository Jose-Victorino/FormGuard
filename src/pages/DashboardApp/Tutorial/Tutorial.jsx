import { useEffect } from 'react'
import { NavLink, useParams, Navigate } from 'react-router'
import { techniqueHooks } from '@/service/crudService'
import cn from 'classnames'

import s from './Tutorial.module.scss'
import { groupBy } from '@/library/util'
import Skeleton from 'react-loading-skeleton'

function Tutorial() {
  const { technique_id } = useParams()

  const { data: { data: techniqueData = [] } = {}, isLoading } = techniqueHooks.getAll({ order: { column: 'slug', ascending: true}})

  if(isLoading) return (
    <div className={s.tutorial}>
      <div className={s.sidebar}>
        <Skeleton height='2.25em'/>
        <hr />
        <Skeleton height={24} width='60px'/>
        <Skeleton height={24} width='150px'/>
        <Skeleton height={24} width='150px'/>
        <Skeleton height={24} width='150px'/>
        <hr />
        <Skeleton height={24} width='60px'/>
        <Skeleton height={24} width='150px'/>
        <Skeleton height={24} width='150px'/>
        <hr />
        <Skeleton height={24} width='60px'/>
        <Skeleton height={24} width='150px'/>
        <Skeleton height={24} width='150px'/>
        <Skeleton height={24} width='150px'/>
      </div>
      <div className={s.mainContent}>
        <Skeleton />
      </div>
    </div>
  )

  if(techniqueData.length === 0) return <></>
  
  const selectedTechnique = techniqueData.find(({ id }) => id === technique_id)

  if(!selectedTechnique) return (
    <Navigate to={`/app/tutorial/${techniqueData[0].id}`} replace />
  )

  const byName = groupBy(techniqueData, 'name')

  return (
    <div className={s.tutorial}>
      <div className={s.sidebar}>
        <h5>Techniques</h5>
        {Object.entries(byName).map(([technique, arr]) =>
          <div key={technique} className={s.techniqueBlock}>
            <h6>{technique}</h6>
            <hr className='mb-5'/>
            <ul>
              {arr.map(({id, variation}) =>
                <li key={id}>
                  <NavLink to={`/app/tutorial/${id}`} className={({isActive}) => cn({[s.active]: isActive})}>
                    {variation}
                  </NavLink>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
      <div className={s.mainContent}>
        <div className={s.videoCont}>
          <video controls></video>
        </div>
        <div className={s.description}>
        </div>
      </div>
    </div>
  )
}

export default Tutorial