import cn from 'classnames'

import s from './Loader.module.scss'

const RenderBar = ({ height = 4 }) => {

  return (
    <div
      className={cn(s.loader, s.bar)}
      style={{ height: height ?? 4 }}
    />
  )
}

const RenderCircular = ({ height = '1.5em' }) => {

  return (
    <div
      className={cn(s.loader, s.circular)}
      style={{ height: height ?? '1.5em' }}
    />
  )
}

function Loader(props){ return <RenderBar {...props}/> } 

Loader.Bar = RenderBar
Loader.Circular = RenderCircular

export default Loader