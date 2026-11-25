import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

const button = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-md whitespace-nowrap border border-transparent text-base font-semibold transition-[background-color,border-color,box-shadow] duration-150 aria-pressed:border-accent aria-pressed:bg-selected-bg aria-pressed:text-selected-fg aria-pressed:shadow-none disabled:cursor-not-allowed disabled:border-transparent disabled:bg-disabled-bg disabled:text-disabled-fg disabled:shadow-none',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-on-accent enabled:hover:bg-accent-hover',
        secondary: 'border-border-strong bg-surface-raised text-fg shadow-sm enabled:hover:bg-surface-muted',
      },
      size: {
        sm: 'min-h-control-sm px-4',
        md: 'min-h-control-md px-5',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'sm' },
  }
)

export type ButtonProps = ComponentProps<'button'> & VariantProps<typeof button>

export const Button = ({ variant, size, className, type = 'button', ...props }: ButtonProps) => (
  <button type={type} className={button({ variant, size, className })} {...props} />
)
