// A 3px stripe in the Cameroon flag colors. Used sparingly as the app's
// single distinctive visual mark (top of auth cards, top of the app shell)
// rather than scattering the palette everywhere.
export function FlagBar({ className = "" }: { className?: string }) {
  return (
    <div className={`flex h-1 w-full overflow-hidden rounded-t-md ${className}`} aria-hidden="true">
      <div className="flex-1 bg-primary" />
      <div className="flex-1 bg-gold" />
      <div className="flex-1 bg-danger" />
    </div>
  );
}
