import { useEffect } from 'react'
import { X } from 'lucide-react'
import Button from './Button'

/**
 * Modal Component - Reusable modal dialog with animations
 * Supports custom content, actions, and sizes
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  actions,
  size = 'md',
  closeButton = true,
}) {
  // Close on escape key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={`relative w-full ${sizeClasses[size]} rounded-lg bg-white dark:bg-dark-surface shadow-glass border border-white/20 dark:border-dark-border/20 max-h-[90vh] overflow-y-auto animate-scale-in`}
      >
        {/* Header */}
        {(title || closeButton) && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-border">
            {title && (
              <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                {title}
              </h2>
            )}
            {closeButton && (
              <button
                onClick={onClose}
                className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover text-gray-500 dark:text-dark-muted transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-6">{children}</div>

        {/* Footer with Actions */}
        {actions && (
          <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-dark-border">
            {actions.map((action, idx) => (
              <Button
                key={idx}
                variant={action.variant || 'secondary'}
                size="md"
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
