import { describe, expect, it } from 'vitest'

import { parseGoSource } from './parse-go-source.ts'

describe('parseGoSource', () => {
  it('reads the package name and every form of import', () => {
    const source = parseGoSource(`// Package shop sells things.
package shop

import "fmt"
import (
	"strings" // inline comment
	str "strconv"
	. "math"
	_ "embed"
	/* block */ "example.com/shop/money"
)

func main() { fmt.Println("import \\"nope\\"") }
`)

    expect(source?.packageName).toBe('shop')
    expect(source?.imports.map((entry) => entry.path)).toEqual([
      'fmt',
      'strings',
      'strconv',
      'math',
      'embed',
      'example.com/shop/money',
    ])
    expect(source?.imports[0]?.position).toEqual({ line: 4, column: 8 })
  })

  it('returns undefined when the file has no package clause', () => {
    expect(parseGoSource('func main() {}')).toBeUndefined()
  })

  it('reads the build constraint above the package clause only', () => {
    expect(parseGoSource('//go:build js && wasm\n\npackage a\n')?.buildConstraint).toBe('js && wasm')
    expect(parseGoSource('package a\n//go:build ignore\n')?.buildConstraint).toBeUndefined()
  })

  it('finds the top-level test functions the way go test does', () => {
    const source = parseGoSource(`package a_test

import "testing"

func Test(t *testing.T) {}
func TestQuote(t *testing.T) { t.Run("x", func(t *testing.T) {}) }
func Test_snake(t *testing.T) {}
func Testlower(t *testing.T) {}
func TestHelper(n int) {}
func (s suite) TestMethod(t *testing.T) {}
func TestBraces(t *testing.T) { _ = '{'; _ = "}" + \`{\` }
func TestAfterBraces(t *testing.T) {}
`)

    expect(source?.tests).toEqual(['Test', 'TestQuote', 'Test_snake', 'TestBraces', 'TestAfterBraces'])
    expect(source?.hasTestMain).toBe(false)
  })

  it('recognises a TestMain', () => {
    expect(parseGoSource('package a\nimport "testing"\nfunc TestMain(m *testing.M) {}\n')).toMatchObject({
      tests: [],
      hasTestMain: true,
    })
  })
})
