export default function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card rounded-xl shadow border border-[#1b2640]">
      <div className="px-4 py-3 border-b border-[#1b2640] text-sm text-muted">
        {title}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
