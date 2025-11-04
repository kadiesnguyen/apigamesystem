export default function Table({
  columns,
  rows,
}: {
  columns: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <table className="w-full text-sm">
      <thead className="text-muted">
        <tr>
          {columns.map((c) => (
            <th key={c} className="text-left font-medium py-2">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-[#1b2640]">
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((cell, j) => (
              <td key={j} className="py-2">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
