export function ChartSkeleton() {
    return (
        <div className="h-[420px] flex items-center justify-center bg-white rounded-xl">
            <div className="text-center">
                
                <div className="h-full w-full flex items-center justify-center bg-gray-50/50">
                    <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    </div>
                </div>
                <p className="text-gray-500 text-sm font-medium">
                    Loading...
                </p>
            </div>
        </div>
    )
}