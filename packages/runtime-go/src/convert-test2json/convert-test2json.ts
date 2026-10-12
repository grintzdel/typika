export type Test2JsonAction = 'start' | 'run' | 'pause' | 'cont' | 'pass' | 'fail' | 'skip' | 'bench' | 'output'

export type Test2JsonEvent = {
  readonly Action: Test2JsonAction | (string & {})
  readonly Test?: string
  readonly Elapsed?: number
  readonly Output?: string
}

const MARKER = '\u0016'
const UPDATES = ['=== RUN   ', '=== PAUSE ', '=== CONT  ', '=== NAME  ', '=== PASS  ', '=== FAIL  ', '=== SKIP  ']
const REPORTS = ['--- PASS: ', '--- FAIL: ', '--- SKIP: ', '--- BENCH: ']
const FOUR_SPACES = '    '

type Report = { action: string; test: string; elapsed: number | undefined }

// A port of cmd/internal/test2json for the output of a test binary run with -test.v=test2json.
export const makeTest2JsonConverter = (emit: (event: Test2JsonEvent) => void) => {
  let testName = ''
  let report: Array<Report> = []
  let result = ''
  let needMarker = false
  let pending = ''

  const withTest = (event: Test2JsonEvent): Test2JsonEvent =>
    event.Test === undefined && testName !== '' ? { ...event, Test: testName } : event

  const output = (text: string) => {
    if (text !== '') emit(withTest({ Action: 'output', Output: text }))
  }

  const flushReport = (depth: number) => {
    testName = ''
    while (report.length > depth) {
      const entry = report.pop()
      if (entry === undefined) break
      emit({
        Action: entry.action,
        Test: entry.test,
        ...(entry.elapsed === undefined ? {} : { Elapsed: entry.elapsed }),
      })
    }
  }

  const handleLine = (input: string) => {
    let line = input
    if (line === '') return
    let sawMarker = false
    if (needMarker && !line.startsWith(MARKER)) {
      output(line)
      return
    }
    if (line.startsWith(MARKER)) {
      sawMarker = true
      line = line.slice(1)
    }
    let trimmed = line.replace(/\r?\n$/, '')
    if (trimmed === '=== NAME') {
      line = '=== NAME  \n'
      trimmed = '=== NAME  '
    }
    if (trimmed === 'PASS' || trimmed === 'FAIL' || trimmed.startsWith('FAIL\t')) {
      flushReport(0)
      testName = ''
      needMarker = sawMarker
      output(line)
      result = trimmed === 'PASS' ? 'pass' : 'fail'
      return
    }

    const original = line
    let indent = 0
    let actionColon = false
    let known = UPDATES.some((magic) => line.startsWith(magic))
    if (!known) {
      while (line.startsWith(FOUR_SPACES)) {
        line = line.slice(4)
        indent += 1
      }
      actionColon = known = REPORTS.some((magic) => line.startsWith(magic))
    }
    if (!known) {
      const owner = indent > 0 ? report[indent - 1] : undefined
      if (owner !== undefined) testName = owner.test
      output(original)
      return
    }

    const nameStart = actionColon ? line.indexOf(':') + 1 : (UPDATES[0]?.length ?? 0)
    const action = line.slice(4, nameStart).trim().replace(/:$/, '').toLowerCase()
    let name = line.slice(nameStart).trim()

    if (line.startsWith('-')) {
      let elapsed: number | undefined
      const durationAt = name.indexOf(' (')
      if (durationAt >= 0) {
        if (name.endsWith('s)')) {
          const seconds = Number.parseFloat(name.slice(durationAt + 2, -2))
          if (!Number.isNaN(seconds)) elapsed = seconds
        }
        name = name.slice(0, durationAt)
      }
      if (report.length < indent) {
        output(original)
        return
      }
      needMarker = sawMarker
      flushReport(indent)
      testName = name
      report.push({ action, test: name, elapsed })
      output(original)
      return
    }

    needMarker = sawMarker
    flushReport(0)
    testName = name
    if (action === 'name') return
    if (action === 'pause') output(original)
    emit({ Action: action, Test: name })
    if (action !== 'pause') output(original)
  }

  const splitLines = (flushAll: boolean) => {
    let index = 0
    for (let at = 0; at < pending.length; at += 1) {
      const char = pending[at]
      if (char === '\n') {
        handleLine(pending.slice(index, at + 1))
        index = at + 1
      } else if (char === MARKER && at > index) {
        handleLine(pending.slice(index, at))
        index = at
      }
    }
    pending = pending.slice(index)
    if (flushAll && pending !== '') {
      output(pending)
      pending = ''
    }
  }

  emit({ Action: 'start' })

  return {
    write: (chunk: string) => {
      pending += chunk
      splitLines(false)
    },
    exited: (exitCode: number) => {
      if (exitCode === 0) {
        if (result !== 'skip') result = 'pass'
      } else {
        result = 'fail'
      }
    },
    close: () => {
      splitLines(true)
      if (result !== '') emit({ Action: result })
    },
  }
}
