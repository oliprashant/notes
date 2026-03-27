/**
 * Icon Component - Wrapper for react-icons
 * Provides consistent icon styling and sizing
 */
export default function Icon({ icon: IconComponent, size = 20, className = '' }) {
  if (!IconComponent) return null

  return (
    <span className={`inline-flex items-center justify-center ${className}`}>
      <IconComponent size={size} />
    </span>
  )
}
