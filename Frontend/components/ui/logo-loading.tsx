"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import MyImage from '@/public/logo.png'

interface LogoLoadingProps {
    className?: string
    size?: number
    fullScreen?: boolean
}

export function LogoLoading({ className, size = 48, fullScreen = false }: LogoLoadingProps) {
    // Calculate ring size to be proportional to the logo
    const ringSize = Math.max(size * 1.5, size + 12);

    const content = (
        <div
            className={cn("relative flex items-center justify-center", className)}
            style={{ width: ringSize, height: ringSize }}
        >
            {/* Spinning ring */}
            <div
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 border-r-cyan-400/50 animate-spin"
            />

            {/* Logo */}
            <div className="relative">
                <Image
                    src={MyImage}
                    alt="Loading..."
                    width={size}
                    height={size}
                    className="object-contain"
                    priority
                />
            </div>
        </div>
    )

    if (fullScreen) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0118]/80 backdrop-blur-sm">
                {content}
            </div>
        )
    }

    return content
}
