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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/35 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={`relative w-full ${sizeClasses[size]} rounded-2xl bg-white/95 dark:bg-dark-surface/95 border border-parchment-200/80 dark:border-dark-border shadow-lg max-h-[90vh] overflow-y-auto animate-scale-in`}
      >
        {/* Header */}
        {(title || closeButton) && (
          <div className="flex items-center justify-between p-6 border-b border-parchment-200 dark:border-dark-border">
            {title && (
              <h2 className="text-lg font-semibold text-ink dark:text-dark-text">
                {title}
              </h2>
            )}
            {closeButton && (
              <button
                onClick={onClose}
                className="ml-auto p-1.5 rounded-xl hover:bg-parchment-100 dark:hover:bg-dark-elevated text-ink-muted dark:text-dark-secondary transition-colors"
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
          <div className="flex gap-3 p-6 border-t border-parchment-200 dark:border-dark-border">
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
