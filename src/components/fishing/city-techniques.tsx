export default function CityTechniques({
  techniques,
}: {
  techniques: string[];
}) {
  if (!techniques || techniques.length === 0) return null;

  return (
    <section
      data-testid="section-city-techniques"
      className="max-w-6xl mx-auto px-6 pb-8"
    >
      <ul className="flex flex-wrap gap-2">
        {techniques.map((technique) => (
          <li
            key={technique}
            className="border border-rc-bg-light text-rc-text-light text-xs px-3 py-1.5 uppercase tracking-widest font-medium rounded-full"
          >
            {technique}
          </li>
        ))}
      </ul>
    </section>
  );
}
