import React from 'react'
import cn from 'classnames'

import Modal from '@/components/Modal'

import s from './TutorialModal.module.scss'

function TutorialModal({ technique, onClose }) {

  return (
    <Modal onClose={onClose} height='99vh' width='86%'>
      <div className={s.mainContent}>
        <div className={s.videoCont}>
          <video src={technique?.tutorial_video || ''} controls muted crossOrigin="anonymous"/>
        </div>
        <div
          className={cn(s.description, 'flex-col gap-15 text-justify')}
          dangerouslySetInnerHTML={{__html: technique?.tutorial_description}}
        />
      </div>
    </Modal>
  )
}

export default TutorialModal