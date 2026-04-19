export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-card/40">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 py-8 text-xs sm:text-sm text-muted-foreground leading-relaxed text-center max-w-3xl">
        This tool reproduces NHS NW London clinical guidelines (NW London Outpatient Pathways).
        It does not replace clinical judgement or a consultation with a qualified healthcare
        professional. Always speak to your doctor.
      </div>
    </footer>
  );
}
