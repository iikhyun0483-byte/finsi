import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "profit" | "loss";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const baseStyles = "jarvis-button rounded font-orbitron font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "border-[rgba(0,255,180,0.4)] text-[#00FFD1] hover:shadow-[0_0_20px_rgba(0,255,180,0.4)] hover:text-[#00FF41]",
    secondary: "border-[rgba(255,255,255,0.2)] text-[rgba(255,255,255,0.7)] hover:text-white",
    danger: "border-[rgba(255,68,102,0.4)] text-[#FF4466] hover:shadow-[0_0_20px_rgba(255,68,102,0.3)]",
    ghost: "border-transparent text-[rgba(255,255,255,0.4)] hover:text-[#00FFD1] hover:border-[rgba(0,255,180,0.2)]",
    profit: "border-[rgba(0,255,136,0.4)] text-[#00FF88] hover:shadow-[0_0_20px_rgba(0,255,136,0.3)]",
    loss: "border-[rgba(255,68,102,0.4)] text-[#FF4466] hover:shadow-[0_0_20px_rgba(255,68,102,0.3)]",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs tracking-wider",
    md: "px-5 py-2.5 text-sm tracking-wide",
    lg: "px-7 py-3.5 text-base tracking-wide",
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
