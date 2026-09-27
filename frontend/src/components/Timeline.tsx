import { Check, X, Clock, Award } from "lucide-react";

export interface TimelineStep {
  title: string;
  subtitle?: string;
  state: "done" | "current" | "upcoming" | "rejected";
  isFinal?: boolean; // renders a trophy/award icon instead of a checkmark when done
}

function StepIcon({ state, isFinal }: { state: TimelineStep["state"]; isFinal?: boolean }) {
  const base = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full";
  if (state === "rejected") {
    return <div className={`${base} bg-danger text-white`}><X size={16} /></div>;
  }
  if (state === "done") {
    return <div className={`${base} bg-primary text-white`}>{isFinal ? <Award size={16} /> : <Check size={16} />}</div>;
  }
  if (state === "current") {
    return <div className={`${base} border-2 border-primary bg-white text-primary`}><Clock size={14} /></div>;
  }
  return <div className={`${base} border-2 border-border bg-white text-muted`}><Check size={14} /></div>;
}

export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="flex flex-col">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <StepIcon state={step.state} isFinal={step.isFinal} />
            {i < steps.length - 1 && (
              <div className={`w-0.5 flex-1 ${step.state === "done" ? "bg-primary" : "bg-border"}`} style={{ minHeight: "28px" }} />
            )}
          </div>
          <div className="pb-6">
            <p className={`font-semibold ${step.state === "upcoming" ? "text-muted" : "text-ink"}`}>{step.title}</p>
            {step.subtitle && <p className="mt-0.5 text-sm text-muted">{step.subtitle}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
