import type { TemplateFiles } from '../domain/template-files.domain-model.ts'

const lines = (count: number) => Array.from({ length: count }, (_, index) => `// line ${index + 1}`).join('\n')

export const templateFilesFixture = (
  overrides: Record<string, string | Uint8Array | undefined> = {}
): TemplateFiles => {
  const files: Record<string, string | Uint8Array | undefined> = {
    'typika.toml': '',
    'README.md': '# Strategy\n',
    LICENSE: 'MIT No Attribution\n',
    'src/main.ts': 'console.log("shop")\n',
    'src/checkout/shipping-quote.ts': `${lines(10)}\n// #region tour:context\nexport class ShippingQuote {}\n// #endregion\n${lines(10)}\n`,
    'tests/quote.test.ts': '',
    'tour/01-overview.md': '+++\nid = "overview"\ntitle = "Overview"\n+++\n\nWhy Strategy.\n',
    'tour/02-context.md':
      '+++\nid = "context"\ntitle = "The context delegates"\nfile = "src/checkout/shipping-quote.ts"\nregion = "context"\nalso = ["tests/quote.test.ts"]\n+++\n\nDelegation.\n',
    'exercises/add-pickup-point-option/README.md': '# Pickup point\n',
    'exercises/add-pickup-point-option/start/tests/pickup-point.test.ts': '',
    'exercises/add-pickup-point-option/solution/src/checkout/pickup-point.ts': '',
    'exercises/implement-express/README.md': '# Express\n',
    'exercises/implement-express/hint-1.md': 'Look at standard shipping.\n',
    'exercises/implement-express/solution/src/checkout/express.ts': '',
    'tests/express-shipping.test.ts': '',
    ...overrides,
  }
  return new Map(
    Object.entries(files).filter((entry): entry is [string, string | Uint8Array] => entry[1] !== undefined)
  )
}

export const numberedLines = lines
