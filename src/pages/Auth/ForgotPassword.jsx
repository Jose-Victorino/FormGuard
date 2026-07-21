import { useState } from 'react'
import { useFormik } from 'formik'
import { UserAuth } from '@/hooks/useAuth'
import * as Yup from 'yup'
import useDocumentTitle from '@/hooks/useDocumentTitle'
import cn from 'classnames'

import GoBackButton from './GoBackButton'
import Button from '@/components/Button/Button'
import Input from '@/components/Input'

import s from './ForgotPassword.module.scss'

const PAGE_NAME = 'Forgot Password'

const validationSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required')
})

function ForgotPassword() {
  const { requestPasswordReset } = UserAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useDocumentTitle(`${PAGE_NAME} | FormGuard`)

  const { values, errors, isSubmitting, handleChange, handleSubmit } = useFormik({
    initialValues: {
      email: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsLoading(true)
      setError('')
      setSuccessMessage('')

      try{
        const { error } = await requestPasswordReset(values.email)
        if(error) {
          setError(error.message || 'Could not send reset email. Please try again.')
        } else{
          setSuccessMessage('If an account exists for that email, you will receive a link to reset your password shortly.')
        }
      } catch{
        setError('Error sending reset email. Please try again.')
      } finally{
        setIsLoading(false)
      }
    }
  })

  return (
    <form className={cn(s.form, 'mb-30')} onSubmit={handleSubmit}>
      <GoBackButton />
      <h4>Recover Password</h4>
      {successMessage && <span className={s.successMsg}>{successMessage}</span>}
      <Input type='email' name='email' placeholder='Enter email' value={values.email} error={errors.email} onChange={handleChange} required disabled={!!successMessage}/>
      {error && <span className={s.errorMsg}>{error}</span>}
      <Button
        type='submit'
        text={isLoading ? 'Loading...' : 'Confirm'}
        color='green'
        span
        disabled={isLoading || isSubmitting}
      />
    </form>
  )
}

export default ForgotPassword