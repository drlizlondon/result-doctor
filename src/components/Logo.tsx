import { Link } from "@tanstack/react-router";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <div className="size-8 rounded-[10px] bg-primary flex items-center justify-center shadow-sm transition-transform group-hover:scale-105">
        <svg viewBox="0 0 24 24" fill="none" className="size-4 text-primary-foreground">
          <path
            d="M3 12h3l2-6 4 12 2-8 2 4h5"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span className="font-semibold text-[19px] tracking-tight text-foreground">
        Result<span className="text-primary">Doctor</span>
      </span>
    </Link>
  );
}
