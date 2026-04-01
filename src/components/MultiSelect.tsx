'use client'
import { useState, useEffect, useRef } from 'react'

// ── Multi-Select Component ────────────────────────────────────────────────────

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
        selected.length === 0             ? placeholder :
        selected.length === options.length ? `All ${label}s Selected` :
        selected.length === 1             ?
            options.find(o => o.value === selected[0])?.label || '' :
        `${selected.length} ${label}s Selected`

    return (
        <div className="relative flex-1 min-w-[160px]" ref={ref}>
            {/* Label */}
            <p className="text-[11px] font-semibold text-gray-400
                          uppercase tracking-widest mb-2">
                {label}
            </p>

            {/* Trigger button */}
            <button
                type="button"
                onClick={() => setOpen(!open)}
                style={{ borderColor: accentColor }}
                className="w-full h-11 flex items-center justify-between
                           px-4 bg-white border-2 rounded-xl text-sm
                           font-medium text-gray-700 hover:bg-gray-50
                           focus:outline-none transition-all shadow-sm"
            >
                <span className="truncate text-left">{displayText}</span>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {selected.length > 0 && selected.length < options.length && (
                        <span
                            style={{ background: accentColor }}
                            className="text-white text-[10px] font-bold
                                       w-5 h-5 rounded-full flex items-center
                                       justify-center"
                        >
                            {selected.length}
                        </span>
                    )}
                    <svg
                        className={`w-4 h-4 text-gray-400 transition-transform
                                    ${open ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round"
                              strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute z-50 mt-2 w-full bg-white
                                border border-gray-200 rounded-xl
                                shadow-2xl overflow-hidden">
                    {/* Select / Clear All */}
                    <div className="flex border-b border-gray-100 bg-gray-50">
                        <button
                            onClick={() => onChange(options.map(o => o.value))}
                            className="flex-1 py-2.5 text-xs font-semibold
                                       text-blue-600 hover:bg-blue-50
                                       transition-colors"
                        >
                            Select All
                        </button>
                        <div className="w-px bg-gray-200" />
                        <button
                            onClick={() => onChange([])}
                            className="flex-1 py-2.5 text-xs font-semibold
                                       text-gray-500 hover:bg-gray-100
                                       transition-colors"
                        >
                            Clear All
                        </button>
                    </div>

                    {/* Options list */}
                    <div className="max-h-60 overflow-y-auto">
                        {options.map(opt => (
                            <label
                                key={opt.value}
                                className="flex items-center gap-3 px-4 py-3
                                           hover:bg-gray-50 cursor-pointer
                                           transition-colors border-b
                                           border-gray-50 last:border-0"
                            >
                                <div
                                    onClick={() => toggle(opt.value)}
                                    style={{
                                        borderColor: selected.includes(opt.value)
                                            ? accentColor : '#d1d5db',
                                        background : selected.includes(opt.value)
                                            ? accentColor : 'white',
                                    }}
                                    className="w-4 h-4 rounded border-2
                                               flex-shrink-0 flex items-center
                                               justify-center cursor-pointer
                                               transition-all"
                                >
                                    {selected.includes(opt.value) && (
                                        <svg className="w-2.5 h-2.5 text-white"
                                             fill="none" viewBox="0 0 24 24"
                                             stroke="currentColor">
                                            <path strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={3}
                                                  d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <span
                                    className="text-sm text-gray-700 select-none"
                                    onClick={() => toggle(opt.value)}
                                >
                                    {opt.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
