import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-0.5 text-[11px] font-medium leading-[14px] tracking-[0.01em] transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-surface-gray text-text-secondary",
        secondary: "bg-surface-gray text-text-body",
        destructive: "bg-error text-white",
        success: "bg-primary-tint-bg text-primary-tint-text",
        warning: "bg-amber-50 text-amber-700",
        outline: "border border-divider text-text-body",
        pending: "bg-amber-50 text-amber-700",
        approved: "bg-primary-tint-bg text-primary-tint-text",
        rejected: "bg-red-50 text-error",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
