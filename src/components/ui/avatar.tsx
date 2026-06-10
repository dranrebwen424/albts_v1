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
      "relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800 items-center justify-center text-sm font-medium",
      className
    )}
    {...props}
  >
    {src ? (
      <Image src={src} alt={fallback} fill className="object-cover" sizes="36px" />
    ) : (
      <span className="text-neutral-600 dark:text-neutral-400">
        {fallback.charAt(0).toUpperCase()}
      </span>
    )}
  </div>
));
Avatar.displayName = "Avatar";

export { Avatar };
