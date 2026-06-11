import { Text as RNText, type TextProps } from "react-native";

import { cn } from "../../lib/cn";

export function Text({ className, ...props }: TextProps & { className?: string }) {
  return (
    <RNText
      className={cn("text-sm text-foreground", className)}
      {...props}
    />
  );
}

export function MutedText({
  className,
  ...props
}: TextProps & { className?: string }) {
  return (
    <RNText
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}
