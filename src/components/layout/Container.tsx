import { cn } from "@/lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: "default" | "narrow" | "wide";
}

export function Container({
  width = "default",
  className,
  ...rest
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        width === "narrow" && "max-w-3xl",
        width === "default" && "max-w-7xl",
        width === "wide" && "max-w-[88rem]",
        className,
      )}
      {...rest}
    />
  );
}
