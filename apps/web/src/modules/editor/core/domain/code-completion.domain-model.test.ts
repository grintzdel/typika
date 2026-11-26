import { describe, expect, it } from 'vitest'

import {
  importPrefixOf,
  KEYWORDS,
  projectImportsOf,
  projectWordsOf,
  STANDARD_IMPORTS,
} from './code-completion.domain-model.ts'

const GO_FILES = new Map([
  ['go.mod', 'module example.com/shop\n\ngo 1.24\n'],
  ['main.go', 'package main\n\nfunc main() {\n\ttotal := quoteShipping(order)\n}\n'],
  ['checkout/checkout.go', 'package checkout\n\nfunc quoteShipping(order Order) Money { return order.total }\n'],
  ['checkout/checkout_test.go', 'package checkout\n'],
  ['README.md', 'Unrelated prose words\n'],
])

const KOTLIN_FILES = new Map([
  ['src/main/kotlin/Main.kt', 'import checkout.quoteShipping\n\nfun main() {\n    val total = quoteShipping()\n}\n'],
  ['src/main/kotlin/checkout/Checkout.kt', 'package checkout\n\nfun quoteShipping(): Money = Money(0)\n'],
  ['src/main/kotlin/shop/Money.kt', 'package shop.money\n\ndata class Money(val cents: Int)\n'],
])

describe('KEYWORDS', () => {
  it('knows the keywords of Go and Kotlin', () => {
    expect(KEYWORDS.go).toEqual(expect.arrayContaining(['func', 'package', 'defer', 'interface']))
    expect(KEYWORDS.kotlin).toEqual(expect.arrayContaining(['fun', 'val', 'when', 'data']))
  })
})

describe('projectWordsOf', () => {
  it('collects the names of the files of the same language, without the keywords', () => {
    const words = projectWordsOf(GO_FILES, 'go')

    expect(words).toEqual(expect.arrayContaining(['quoteShipping', 'order', 'total', 'Money', 'Order']))
    expect(words).not.toContain('func')
    expect(words).not.toContain('prose')
  })

  it('skips the names too short to be worth completing', () => {
    expect(projectWordsOf(new Map([['a.go', 'package a\n\nvar x, ok = 1, 2\n']]), 'go')).not.toContain('ok')
  })
})

describe('projectImportsOf', () => {
  it('lists the Go packages of the module under its path', () => {
    expect(projectImportsOf(GO_FILES, 'go')).toEqual(['example.com/shop/checkout'])
  })

  it('lists the Kotlin packages and their declarations', () => {
    expect(projectImportsOf(KOTLIN_FILES, 'kotlin')).toEqual([
      'checkout',
      'checkout.quoteShipping',
      'shop.money',
      'shop.money.Money',
    ])
  })
})

describe('STANDARD_IMPORTS', () => {
  it('offers the common packages of each standard library', () => {
    expect(STANDARD_IMPORTS.go).toEqual(expect.arrayContaining(['fmt', 'strings', 'errors', 'testing']))
    expect(STANDARD_IMPORTS.kotlin).toEqual(expect.arrayContaining(['kotlin.math.abs', 'java.time.LocalDate']))
  })
})

describe('importPrefixOf', () => {
  it('finds the path typed in a Go import, alone or in a block', () => {
    expect(importPrefixOf('go', 'package main\n\nimport "str')).toBe('str')
    expect(importPrefixOf('go', 'package main\n\nimport (\n\t"fmt"\n\t"example.com/sh')).toBe('example.com/sh')
  })

  it('finds no Go import once the block is closed', () => {
    expect(importPrefixOf('go', 'package main\n\nimport (\n\t"fmt"\n)\n\nvar s = "str')).toBeUndefined()
  })

  it('finds the name typed in a Kotlin import', () => {
    expect(importPrefixOf('kotlin', 'package app\n\nimport kotlin.ma')).toBe('kotlin.ma')
    expect(importPrefixOf('kotlin', 'fun main() {\n    val x = kotlin.ma')).toBeUndefined()
  })
})
