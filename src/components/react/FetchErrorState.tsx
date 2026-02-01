interface Props {
  onRetry: () => void;
}

export default function FetchErrorState({ onRetry }: Props) {
  return (
    <div
      className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg text-center"
      style={{ aspectRatio: '3/2', maxHeight: '100vh' }}
      role="alert"
    >
      {/* Broken chart icon (xkcd-style) */}
      <svg
        className="w-24 h-24 mb-6 text-gray-300"
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Axes */}
        <path d="M15 10 V85 H90" className="opacity-50" />
        {/* Chart line -- breaks and drops */}
        <path d="M20 75 L32 60 L44 65 L52 50" />
        <path d="M62 42 L72 30" />
        {/* The drop */}
        <path d="M72 30 L80 80" className="text-red-400 opacity-80" />
        {/* X mark */}
        <path d="M74 74 L84 84" className="text-red-400" />
        <path d="M84 74 L74 84" className="text-red-400" />
      </svg>

      <p className="text-gray-400 text-lg font-mono mb-6">
        Couldn't load download data
      </p>

      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-2.5 rounded-lg font-semibold text-sm
                   hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Retry
      </button>
    </div>
  );
}
