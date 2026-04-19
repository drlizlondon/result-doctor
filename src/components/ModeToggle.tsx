import { useMode } from "@/lib/mode";

export function ModeToggle() {
  const { mode, setMode } = useMode();
  return (
    <div className="inline-flex bg-muted/70 p-1 rounded-full ring-1 ring-inset ring-border">
      <button
        onClick={() => setMode("patient")}
        className={`px-3 sm:px-5 py-1.5 text-sm font-medium rounded-full transition-all ${
          mode === "patient"
            ? "bg-card text-foreground shadow-sm ring-1 ring-black/5"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <span className="mr-1.5">👤</span>Patient
      </button>
      <button
        onClick={() => setMode("clinician")}
        className={`px-3 sm:px-5 py-1.5 text-sm font-medium rounded-full transition-all ${
          mode === "clinician"
            ? "bg-card text-foreground shadow-sm ring-1 ring-black/5"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <span className="mr-1.5">🏥</span>Clinician
      </button>
    </div>
  );
}
