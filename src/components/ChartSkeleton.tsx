// ── Chart Skeleton Loader ─────────────────────────────────────────────────────

export function ChartSkeleton() {
    return (
        <div className="h-[560px] flex items-center justify-center
                        bg-gray-50 rounded-xl">
            <div className="text-center">
                <div className="w-10 h-10 border-4 border-blue-500
                                border-t-transparent rounded-full
                                animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm font-medium">
                    Loading chart...
                </p>
            </div>
        </div>
    )
}
