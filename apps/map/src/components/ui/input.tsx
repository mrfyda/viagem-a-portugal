import { TextInput, type TextInputProps } from "react-native";

import { cn } from "../../lib/cn";

export function Input({
  className,
  ...props
}: TextInputProps & { className?: string }) {
  return (
    <TextInput
      className={cn(
        "h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring placeholder:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
