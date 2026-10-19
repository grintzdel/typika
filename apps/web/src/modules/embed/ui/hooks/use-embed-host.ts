import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { TestRunState } from '../../../runtime/core/domain/test-run.domain-model.ts'
import { EmbedTheme } from '../../core/domain/constants/embed-option.constant.ts'
import { hostMessageOf, type EmbedMessage, type EmbedOptions } from '../../core/domain/embed.domain-model.ts'

const post = (message: EmbedMessage) => {
  if (window.parent !== window) window.parent.postMessage(message, '*')
}

export const useEmbedHost = ({
  options,
  isLoaded,
  testRun,
}: {
  readonly options: EmbedOptions
  readonly isLoaded: boolean
  readonly testRun: TestRunState | undefined
}) => {
  const { i18n } = useTranslation()
  const [theme, setTheme] = useState(options.theme)
  const [tourStep, setTourStep] = useState(options.tourStep)
  const reported = useRef<TestRunState | undefined>(undefined)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (options.lang !== undefined) void i18n.changeLanguage(options.lang)
  }, [i18n, options.lang])

  useEffect(() => {
    const root = document.documentElement
    if (theme === EmbedTheme.AUTO) delete root.dataset.theme
    else root.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== window.parent || window.parent === window) return
      const message = hostMessageOf(event.data)
      if (message?.type === 'typika:goto-step') setTourStep(message.id)
      if (message?.type === 'typika:set-theme') setTheme(message.theme)
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  useEffect(() => {
    if (!isLoaded) return undefined
    post({ type: 'typika:ready' })
    const root = rootRef.current
    if (root === null) return undefined
    const observer = new ResizeObserver(() => post({ type: 'typika:resize', height: root.scrollHeight }))
    observer.observe(root)
    return () => observer.disconnect()
  }, [isLoaded])

  useEffect(() => {
    if (testRun?.outcome._tag !== 'Finished' || reported.current === testRun) return
    reported.current = testRun
    post({ type: 'typika:test-result', passed: testRun.counts.passed, failed: testRun.counts.failed })
  }, [testRun])

  return { rootRef, tourStep }
}
