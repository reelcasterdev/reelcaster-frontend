// (app) route group — authenticated app surfaces.
// Pass-through layout: AppShell is mounted by individual pages or sub-layouts
// since some pages (e.g. fullscreen map) don't want the standard shell.
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
