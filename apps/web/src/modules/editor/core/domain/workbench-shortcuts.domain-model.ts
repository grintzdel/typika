export const WorkbenchCommand = {
  CLOSE_TAB: 'close-tab',
  NEXT_TAB: 'next-tab',
  PREVIOUS_TAB: 'previous-tab',
  QUICK_OPEN: 'quick-open',
} as const

export type WorkbenchCommand = (typeof WorkbenchCommand)[keyof typeof WorkbenchCommand]

export type KeyPress = {
  readonly key: string
  readonly keyCode: number
  readonly altKey: boolean
  readonly ctrlKey: boolean
  readonly metaKey: boolean
  readonly shiftKey: boolean
}

type Modifiers = Readonly<Pick<KeyPress, 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>>

const LETTER = /^[a-z]$/i
const KEY_CODE_A = 65
const KEY_CODE_Z = 90

const letterOf = ({ key, keyCode }: KeyPress) => {
  if (LETTER.test(key)) return key.toLowerCase()
  return keyCode >= KEY_CODE_A && keyCode <= KEY_CODE_Z ? String.fromCharCode(keyCode).toLowerCase() : undefined
}

const holds = (press: KeyPress, modifiers: Partial<Modifiers>) =>
  press.altKey === (modifiers.altKey ?? false) &&
  press.ctrlKey === (modifiers.ctrlKey ?? false) &&
  press.metaKey === (modifiers.metaKey ?? false) &&
  press.shiftKey === (modifiers.shiftKey ?? false)

export const commandOf = (press: KeyPress, isMac: boolean): WorkbenchCommand | undefined => {
  const tabModifiers: Partial<Modifiers> = isMac ? { altKey: true, ctrlKey: true } : { altKey: true }
  if (holds(press, tabModifiers) && press.key === 'ArrowRight') return WorkbenchCommand.NEXT_TAB
  if (holds(press, tabModifiers) && press.key === 'ArrowLeft') return WorkbenchCommand.PREVIOUS_TAB
  const letter = letterOf(press)
  if (holds(press, { altKey: true }) && letter === 'w') return WorkbenchCommand.CLOSE_TAB
  if (holds(press, isMac ? { metaKey: true } : { ctrlKey: true }) && letter === 'p') return WorkbenchCommand.QUICK_OPEN
  return undefined
}
