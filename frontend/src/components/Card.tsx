import { ReactNode } from "react";
import { FlagBar } from "./FlagBar";

export function Card({ children, className = "", withFlagBar = true }: { children: ReactNode; className?: string; withFlagBar?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-md border border-border bg-surface shadow-sm ${className}`}>
      {withFlagBar && <FlagBar />}
      <div className="p-6">{children}</div>
    </div>
  );
}
