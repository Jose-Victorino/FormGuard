import { Outlet } from 'react-router'

import Navigation from './components/Navigation/Navigation'
import Footer from './components/Footer/Footer'

function LandingLayout() {

  return (
    <>
      <Navigation />
      <main className='container-parent'>
        <Outlet />
        <Footer />
      </main>
    </>
  )
}

export default LandingLayout