interface Options {
  logScale: boolean;
  alignTimeline: boolean;
}

interface Props {
  options: Options;
  onChange: (options: Options) => void;
  hasData: boolean;
}

export default function ChartControls({ options, onChange, hasData }: Props) {
  if (!hasData) return null;

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
      <label className="flex items-center gap-1.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={options.logScale}
          onChange={(e) => onChange({ ...options, logScale: e.target.checked })}
          className="accent-gray-800"
        />
        Log scale
      </label>
      <label className="flex items-center gap-1.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={options.alignTimeline}
          onChange={(e) => onChange({ ...options, alignTimeline: e.target.checked })}
          className="accent-gray-800"
        />
        Align timeline
      </label>
    </div>
  );
}
