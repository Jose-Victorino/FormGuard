import React from 'react'
import { Link } from 'react-router'
import cn from 'classnames'

import s from './Button.module.scss'

/**
 * @typedef {'primary' | 'secondary' | 'tertiary'} ButtonTypes
 * @typedef {'sm' | 'md' | 'lg'} ButtonSizes
 * @typedef {'left' | 'right'} IconPosition
 * @typedef {'blue' | 'red' | 'yellow' | 'green' | 'light' | 'dark'} ButtonColor
 * @typedef {'sharp' | 'curved' | 'rounded'} Corners
 */
/**
 * Shared props
 * @typedef {{
 *  btnType?: ButtonTypes,
 *  text?: String,
 *  size?: ButtonSizes,
 *  icon?: React.JSX.Element,
 *  iconPos?: IconPosition,
 *  color?: ButtonColor,
 *  corners?: Corners,
 *  span?: Boolean,
 *  className?: any,
 *  title?: string,
 *  style?: React.CSSProperties,
 * }} SharedProps
 */
/**
 * Button variant
 * @typedef {SharedProps & React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
 *  role?: 'button',
 * }} ButtonAsButtonProps
 */
/**
 * Link variant
 * @typedef {SharedProps & {
 *  role: 'link',
 *  to: string,
 *  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
 * }} ButtonAsLinkProps
 */
/**
 * @typedef {ButtonAsButtonProps | ButtonAsLinkProps} ButtonProps
 */
/**
 * @param {ButtonProps} props
 */
const Button = (props) => {
  const {
    role,
    className,
    style,
    title,
    btnType = 'primary',
    text = '',
    size = 'md',
    icon = null,
    iconPos = 'left',
    color = 'blue',
    corners = 'curved',
    span = false,
  } = props

  const commonProps = {
    className: cn(
      s[`btn-${btnType.toLowerCase()}`],
      s[`sz-${size.toLowerCase()}`],
      s[`color-${color.toLowerCase()}`],
      s[`corner-${corners.toLowerCase()}`],
      {
        ...className,
        [s.iconOnly]: !text && icon,
        ['flex-row']: icon && iconPos.toLowerCase() === 'left',
        ['flex-row-reverse']: icon && iconPos.toLowerCase() === 'right',
      },
    ),
    style: {
      ...style,
      width: span ? '100%' : 'fit-content',
    },
    title,
    'aria-label': title || text,
  }

  if(role === 'link'){
    const {
      to,
      onClick,
      btnType: _btnType,
      text: _text,
      size: _size,
      icon: _icon,
      iconPos: _iconPos,
      color: _color,
      corners: _corners,
      span: _span,
      className: _className,
      style: _style,
      title: _title,
      ...restLink
    } = props

    return (
      <Link
        to={to}
        onClick={onClick}
        {...restLink}
        {...commonProps}
      >
        {icon}
        {text}
      </Link>
    )
  }

  const {
    type = 'button',
    disabled = false,
    onClick,
    btnType: _btnType,
    text: _text,
    size: _size,
    icon: _icon,
    iconPos: _iconPos,
    color: _color,
    corners: _corners,
    span: _span,
    className: _className,
    style: _style,
    title: _title,
    ...restButton
  } = props

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      aria-disabled={disabled}
      {...restButton}
      {...commonProps}
    >
      {icon}
      {text}
    </button>
  )
}

export default Button