import ReactMarkdown from "react-markdown";

export default function CityLocalIntel({
  md,
}: {
  md: string | null;
}) {
  if (!md) return null;

  return (
    <section
      data-testid="section-city-local-intel"
      className="max-w-6xl mx-auto px-6 py-12"
      aria-label="Local fishing tips"
    >
      <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-rc-text mb-6">
        Local Intel
      </h2>

      {/* Distinct callout: deeper than the surrounding rc-bg-darkest page so the
          terminal-style block still reads as a separate "field notes" panel. */}
      <div className="bg-rc-bg-darkest border border-rc-bg-light text-rc-text-light rounded-lg p-6 md:p-8">
        <div className="font-mono text-sm leading-relaxed">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
              strong: ({ children }) => (
                <strong className="font-bold text-rc-text">{children}</strong>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside space-y-1 mb-3">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside space-y-1 mb-3">
                  {children}
                </ol>
              ),
              li: ({ children }) => <li>{children}</li>,
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-blue-400 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
            }}
          >
            {md}
          </ReactMarkdown>
        </div>
      </div>
    </section>
  );
}
