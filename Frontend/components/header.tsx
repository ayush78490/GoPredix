"use client"

import React, { useState } from "react";
import Link from "next/link";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-lg font-bold text-foreground">
              PredictMarket
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-4">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">Markets</Link>
            <Link href="/profile" className="text-sm text-muted-foreground hover:text-foreground">Profile</Link>
            <Link href="/create" className="text-sm text-muted-foreground hover:text-foreground">Create</Link>
          </nav>

          <div className="md:hidden">
            <button
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
              className="p-2 rounded-md text-muted-foreground hover:text-foreground focus:outline-none focus:ring"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <path
                  d={open ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden py-2 space-y-2">
            <Link href="/" className="block px-2 py-2 text-sm text-foreground">Markets</Link>
            <Link href="/profile" className="block px-2 py-2 text-sm text-foreground">Profile</Link>
            <Link href="/create" className="block px-2 py-2 text-sm text-foreground">Create</Link>
          </div>
        )}
      </div>
    </header>
  );
}
