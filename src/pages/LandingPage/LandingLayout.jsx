import { Outlet } from 'react-router'

function LandingLayout() {

  return (
    <>
      <main className='container-parent'>
        <Outlet />
      </main>
    </>
  )
}

export default LandingLayout