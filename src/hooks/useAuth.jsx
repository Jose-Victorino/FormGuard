import { useState, useEffect, createContext, useContext } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { supabase } from '@/service/crudService'

const AuthContext = createContext(null)
const appURL = window.location.origin

const passwordRecoverLink = `${appURL}/auth/recover`

// Supabase recovery links use URL hash fragments by default; PKCE uses ?code=
function parseHashParams(){
  const raw = window.location.hash.replace(/^#/, '')
  return raw ? new URLSearchParams(raw) : new URLSearchParams()
}

// Call only under React Router (e.g. Recover page).
export function useRecoverySession(){
  const [recoveryStatus, setRecoveryStatus] = useState('checking')
  const [searchParams] = useSearchParams()

  useEffect(() => {
    let cancelled = false

    const establishRecoverySession = async () => {
      const hashParams = parseHashParams()
      const accessToken = searchParams.get('access_token') || hashParams.get('access_token')
      const refreshToken = searchParams.get('refresh_token') || hashParams.get('refresh_token')

      if(accessToken && refreshToken){
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })
        if(cancelled) return
        if(sessionError){
          setRecoveryStatus('invalid')
          return
        }
        setRecoveryStatus('ready')
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
        return
      }

      const code = searchParams.get('code')
      if(code){
        const { error: codeError } = await supabase.auth.exchangeCodeForSession(code)
        if(cancelled) return
        if(codeError){
          setRecoveryStatus('invalid')
          return
        }
        setRecoveryStatus('ready')
        window.history.replaceState(null, '', window.location.pathname)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if(cancelled) return
      if(session){
        setRecoveryStatus('ready')
        return
      }

      setRecoveryStatus('invalid')
    }

    establishRecoverySession()
    return () => {
      cancelled = true
    }
  }, [searchParams])

  return { recoveryStatus }
}

export function AuthContextProvider({children}){
  const [session, setSession] = useState(undefined)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const init = async () => {
      try{
        const { data: { session } } = await supabase.auth.getSession()
        if(isMounted) setSession(session)
      } catch(error){
        console.error('Error getting session: ', error)
      } finally{
        if(isMounted) setIsLoading(false)
      }
    }

    init()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  const signUp = async (first_name, last_name, email, password) => {
    try{
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name,
            last_name
          },
        },
      })
      if(error){
        console.error('Error on sign up: ', error)
        return { success: false, error }
      }

      return { success: true, data }
    } catch(error){
      console.error('Error on sign up: ', error)
    }
  }

  const signIn = async (email, password) => {
    try{
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if(error){
        console.error('Error on login: ', error)
        return { success: false, error: error.message }
      }
      
      return { success: true, data }
    } catch(error){
      console.error('Error on login: ', error)
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()

    if(error) console.error('Error on sign out: ', error.message)
    return error
  }

  const requestPasswordReset = async (email) => (
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: passwordRecoverLink })
  )

  const updatePassword = async (password) => (
    await supabase.auth.updateUser({ password })
  )

  return (
    <AuthContext.Provider value={{session, isLoading, signIn, signUp, signOut, requestPasswordReset, updatePassword}}>
      {children}
    </AuthContext.Provider>
  )
}

export function UserAuth() {
  return useContext(AuthContext)
}

// Wrap components/elements that need to be protected/private
export function ProtectedRoute({children}){
  const { session, isLoading } = UserAuth()

  if(isLoading) return null
  return session ? children : <Navigate to='/auth/login' replace />
}