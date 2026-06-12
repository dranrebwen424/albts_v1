import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";

const Avatar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { src?: string; fallback: string }
>(({ className, src, fallback, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-surface-gray items-center justify-center text-sm font-medium text-text-secondary",
      className
    )}
    {...props}
  >
    {src ? (
      <Image src={src} alt={fallback} fill className="object-cover" sizes="40px" />
    ) : (
      <span className="text-text-secondary">
        {fallback.charAt(0).toUpperCase()}
      </span>
    )}
  </div>
));
Avatar.displayName = "Avatar";

export { Avatar };
