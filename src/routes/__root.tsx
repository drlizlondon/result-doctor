import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { ModeProvider } from "@/lib/mode";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-semibold text-foreground tracking-tight">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-[12px] bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ResultDoctor — Understand your results. Know your next step." },
      {
        name: "description",
        content:
          "Interactive NHS clinical pathways. Enter your blood test results and follow the exact NHS guideline logic — built for patients and clinicians.",
      },
      { property: "og:title", content: "ResultDoctor — Understand your results. Know your next step." },
      { name: "twitter:title", content: "ResultDoctor — Understand your results. Know your next step." },
      { name: "description", content: "ResultDoctor converts NHS guidelines into interactive tools for patients and clinicians." },
      { property: "og:description", content: "ResultDoctor converts NHS guidelines into interactive tools for patients and clinicians." },
      { name: "twitter:description", content: "ResultDoctor converts NHS guidelines into interactive tools for patients and clinicians." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/99946764-0168-4560-9549-25a9edcc516a/id-preview-6a7f9595--12159e2d-f385-4a40-9017-809b3febdd86.lovable.app-1776717210449.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/99946764-0168-4560-9549-25a9edcc516a/id-preview-6a7f9595--12159e2d-f385-4a40-9017-809b3febdd86.lovable.app-1776717210449.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <ModeProvider>
      <div className="min-h-dvh flex flex-col bg-background">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </ModeProvider>
  );
}
