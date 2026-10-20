"use client";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";
import {
  controlRadiusStyle,
  type ControlAppearanceProps,
} from "@/shared/lib/cojeev/control-appearance";
import { useMorph } from "@/shared/lib/cojeev-motion/use-morph";
export const nativeSelectVariants = cva(
  "v-native appearance-none h-[var(--ctl-lg)] pl-[var(--s-5)] pr-[var(--s-10)] py-0 rounded-[var(--r-pill)] [border:0] bg-[var(--v-beige)] text-[length:var(--fs-control)] font-medium text-[color:var(--v-text)] cursor-pointer [box-shadow:inset_0_0_0_1px_var(--v-edge)] focus-visible:outline-2 focus-visible:outline-[var(--ring)] focus-visible:outline-offset-2",
  {
    variants: {
      variant: {
        default: "",
        ink: "-ink bg-[var(--v-ink)] text-[color:var(--v-on-ink)] [box-shadow:none]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);
export type NativeSelectProps = React.ComponentProps<"select"> &
  VariantProps<typeof nativeSelectVariants> &
  ControlAppearanceProps;
export function NativeSelect({
  ref,
  className,
  variant,
  radius,
  appearance,
  style,
  ...props
}: NativeSelectProps) {
  const morphRef = useMorph<HTMLSelectElement>("buttons", ref);
  return (
    <select
      data-slot="native-select"
      data-stable-hit
      data-appearance={appearance}
      data-motion={appearance === "editorial" ? "off" : undefined}
      style={{ ...style, ...controlRadiusStyle(radius) }}
      data-part="root"
      ref={morphRef}
      className={cn(nativeSelectVariants({ variant }), className)}
      {...props}
    />
  );
}
export type NativeSelectOptionProps = React.ComponentProps<"option">;
export function NativeSelectOption(props: NativeSelectOptionProps) {
  return <option data-slot="native-select-option" {...props} />;
}
export type NativeSelectOptGroupProps = React.ComponentProps<"optgroup">;
export function NativeSelectOptGroup(props: NativeSelectOptGroupProps) {
  return <optgroup data-slot="native-select-optgroup" {...props} />;
}
