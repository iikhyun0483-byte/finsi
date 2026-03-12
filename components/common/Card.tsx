import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  withScanline?: boolean;
}

export function Card({ children, className, withScanline = false }: CardProps) {
  return (
    <div className={cn("jarvis-card p-5 group hover-glow-enhanced depth-3d card-fade-in", className)}>
      {/* NEXUS Scanline Effect */}
      {withScanline && (
        <div
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: 'linear-gradient(90deg, transparent, #00FF41, #00FFD1, transparent)',
            animation: 'nexus-scan 2s ease-in-out infinite',
            height: '2px',
            top: '50%',
          }}
        />
      )}
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn("mb-4 border-b border-[rgba(0,255,180,0.12)] pb-3", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: CardProps) {
  return (
    <h3 className={cn("font-orbitron text-lg font-bold text-[#00FFD1] tracking-wide", className)}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className }: CardProps) {
  return (
    <p className={cn("font-mono text-xs text-[rgba(255,255,255,0.4)] uppercase tracking-wider mt-1", className)}>
      {children}
    </p>
  );
}

export function CardContent({ children, className }: CardProps) {
  return <div className={cn("", className)}>{children}</div>;
}
