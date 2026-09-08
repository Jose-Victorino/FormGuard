import { NavLink, useParams, Navigate } from 'react-router'
import { techniqueHooks } from '@/service/crudService'
import cn from 'classnames'

import s from './Tutorial.module.scss'
import { groupBy, scrollReset } from '@/library/util'
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

  const groupedData = groupBy(techniqueData, 'name')

  const title = (selectedTechnique?.name && selectedTechnique?.variation) ? `${selectedTechnique?.name} ${selectedTechnique?.variation}` : null

  return (
    <div className={s.tutorial}>
      <div className={s.sidebar}>
        <h5>Techniques</h5>
        {Object.entries(groupedData).map(([technique, arr]) =>
          <div key={technique} className={s.techniqueBlock}>
            <h6>{technique}</h6>
            <hr className='mb-5'/>
            <ul>
              {arr.map(({id, variation}) =>
                <li key={id}>
                  <NavLink to={`/app/tutorial/${id}`} className={({isActive}) => cn({[s.active]: isActive})} onClick={() => scrollReset()}>
                    {variation}
                  </NavLink>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
      <div className={s.mainContent}>
        <h3>{title}</h3>
        <div className={s.videoCont}>
          <video src={selectedTechnique?.tutorial_video || ''} controls muted crossOrigin="anonymous"/>
        </div>
        <div
          className={cn(s.description, 'flex-col gap-15 text-justify')}
          dangerouslySetInnerHTML={{__html: selectedTechnique?.tutorial_description}}
        />
      </div>
    </div>
  )
}

export default Tutorial