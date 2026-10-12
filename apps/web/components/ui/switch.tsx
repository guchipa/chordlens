"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  /** touch: 44px 高のタップ領域 (見た目のトラックは 48x28) */
  size?: "sm" | "default" | "touch"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 group/switch inline-flex shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-[1.15rem] data-[size=default]:w-8 data-[size=sm]:h-3.5 data-[size=sm]:w-6 data-[size=touch]:relative data-[size=touch]:h-11 data-[size=touch]:w-14 data-[size=touch]:rounded-none data-[size=touch]:bg-transparent data-[size=touch]:shadow-none data-[size=touch]:before:absolute data-[size=touch]:before:top-1/2 data-[size=touch]:before:left-1/2 data-[size=touch]:before:h-7 data-[size=touch]:before:w-12 data-[size=touch]:before:-translate-x-1/2 data-[size=touch]:before:-translate-y-1/2 data-[size=touch]:before:rounded-full data-[size=touch]:before:bg-input data-[size=touch]:before:content-[''] data-[size=touch]:data-[state=checked]:bg-transparent data-[size=touch]:data-[state=unchecked]:bg-transparent data-[size=touch]:data-[state=checked]:before:bg-primary",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block rounded-full ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 group-data-[size=touch]/switch:relative group-data-[size=touch]/switch:ml-1 group-data-[size=touch]/switch:size-6 data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0 group-data-[size=touch]/switch:data-[state=checked]:translate-x-5"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
