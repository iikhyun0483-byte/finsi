import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variants = {
    default: "bg-gray-800 text-gray-300 border-gray-700",
    success: "bg-green-500/10 text-green-500 border-green-500/30",
    warning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
    danger: "bg-red-500/10 text-red-500 border-red-500/30",
    info: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
