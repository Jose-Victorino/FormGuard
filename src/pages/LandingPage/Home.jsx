import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router'
import cn from 'classnames'

import s from './Home.module.scss'
import Button from '@/components/Button/Button'

function Home() {
  const navigate = useNavigate()

  return (
    <>
      <Button 
        text='Login'
        onClick={() => navigate('/auth/login')}
      />
      <Button 
        text='Sign up'
        onClick={() => navigate('/auth/sign-up')}
      />
      <br />
      <br />
      <Button 
        text='App'
        onClick={() => navigate('/app')}
      />
    </>
  )
}

export default Home