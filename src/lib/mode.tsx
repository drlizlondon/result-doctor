import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Mode = "patient" | "clinician";

type Ctx = {
  mode: Mode;
  setMode: (m: Mode) => void;
};

const ModeContext = createContext<Ctx | null>(null);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>("patient");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("rd-mode") as Mode | null;
    if (saved === "patient" || saved === "clinician") setModeState(saved);
  }, []);

  const setMode = (m: Mode) => {
    setModeState(m);
    if (typeof window !== "undefined") window.localStorage.setItem("rd-mode", m);
  };

  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>;
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used within ModeProvider");
  return ctx;
}
