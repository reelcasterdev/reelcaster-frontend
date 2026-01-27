'use client'

import { useState, useEffect, useRef } from 'react'

const SITE_PIN = '7934'
const STORAGE_KEY = 'rc-pin-unlocked'

export default function PinGate() {
  const [unlocked, setUnlocked] = useState<boolean | null>(null)
  const [pin, setPin] = useState(['', '', '', ''])
  const [error, setError] = useState(false)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    setUnlocked(sessionStorage.getItem(STORAGE_KEY) === 'true')
  }, [])

  // null = loading, true = unlocked
  if (unlocked === null || unlocked) return null

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const digit = value.slice(-1)
    const next = [...pin]
    next[index] = digit
    setPin(next)
    setError(false)

    if (digit && index < 3) {
      inputsRef.current[index + 1]?.focus()
    }

    if (index === 3 && digit) {
      const entered = next.join('')
      if (entered === SITE_PIN) {
        sessionStorage.setItem(STORAGE_KEY, 'true')
        setUnlocked(true)
      } else {
        setError(true)
        setPin(['', '', '', ''])
        setTimeout(() => inputsRef.current[0]?.focus(), 150)
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (pasted.length === 4) {
      const digits = pasted.split('')
      setPin(digits)
      if (pasted === SITE_PIN) {
        sessionStorage.setItem(STORAGE_KEY, 'true')
        setUnlocked(true)
      } else {
        setError(true)
        setPin(['', '', '', ''])
        setTimeout(() => inputsRef.current[0]?.focus(), 150)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-rc-bg-darkest">
      <div className="flex flex-col items-center gap-6 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-rc-text mb-2">Access Required</h1>
          <p className="text-sm text-rc-text-muted">Enter the 4-digit PIN to continue</p>
        </div>

        <div className="flex gap-3" onPaste={handlePaste}>
          {pin.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputsRef.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              autoFocus={i === 0}
              className={`w-14 h-16 text-center text-2xl font-bold rounded-xl bg-rc-bg-dark border-2 text-rc-text outline-none transition-colors
                ${error ? 'border-red-500 animate-shake' : 'border-rc-bg-light focus:border-blue-500'}`}
            />
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-400">Incorrect PIN. Try again.</p>
        )}
      </div>
    </div>
  )
}
