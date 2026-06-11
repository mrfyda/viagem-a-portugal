import { View, Text, type ViewProps } from "react-native";

import { cn } from "../../lib/cn";

export function Badge({
  className,
  textClassName,
  label,
  ...props
}: ViewProps & { className?: string; textClassName?: string; label: string }) {
  return (
    <View
      className={cn(
        "flex-row items-center rounded-full border border-border bg-secondary px-2.5 py-0.5",
        className,
      )}
      {...props}
    >
      <Text className={cn("text-xs font-medium text-secondary-foreground", textClassName)}>
        {label}
      </Text>
    </View>
  );
}
