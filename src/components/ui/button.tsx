import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "glass-btn bg-white/70 dark:bg-white/10 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-white/15 backdrop-blur-md shadow-xs hover:bg-black hover:text-white hover:border-black active:bg-black active:text-white dark:hover:bg-white dark:hover:text-black dark:hover:border-white",
        glass:
          "glass-btn bg-white/75 dark:bg-white/10 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-white/15 backdrop-blur-md shadow-xs hover:bg-black hover:text-white hover:border-black active:bg-black active:text-white dark:hover:bg-white dark:hover:text-black dark:hover:border-white",
        outline:
          "glass-btn border border-slate-200/90 dark:border-white/15 bg-white/60 dark:bg-card/40 backdrop-blur-md text-foreground shadow-xs hover:bg-black hover:text-white hover:border-black active:bg-black active:text-white dark:hover:bg-white dark:hover:text-black dark:hover:border-white",
        secondary:
          "glass-btn bg-secondary/70 dark:bg-secondary/40 text-secondary-foreground border border-border/80 backdrop-blur-md shadow-xs hover:bg-black hover:text-white hover:border-black active:bg-black active:text-white dark:hover:bg-white dark:hover:text-black dark:hover:border-white",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 active:scale-[0.97]",
        ghost:
          "text-muted-foreground hover:bg-black hover:text-white active:bg-black active:text-white dark:hover:bg-white dark:hover:text-black active:scale-[0.97]",
        link: "text-primary underline-offset-4 hover:underline",
        primary:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-[0.97]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 rounded-xl px-7 text-sm",
        icon: "h-9 w-9 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
