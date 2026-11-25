export const isMacPlatform = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export const holdsNavigationModifier = (event: MouseEvent | KeyboardEvent) =>
  isMacPlatform() ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey
