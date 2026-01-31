interface Props {
  loaded: number;
  total: number;
  packageName: string;
}

export default function LoadingState({ loaded, total, packageName }: Props) {
  const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3 text-sm text-gray-500">
      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gray-800 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span>Fetching {packageName}...</span>
    </div>
  );
}
