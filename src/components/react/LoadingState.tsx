interface ProgressItem {
  packageName: string;
  loaded: number;
  total: number;
  color: string;
}

interface Props {
  items: ProgressItem[];
}

export default function LoadingState({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
      {items.map((item) => {
        const pct = item.total > 0 ? Math.round((item.loaded / item.total) * 100) : 0;

        return (
          <div key={item.packageName} className="flex items-center gap-3">
            <span
              className="shrink-0 px-3 py-0.5 rounded-full text-xs font-medium border-2"
              style={{ borderColor: item.color, color: item.color }}
            >
              {item.packageName}
            </span>

            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${pct}%`, backgroundColor: item.color }}
              />
            </div>

            <span className="shrink-0 text-xs font-mono text-gray-400 w-8 text-right tabular-nums">
              {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
