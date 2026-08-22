"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const RadioGroupContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
  name: string;
} | null>(null);

export function RadioGroup({
  value,
  onValueChange,
  className,
  ...props
}: {
  value: string;
  onValueChange: (value: string) => void;
} & React.ComponentProps<"div">) {
  const name = React.useId();
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange, name }}>
      <div role="radiogroup" className={cn("grid gap-2", className)} {...props} />
    </RadioGroupContext.Provider>
  );
}

export function RadioGroupItem({
  value,
  className,
  disabled,
  ...props
}: { value: string } & Omit<React.ComponentProps<"input">, "value" | "onChange" | "type">) {
  const ctx = React.useContext(RadioGroupContext);
  return (
    <input
      type="radio"
      name={ctx?.name}
      value={value}
      checked={ctx?.value === value}
      onChange={() => ctx?.onValueChange(value)}
      disabled={disabled}
      data-state={ctx?.value === value ? "checked" : "unchecked"}
      className={cn(
        "size-4 shrink-0 cursor-pointer appearance-none rounded-full border border-primary shadow-none transition-colors checked:border-[5px] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
