import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SkeletonTheme } from 'react-loading-skeleton'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AuthContextProvider } from './hooks/useAuth'
import { GlobalProvider, useGlobal } from '@/context/Global'
import { SKELETON_COLORS } from '@/library/theme'

import App from './App.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
    mutations: {
      retry: false,
    }
  }
})

const withProviders = (providers, children) => (
  providers.reduce((acc, entry) => {
    const [Provider, props] = Array.isArray(entry)
      ? entry : [entry, {}]

    return <Provider {...props}>{acc}</Provider>
  }, children)
)

function ThemedSkeletonProvider({ children }) {
  const { state } = useGlobal()
  const { baseColor, highlightColor } = SKELETON_COLORS[state.theme] ?? SKELETON_COLORS.light

  return (
    <SkeletonTheme baseColor={baseColor} highlightColor={highlightColor}>
      {children}
    </SkeletonTheme>
  )
}

const providers = [
  ThemedSkeletonProvider,
  AuthContextProvider,
  [QueryClientProvider, { client: queryClient }],
  GlobalProvider,
]

createRoot(document.getElementById('root')).render(
  withProviders(providers,
    <>
      <App />
      <ReactQueryDevtools buttonPosition='bottom-left'/>
    </>
  )
)
