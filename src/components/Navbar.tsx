import { Link, useRouterState } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { ModeToggle } from "./ModeToggle";

const crumbMap: Record<string, string> = {
  "/": "Home",
  "/pathways": "NW London ICB · Haematology",
  "/pathway/anaemia": "Anaemia Pathway",
  "/about": "About",
};

export function Navbar() {
  const { location } = useRouterState();
  const path = location.pathname;
  const crumb = crumbMap[path];

  return (
    <header className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-xl border-b border-border/60">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
        <Logo />
        {crumb && path !== "/" && (
          <div className="hidden md:block text-sm text-muted-foreground font-medium tracking-tight">
            {crumb}
          </div>
        )}
        <div className="flex items-center gap-3 sm:gap-5">
          <Link
            to="/about"
            className="hidden sm:inline text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            About
          </Link>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
