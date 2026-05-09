'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart2, School, Scale, LineChart } from 'lucide-react'
import { useState } from 'react'

const NAV_ITEMS = [
    { href: '/',           label: 'Nebraska',            icon: BarChart2 },
    { href: '/district66', label: 'District 66',     icon: School    },
    { href: '/charts',     label: 'Research', icon: LineChart  },
]

export function Navbar() {
    const pathname = usePathname()

    return (
        <header className="bg-[#1a3353] shadow-lg sticky top-0 z-50">
            <div className="mx-auto max-w-screen-2xl px-4 sm:px-8 lg:px-12">
                <div className="flex items-center justify-between h-16 sm:h-18">

                    {/* Branding — left */}
                    <div className="flex-shrink-0">
                        <h1 className="text-white font-bold text-2xl sm:text-4xl md:text-4xl tracking-wide leading-tight">
                            Pencils before Pixels
                        </h1>
                    </div>

                    {/* Nav links — right (desktop) */}
                    <nav className="hidden md:flex items-center gap-1">
                        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                            const active = pathname === href
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={`flex items-center gap-2 px-3 lg:px-4 py-2
                                                text-sm font-semibold rounded-lg
                                                transition-all duration-150
                                                ${active
                                                    ? 'bg-white/15 text-white'
                                                    : 'text-blue-200 hover:bg-white/10 hover:text-white'
                                                }`}
                                >
                                    <Icon size={15} className="flex-shrink-0" />
                                    <span>{label}</span>
                                    {active && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-300
                                                         flex-shrink-0 ml-0.5" />
                                    )}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Mobile hamburger */}
                    <MobileMenu pathname={pathname} />
                </div>
            </div>
        </header>
    )
}

// ── Mobile dropdown ───────────────────────────────────────────────────────────
function MobileMenu({ pathname }: { pathname: string }) {
    const [open, setOpen] = useState(false)

    return (
        <div className="md:hidden relative">
            <button
                onClick={() => setOpen(o => !o)}
                className="flex flex-col gap-1.5 p-2 rounded-lg
                           hover:bg-white/10 transition-colors"
                aria-label="Toggle menu"
            >
                <span className={`block w-5 h-0.5 bg-white transition-all duration-200
                                  ${open ? 'rotate-45 translate-y-2' : ''}`} />
                <span className={`block w-5 h-0.5 bg-white transition-all duration-200
                                  ${open ? 'opacity-0' : ''}`} />
                <span className={`block w-5 h-0.5 bg-white transition-all duration-200
                                  ${open ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>

            {open && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setOpen(false)}
                    />
                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-2 w-52 bg-[#1a3353]
                                    border border-white/10 rounded-xl shadow-2xl
                                    overflow-hidden z-50">
                        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                            const active = pathname === href
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    onClick={() => setOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3
                                                text-sm font-semibold transition-colors
                                                border-b border-white/5 last:border-0
                                                ${active
                                                    ? 'bg-white/15 text-white'
                                                    : 'text-blue-200 hover:bg-white/10 hover:text-white'
                                                }`}
                                >
                                    <Icon size={15} className="flex-shrink-0" />
                                    {label}
                                    {active && (
                                        <span className="ml-auto w-1.5 h-1.5 rounded-full
                                                         bg-blue-300 flex-shrink-0" />
                                    )}
                                </Link>
                            )
                        })}
                    </div>
                </>
            )}
        </div>
    )
}