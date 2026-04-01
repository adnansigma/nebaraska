// ── Line Style Legend Component ───────────────────────────────────────────────

interface LineStyleLegendProps {
    viewMode: string
}

export function LineStyleLegend({ viewMode }: LineStyleLegendProps) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100
                        shadow-sm p-5">
            <p className="text-[11px] font-semibold text-gray-400
                          uppercase tracking-widest mb-4">
                Line Style
            </p>

            <div className="space-y-4">
                {viewMode === 'all' ? (
                    <div className="flex items-center gap-3">
                        <svg width="36" height="12">
                            <line x1="0" y1="6" x2="36" y2="6"
                                  stroke="#374151" strokeWidth="2.5" />
                            <circle cx="18" cy="6" r="3.5" fill="#374151" />
                        </svg>
                        <span className="text-xs text-gray-600 font-medium">
                            District Average
                        </span>
                    </div>
                ) : (
                    <>
                        {/* Male */}
                        <div className="flex items-center gap-3">
                            <svg width="36" height="12">
                                <line x1="0" y1="6" x2="36" y2="6"
                                      stroke="#374151" strokeWidth="2.5" />
                                <circle cx="18" cy="6" r="3.5" fill="#374151" />
                            </svg>
                            <div>
                                <p className="text-xs font-semibold text-gray-700">
                                    Male
                                </p>
                                <p className="text-[10px] text-gray-400">
                                    Solid line
                                </p>
                            </div>
                        </div>

                        {/* Female */}
                        <div className="flex items-center gap-3">
                            <svg width="36" height="12">
                                <line x1="0" y1="6" x2="36" y2="6"
                                      stroke="#374151" strokeWidth="2.5"
                                      strokeDasharray="3,3" />
                                <polygon points="18,2.5 21.5,9.5 14.5,9.5"
                                         fill="#374151" />
                            </svg>
                            <div>
                                <p className="text-xs font-semibold text-gray-700">
                                    Female
                                </p>
                                <p className="text-[10px] text-gray-400">
                                    Dotted line
                                </p>
                            </div>
                        </div>

                        {/* Combined */}
                        <div className="flex items-center gap-3">
                            <svg width="36" height="12">
                                <line x1="0" y1="6" x2="36" y2="6"
                                      stroke="#374151" strokeWidth="2.5"
                                      strokeDasharray="8,3,2,3" />
                                <rect x="14.5" y="2.5" width="7" height="7"
                                      fill="#374151" />
                            </svg>
                            <div>
                                <p className="text-xs font-semibold text-gray-700">
                                    M+F Combined
                                </p>
                                <p className="text-[10px] text-gray-400">
                                    Weighted average
                                </p>
                            </div>
                        </div>
                    </>
                )}

                {/* State reference */}
                <div className="pt-3 mt-1 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 font-semibold
                                  uppercase tracking-wider mb-3">
                        Reference
                    </p>
                    <div className="flex items-center gap-3">
                        <svg width="36" height="12">
                            <line x1="0" y1="6" x2="36" y2="6"
                                  stroke="#dc2626" strokeWidth="3"
                                  strokeDasharray="6,3" />
                            <polygon points="18,2 22,10 14,10"
                                     fill="#dc2626" />
                        </svg>
                        <div>
                            <p className="text-xs font-semibold text-red-600">
                                State Average
                            </p>
                            <p className="text-[10px] text-gray-400">
                                Benchmark
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
