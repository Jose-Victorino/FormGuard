import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router'
import { useFormik } from 'formik'
import { UserAuth } from '@/hooks/useAuth'
import useDocumentTitle from '@/hooks/useDocumentTitle'
import * as Yup from 'yup'

import GoBackButton from './GoBackButton'
import Button from '@/components/Button/Button'
import Input from '@/components/Input'

import s from './Login.module.scss'

const validationSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be 8 characters minimum')
    .matches(/[a-z]/, 'Password requires a lowercase letter')
    .matches(/[A-Z]/, 'Password requires an uppercase letter')
    // .matches(/[0-9]/, 'Password requires a number')
    // .matches(/[^a-zA-Z0-9]/, 'Password requires a symbol')
})

const PAGE_NAME = 'Login'

function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = UserAuth()

  useDocumentTitle(`${PAGE_NAME} | FormGuard`)

  const { values, errors, isSubmitting, handleChange, handleSubmit } = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      const { email, password } = values
      setLoading(true)
      
      try{
        const res = await signIn(email, password)
        
        if(res.success) navigate('/app')
        if(res.error) setError(res.error)
      } catch(error){
        console.error(error)
        setError('an error occured')
      } finally{
        setLoading(false)
      }
    },
  })

  return (
    <div className='flex-col gap-15 mb-30'>
      <GoBackButton />
      <form className={s.form} onSubmit={handleSubmit}>
        <h4>Login</h4>
        <div className='flex-col gap-5'>
          <Input type='email' name='email' value={values.email} error={errors.email} onChange={handleChange} placeholder='Email' required/>
          <Input type='password' name='password' value={values.password} error={errors.password} onChange={handleChange} placeholder='Password' required/>
          {error && <span className={s.errorMsg}>{error}</span>}
        </div>
        <div className='flex-wrap j-space-between gap-10'>
          <NavLink to='/auth/forgot-password' className='text-link'>Forgot your password?</NavLink>
        </div>
        <Button
          type='submit'
          text={(isSubmitting && loading) ? 'Loading...' : 'Login'}
          color='green'
          span
          disabled={isSubmitting}
        />
      </form>
      <div>
        <p>Don't have an account? <NavLink to='/auth/sign-up' className='text-link' replace={true}>Sign up</NavLink></p>
      </div>
    </div>
  )
}

export default Login