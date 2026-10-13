import { describe, expect, it } from 'vitest'

import { KotlinCompileMode } from '../domain/constants/kotlin-compile-mode.constant.ts'
import { findKotlinClasses, kotlinSources } from './kotlin-sources.ts'

const files = new Map<string, string | Uint8Array>([
  ['typika.toml', 'schema = 1'],
  ['src/main/kotlin/Main.kt', 'fun main() {}'],
  ['src/main/kotlin/shop/Money.kt', new TextEncoder().encode('package shop')],
  ['src/test/kotlin/shop/MoneyTest.kt', 'package shop'],
  ['README.md', '# Shop'],
])

describe('kotlinSources', () => {
  it('sends every Kotlin file to a test compilation, sorted by path', () => {
    expect(kotlinSources(files, KotlinCompileMode.TEST, ['src/test/**'])).toEqual([
      { path: 'src/main/kotlin/Main.kt', content: 'fun main() {}' },
      { path: 'src/main/kotlin/shop/Money.kt', content: 'package shop' },
      { path: 'src/test/kotlin/shop/MoneyTest.kt', content: 'package shop' },
    ])
  })

  it('leaves the test files out of a run compilation', () => {
    expect(kotlinSources(files, KotlinCompileMode.RUN, ['src/test/**']).map((file) => file.path)).toEqual([
      'src/main/kotlin/Main.kt',
      'src/main/kotlin/shop/Money.kt',
    ])
  })
})

describe('findKotlinClasses', () => {
  it('maps each top-level class and object to its file by qualified name', () => {
    const sources = [
      {
        path: 'src/test/kotlin/shop/MoneyTest.kt',
        content: [
          'package shop.money',
          '',
          'import kotlin.test.Test',
          '',
          'class MoneyTest {',
          '    class Nested',
          '}',
          '',
          '@Ignore',
          'internal class `Slow money test`',
          '@Ignore data class Amount(val cents: Long)',
          'object Fixtures',
        ].join('\n'),
      },
      { path: 'src/test/kotlin/RootTest.kt', content: 'import kotlin.test.Test\n\nclass RootTest {\n}\n' },
    ]

    expect(findKotlinClasses(sources)).toEqual(
      new Map([
        ['shop.money.MoneyTest', 'src/test/kotlin/shop/MoneyTest.kt'],
        ['shop.money.Slow money test', 'src/test/kotlin/shop/MoneyTest.kt'],
        ['shop.money.Amount', 'src/test/kotlin/shop/MoneyTest.kt'],
        ['shop.money.Fixtures', 'src/test/kotlin/shop/MoneyTest.kt'],
        ['RootTest', 'src/test/kotlin/RootTest.kt'],
      ])
    )
  })
})
