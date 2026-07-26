import { useState } from 'react'
import { NavLink } from 'react-router'
import { useFormik } from 'formik'
import { UserAuth } from '@/hooks/useAuth'
import useDocumentTitle from '@/hooks/useDocumentTitle'
import * as Yup from 'yup'

import GoBackButton from './GoBackButton'
import Button from '@/components/Button/Button'
import Input from '@/components/Input'
import { toast } from '@/components/Toast'

import s from './SignUp.module.scss'
import { wordCap } from '@/library/util'

const PAGE_NAME = 'Sign up'

const validationSchema = Yup.object().shape({
  first_name: Yup.string()
    .matches(/^[A-Za-z]+$/, 'First name must only contain alphabets')
    .required('First name is required'),
  last_name: Yup.string()
    .matches(/^[A-Za-z]+$/, 'Last name must only contain alphabets')
    .required('Last name is required'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be 8 characters minimum')
    .matches(/[a-z]/, 'Password requires a lowercase letter')
    .matches(/[A-Z]/, 'Password requires an uppercase letter'),
    // .matches(/[0-9]/, 'Password requires a number')
    // .matches(/[^a-zA-Z0-9]/, 'Password requires a symbol')
  confirm_password: Yup.string()
    .required('Please confirm your password')
    .oneOf([Yup.ref('password')], 'Passwords do not match'),
})

function SignUp() {
  const [error, setError] = useState('')
  const { signUp } = UserAuth()

  useDocumentTitle(`${PAGE_NAME} | FormGuard`)

  const { values, errors, isSubmitting, handleChange, handleSubmit } = useFormik({
    initialValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      confirm_password: '',
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      const { first_name, last_name, email, password } = values
      const firstName = wordCap(first_name)
      const lastName = wordCap(last_name)
      
      setSubmitting(true)
      try{
        const res = await signUp(firstName, lastName, email, password)

        if(res.success){
          toast.success('A confirmation email has been sent.')
        }
        if(res.error) setError(res.error)
      } catch(error){
        console.error(error)
        setError('an error occured')
      } finally{
        setSubmitting(false)
      }
    },
  })

  return (
    <div className='flex-col gap-15 mb-30'>
      <GoBackButton />
      <form className={s.form} onSubmit={handleSubmit}>
        <h4>Sign up</h4>
        <div className='flex-col gap-15'>
          <div className='flex gap-15'>
            <Input type='text' name='first_name' value={values.first_name} error={errors.first_name} onChange={handleChange} placeholder='First Name' span='true' required/>
            <Input type='text' name='last_name' value={values.last_name} error={errors.last_name} onChange={handleChange} placeholder='Last Name' span='true' required/>
          </div>
          <Input type='email' name='email' value={values.email} error={errors.email} onChange={handleChange} placeholder='Email' required/>
          <Input type='password' name='password' value={values.password} error={errors.password} onChange={handleChange} placeholder='Password' required/>
          <Input type='password' name='confirm_password' value={values.confirm_password} error={errors.confirm_password} onChange={handleChange} placeholder='Password' required/>
          {error && <span className={s.errorMsg}>{error}</span>}
        </div>
        <Button
          type='submit'
          text={isSubmitting ? 'Loading...' : 'Sign up'}
          color='green'
          span
          disabled={isSubmitting}
        />
      </form>
      <div>
        <p>Already have an account? <NavLink to='/auth/login' className='text-link' replace={true}>Login</NavLink></p>
      </div>
    </div>
  )
}

export default SignUp