import { useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import cn from 'classnames'

import Button from '@/components/Button/Button'
import Input from '@/components/Input'
import { toast } from '@/components/Toast'

import s from './Contact.module.scss'

const validationSchema = Yup.object().shape({
  name: Yup.string()
    .required('Name is required'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  message: Yup.string()
    .required('Message is required'),
})

function Contact() {
  const [error, setError] = useState('')

  const { values, errors, isSubmitting, handleChange, handleSubmit } = useFormik({
    initialValues: {
      name: '',
      email: '',
      message: '',
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      setSubmitting(true)
      try{
        // TODO: wire up to a contact/email endpoint once one exists
        toast.success('Your message has been sent.')
        resetForm()
      } catch(error){
        console.error(error)
        setError('an error occured')
      } finally{
        setSubmitting(false)
      }
    },
  })

  return (
    <div className='container flex j-center pad-block-40'>
      <form className={s.form} onSubmit={handleSubmit}>
        <h4>We love to hear from you!</h4>
        <div className='flex-col gap-15'>
          <Input type='text' name='name' value={values.name} error={errors.name} onChange={handleChange} placeholder='Name' required/>
          <Input type='email' name='email' value={values.email} error={errors.email} onChange={handleChange} placeholder='Email' required/>
          <Input type='textarea' name='message' value={values.message} error={errors.message} onChange={handleChange} placeholder='Message' required/>
          {error && <span className={s.errorMsg}>{error}</span>}
        </div>
        <Button
          type='button'
          text={isSubmitting ? 'Loading...' : 'Send'}
          color='green'
          span
          disabled={isSubmitting}
        />
      </form>
    </div>
  )
}

export default Contact
