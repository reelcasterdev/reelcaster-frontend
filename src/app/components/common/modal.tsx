/**
 * Modal - Reusable modal/dialog component
 *
 * Usage:
 * <Modal isOpen={isOpen} onClose={handleClose} title="Modal Title">
 *   <p>Modal content goes here</p>
 * </Modal>
 *
 * With custom width:
 * <Modal isOpen={isOpen} onClose={handleClose} title="Wide Modal" size="lg">
 *   <p>Content</p>
 * </Modal>
 */

'use client'

import { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal should close */
  onClose: () => void
  /** Optional modal title */
  title?: string
  /** Modal content */
  children: React.ReactNode
  /** Size of the modal */
  size?: ModalSize
  /** Whether to show close button */
  showCloseButton?: boolean
  /** Whether clicking backdrop closes the modal */
  closeOnBackdrop?: boolean
  /** Additional CSS classes for the modal container */
  className?: string
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdrop = true,
  className,
}: ModalProps) {
  // Handle escape key press
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleEscape])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full mx-4 bg-rc-bg-dark border border-rc-bg-light rounded-xl shadow-2xl',
          sizeClasses[size],
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 border-b border-rc-bg-light">
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold text-rc-text">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-rc-bg-light transition-colors text-rc-text-muted hover:text-rc-text"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

/**
 * ModalActions - Footer container for modal action buttons
 */
interface ModalActionsProps {
  children: React.ReactNode
  className?: string
}

export function ModalActions({ children, className }: ModalActionsProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 pt-4 border-t border-rc-bg-light mt-4',
        className
      )}
    >
      {children}
    </div>
  )
}

export default Modal
