export function Stub({ title, note }: { title: string; note: string }) {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-slate-500">{note}</p>
    </div>
  );
}
