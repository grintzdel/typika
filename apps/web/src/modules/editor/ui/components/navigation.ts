import { StateEffect, StateField, type EditorState, type Extension } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  keymap,
  showTooltip,
  ViewPlugin,
  type DecorationSet,
  type Tooltip,
} from '@codemirror/view'
import * as Effect from 'effect/Effect'

import type { FileRename, ReferenceSearch, SourceRange } from '../../core/domain/language-service.domain-model.ts'
import type { LanguageServiceSession } from '../../core/ports/language-service.port.ts'
import { holdsNavigationModifier } from './platform.ts'

export type NavigationHandlers = {
  readonly onGoTo: (range: SourceRange) => void
  readonly onReferences: (search: ReferenceSearch) => void
  readonly onRename: (renames: ReadonlyArray<FileRename>) => void
}

type WordRange = { readonly from: number; readonly to: number }

const run = <A>(effect: Effect.Effect<A, unknown>): Promise<A | undefined> =>
  Effect.runPromise(Effect.orElseSucceed(effect, () => undefined))

const LINK = Decoration.mark({ class: 'cm-typika-link' })

const setLink = StateEffect.define<WordRange | null>()

const linkField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update: (decorations, transaction) => {
    for (const effect of transaction.effects)
      if (effect.is(setLink))
        return effect.value === null
          ? Decoration.none
          : Decoration.set([LINK.range(effect.value.from, effect.value.to)])
    return decorations.map(transaction.changes)
  },
  provide: (field) => EditorView.decorations.from(field),
})

const wordAt = (state: EditorState, position: number | null): WordRange | null =>
  position === null ? null : state.wordAt(position)

class LinkHover {
  private pointer: { readonly x: number; readonly y: number } | undefined = undefined
  private shown: WordRange | null = null
  private readonly view: EditorView

  constructor(view: EditorView) {
    this.view = view
  }

  track(event: MouseEvent | undefined) {
    this.pointer = event === undefined ? undefined : { x: event.clientX, y: event.clientY }
  }

  show(isHeld: boolean) {
    const word =
      isHeld && this.pointer !== undefined ? wordAt(this.view.state, this.view.posAtCoords(this.pointer)) : null
    if (word?.from === this.shown?.from && word?.to === this.shown?.to) return
    this.shown = word
    this.view.dispatch({ effects: setLink.of(word) })
  }
}

const linkHover = ViewPlugin.fromClass(LinkHover, {
  eventHandlers: {
    mousemove(event) {
      this.track(event)
      this.show(holdsNavigationModifier(event))
    },
    mouseleave() {
      this.track(undefined)
      this.show(false)
    },
    keydown(event) {
      this.show(holdsNavigationModifier(event))
    },
    keyup(event) {
      this.show(holdsNavigationModifier(event))
    },
  },
})

const setPopup = StateEffect.define<Tooltip | null>()

const popupField = StateField.define<Tooltip | null>({
  create: () => null,
  update: (tooltip, transaction) => {
    for (const effect of transaction.effects) if (effect.is(setPopup)) return effect.value
    return transaction.docChanged || transaction.selection !== undefined ? null : tooltip
  },
  provide: (field) => showTooltip.from(field),
})

const closePopup = (view: EditorView) => {
  if (view.state.field(popupField, false) !== null) view.dispatch({ effects: setPopup.of(null) })
}

const showMessage = (view: EditorView, position: number, message: string) => {
  const dom = document.createElement('div')
  dom.className = 'cm-typika-info'
  dom.setAttribute('role', 'status')
  dom.textContent = message
  view.dispatch({ effects: setPopup.of({ pos: position, above: true, create: () => ({ dom }) }) })
}

export const navigationExtensions = (
  session: LanguageServiceSession,
  path: string,
  handlers: NavigationHandlers
): Extension => {
  const showReferences = async (position: number) => {
    const search = await run(session.references(path, position))
    if (search !== undefined) handlers.onReferences(search)
  }

  const goToDefinition = async (position: number) => {
    const definitions = (await run(session.definition(path, position))) ?? []
    const isOnDefinition = definitions.some(
      (definition) => definition.path === path && definition.from <= position && position <= definition.to
    )
    if (isOnDefinition) return showReferences(position)
    const first = definitions[0]
    if (first !== undefined) handlers.onGoTo(first)
    return undefined
  }

  const rename = async (view: EditorView, position: number, newName: string) => {
    const doc = view.state.doc
    const renames = await run(session.rename(path, position, newName))
    if (view.state.doc !== doc) return
    if (renames === undefined) {
      showMessage(view, position, view.state.phrase('This symbol cannot be renamed.'))
      return
    }
    const own = renames.find((renamed) => renamed.path === path)
    if (own !== undefined) view.dispatch({ changes: [...own.changes], userEvent: 'input.rename' })
    handlers.onRename(renames.filter((renamed) => renamed.path !== path))
  }

  const renameInput = (view: EditorView, word: WordRange, position: number) => {
    const dom = document.createElement('div')
    dom.className = 'cm-typika-rename'
    const input = document.createElement('input')
    input.className = 'cm-typika-rename-input'
    input.value = view.state.sliceDoc(word.from, word.to)
    input.setAttribute('aria-label', view.state.phrase('New name'))
    input.spellcheck = false
    const hint = document.createElement('p')
    hint.className = 'cm-typika-documentation'
    hint.textContent = view.state.phrase('Enter to rename, Escape to cancel')
    dom.append(input, hint)
    const original = input.value
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        const newName = input.value.trim()
        closePopup(view)
        view.focus()
        if (newName !== '' && newName !== original) void rename(view, position, newName)
      } else if (event.key === 'Escape') {
        event.preventDefault()
        closePopup(view)
        view.focus()
      }
    })
    input.addEventListener('blur', () => queueMicrotask(() => closePopup(view)))
    return {
      dom,
      mount: () => {
        input.focus()
        input.select()
      },
    }
  }

  const startRename = (view: EditorView) => {
    const position = view.state.selection.main.head
    const word = view.state.wordAt(position)
    if (word === null) return false
    view.dispatch({
      effects: setPopup.of({ pos: word.from, above: true, create: () => renameInput(view, word, position) }),
    })
    return true
  }

  return [
    linkField,
    linkHover,
    popupField,
    EditorView.domEventHandlers({
      mousedown: (event, view) => {
        if (event.button !== 0 || !holdsNavigationModifier(event)) return false
        const position = view.posAtCoords({ x: event.clientX, y: event.clientY })
        if (position === null) return false
        event.preventDefault()
        void goToDefinition(position)
        return true
      },
    }),
    keymap.of([
      {
        key: 'F12',
        run: (view) => {
          void goToDefinition(view.state.selection.main.head)
          return true
        },
      },
      {
        key: 'Shift-F12',
        run: (view) => {
          void showReferences(view.state.selection.main.head)
          return true
        },
      },
      { key: 'F2', run: startRename },
    ]),
  ]
}
