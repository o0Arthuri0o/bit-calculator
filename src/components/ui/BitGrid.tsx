import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BitGridProps {
  value: bigint;
  mode: number;
  onToggle: (idx: number) => void;
}

export const BitGrid = ({ value, mode, onToggle }: BitGridProps) => {
  return (
    <div className="grid grid-cols-8 gap-1.5 md:gap-2">
      {Array.from({ length: mode }).map((_, i) => {
        const bitIdx = mode - 1 - i;
        const isActive = (value >> BigInt(bitIdx)) & 1n;
        
        return (
          <div key={bitIdx} className="flex flex-col items-center gap-1">
            <Button
              variant={isActive ? "default" : "outline"}
              className={cn(
                "w-full h-10 font-mono text-xs p-0 transition-all duration-150",
                isActive 
                  ? "bg-primary/90 text-primary-foreground border-primary/50 shadow-sm hover:bg-primary" 
                  : "text-muted-foreground border-border/60 hover:border-primary/40"
              )}
              onClick={() => onToggle(bitIdx)}
            >
              {isActive ? "1" : "0"}
            </Button>
            <span className="text-[10px] font-mono text-muted-foreground opacity-50">{bitIdx}</span>
          </div>
        );
      })}
    </div>
  );
};