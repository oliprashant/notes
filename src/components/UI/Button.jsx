import { forwardRef } from 'react'

/**
 * Button Component - Reusable button with multiple variants
 * Variants: primary, secondary, ghost, danger
 * Sizes: sm, md, lg
 */
const Button = forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      disabled = false,
      loading = false,
      className = '',
      icon: Icon,
      iconPosition = 'left',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-dark-bg disabled:opacity-60 disabled:cursor-not-allowed'

    const variants = {
      primary:
        'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg active:scale-95',
      secondary:
        'bg-gray-200 dark:bg-dark-surface hover:bg-gray-300 dark:hover:bg-dark-hover text-gray-900 dark:text-dark-text',
      ghost:
        'hover:bg-gray-100 dark:hover:bg-dark-hover text-gray-900 dark:text-dark-text',
      danger:
        'bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg active:scale-95',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-base gap-2',
      lg: 'px-6 py-3 text-lg gap-2.5',
    }

    const buttonClass = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={buttonClass}
        {...props}
      >
        {Icon && iconPosition === 'left' && <Icon size={18} />}
        {!loading ? children : 'Loading...'}
        {Icon && iconPosition === 'right' && <Icon size={18} />}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
