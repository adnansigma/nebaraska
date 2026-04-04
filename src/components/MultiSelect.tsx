'use client'
import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Check } from 'lucide-react'

interface Option {
    value: string
    label: string
}

interface MultiSelectProps {
    label      : string
    options    : Option[]
    selected   : string[]
    onChange   : (v: string[]) => void
    placeholder: string
    accentColor: string
}

export function MultiSelect({
    label, options, selected, onChange, placeholder, accentColor,
}: MultiSelectProps) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node))
                setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const toggle = (val: string) =>
        onChange(selected.includes(val)
            ? selected.filter(v => v !== val)
            : [...selected, val])

    const displayText =
        selected.length === 0              ? placeholder :
        selected.length === options.length ? `All ${label}s` :
        selected.length === 1              ?
            options.find(o => o.value === selected[0])?.label || '' :
        `${selected.length} ${label}s Selected`

    return (
        <div className="relative w-full" ref={ref}>
            {/* Label */}
            <p className="text-[11px] font-semibold text-gray-400
                          uppercase tracking-widest mb-2">
                {label}
            </p>

            {/* Trigger button */}
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full h-11 flex items-center justify-between
                           px-4 bg-white border-[3px] border-[#15315E]
                           rounded-xl text-sm font-semibold text-gray-700
                           hover:bg-gray-50 focus:outline-none transition-all shadow-sm
                           touch-manipulation"
            >
                <span className="truncate pr-2 text-left">{displayText}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {selected.length > 0 && selected.length < options.length && (
                        <span
                            style={{ background: accentColor }}
                            className="text-white text-[10px] font-bold w-5 h-5
                                       rounded-full flex items-center justify-center
                                       shadow-sm"
                        >
                            {selected.length}
                        </span>
                    )}
                    <ChevronDown
                        className={`w-4 h-4 text-[#15315E] transition-transform
                                    duration-200 ${open ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute z-50 mt-2 w-full bg-white
                                border border-gray-200 rounded-xl shadow-2xl
                                overflow-hidden">
                    {/* Select / Clear All */}
                    <div className="flex border-b border-gray-100 bg-gray-50/50">
                        <button
                            type="button"
                            onClick={() => onChange(options.map(o => o.value))}
                            className="flex-1 py-3 text-[11px] font-bold text-blue-900
                                       hover:bg-blue-50 transition-colors uppercase
                                       tracking-tight touch-manipulation"
                        >
                            Select All
                        </button>
                        <div className="w-px bg-gray-200" />
                        <button
                            type="button"
                            onClick={() => onChange([])}
                            className="flex-1 py-3 text-[11px] font-bold text-gray-400
                                       hover:bg-gray-100 transition-colors uppercase
                                       tracking-tight touch-manipulation"
                        >
                            Clear All
                        </button>
                    </div>

                    {/* Options list — taller touch targets on mobile */}
                    <div className="max-h-56 sm:max-h-60 overflow-y-auto">
                        {options.map(opt => {
                            const isSelected = selected.includes(opt.value)
                            return (
                                <div
                                    key={opt.value}
                                    onClick={() => toggle(opt.value)}
                                    className="flex items-center gap-3 px-4 py-3.5 sm:py-3
                                               hover:bg-gray-50 active:bg-gray-100
                                               cursor-pointer transition-colors
                                               border-b border-gray-50 last:border-0
                                               touch-manipulation"
                                >
                                    <div
                                        style={{
                                            borderColor: isSelected ? accentColor : '#d1d5db',
                                            background : isSelected ? accentColor : 'white',
                                        }}
                                        className="w-4 h-4 rounded border-2 flex-shrink-0
                                                   flex items-center justify-center
                                                   transition-all"
                                    >
                                        {isSelected && (
                                            <Check className="w-3 h-3 text-white stroke-[4]" />
                                        )}
                                    </div>
                                    <span className={`text-xs sm:text-sm select-none ${
                                        isSelected
                                            ? 'text-gray-900 font-semibold'
                                            : 'text-gray-600'
                                    }`}>
                                        {opt.label}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
