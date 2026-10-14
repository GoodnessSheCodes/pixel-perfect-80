import { AlertTriangle } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="no-print flex items-center justify-center gap-2 bg-warning/20 px-4 py-1.5 text-center text-xs text-warning-foreground">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      Prototype with fictional demonstration data only. Not for real patient information or clinical use.
    </div>
  );
}
