// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isGitHubPagesBuild = process.env.GITHUB_PAGES === "true";
const githubPagesBase = "/resultdoctor/";

export default defineConfig({
  cloudflare: isGitHubPagesBuild ? false : undefined,
  vite: {
    ...(isGitHubPagesBuild
      ? {
          base: githubPagesBase,
          preview: {
            host: "127.0.0.1",
          },
        }
      : {}),
  },
  tanstackStart: isGitHubPagesBuild
    ? {
        router: {
          basepath: githubPagesBase,
        },
        spa: {
          enabled: true,
        },
        prerender: {
          enabled: true,
        },
        pages: [
          { path: "/" },
          { path: "/about" },
          { path: "/pathways" },
          { path: "/pathway/anaemia" },
          { path: "/pathway/lft" },
        ],
      }
    : undefined,
});
