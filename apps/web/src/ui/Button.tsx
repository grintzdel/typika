import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

const button = cva(
  'inline-flex items-center gap-1.5 rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-sky-700 text-white hover:bg-sky-800 disabled:hover:bg-sky-700',
        secondary:
          'border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800',
      },
      size: {
        sm: 'h-7 px-2.5 text-sm',
        md: 'h-9 px-3.5 text-sm',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'sm' },
  }
)

export type ButtonProps = ComponentProps<'button'> & VariantProps<typeof button>

export const Button = ({ variant, size, className, type = 'button', ...props }: ButtonProps) => (
  <button type={type} className={button({ variant, size, className })} {...props} />
)
