import { useState } from 'react'
import { useNavigate } from 'react-router'
import { techniqueHooks } from '@/service/crudService'
import cn from 'classnames'

import { groupBy } from '@/library/util'

import Modal from '@/components/Modal'
import Button from '@/components/Button/Button'

import s from './SelectionModal.module.scss'
import Skeleton from 'react-loading-skeleton'

const Checkbox = ({ checked }) => (
  <div className={cn(s.checkbox, {[s.checked]: checked})}>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M530.8 134.1C545.1 144.5 548.3 164.5 537.9 178.8L281.9 530.8C276.4 538.4 267.9 543.1 258.5 543.9C249.1 544.7 240 541.2 233.4 534.6L105.4 406.6C92.9 394.1 92.9 373.8 105.4 361.3C117.9 348.8 138.2 348.8 150.7 361.3L252.2 462.8L486.2 141.1C496.6 126.8 516.6 123.6 530.9 134z"/></svg>
  </div>
)

function SelectionModal({ onClose }) {
  const navigate = useNavigate()
  const [selectedTechnique, setSelectedTechnique] = useState('')
  
  const {data: { data: techniqueData = []} = {}, isLoading} = techniqueHooks.getAll({ order: { column: 'slug', ascending: true}})
  const byName = groupBy(techniqueData, 'name')

  const proccedToSession = () => {
    onClose()
    navigate(`/app/session/${selectedTechnique}`)
  }

  return (
    <Modal
      width='760px'
      height='fit-content'
      onClose={onClose}
    >
      <Modal.Header>
        {isLoading ? <Skeleton height={42} width={200}/> :
          <h4>Select a technique</h4>
        }
      </Modal.Header>
      <ul className={s.techniqueList}>
        {isLoading
          ? <>
              <Skeleton height={280} borderRadius={6}/>
              <Skeleton height={280} borderRadius={6}/>
              <Skeleton height={280} borderRadius={6}/>
            </>
          : Object.entries(byName).map(([technique, arr]) =>
            <li key={technique} className={cn(s.techniqueItem, s[`technique${technique}`])}>
              <div className={s.bar} />
              <div className='flex-col a-center pad-block-10'>
                <div className={s.img} />
                <h4>{technique}</h4>
              </div>
              <ul className={s.variationList}>
                {arr.map(({id, variation, slug}) => {
                  const isSelected = selectedTechnique === slug

                  return (
                    <li
                      key={id}
                      role='button'
                      className={cn({[s.selected]: isSelected})}
                      onClick={() => setSelectedTechnique(isSelected ? '' : slug)}
                    >
                      <Checkbox checked={isSelected}/>
                      <span>{variation}</span>
                    </li>
                  )
                })}
              </ul>
            </li>
          )
        }
      </ul>
      <Modal.Footer>
        {isLoading ? <Skeleton height={40} width={107}/> :
          <Button
            text='Continue'
            disabled={selectedTechnique === ''}
            onClick={() => proccedToSession()}
          />
        }
      </Modal.Footer>
    </Modal>
  )
}

export default SelectionModal