import { useEffect, useRef } from 'react'

const TAKES_TEXT = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

const takesText = (target: EventTarget | null) => target instanceof Element && target.closest(TAKES_TEXT) !== null

export const useSearchShortcut = () => {
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || takesText(event.target)) return
      event.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return searchRef
}
