"use client"

import { Twitter } from 'lucide-react'

interface TwitterProfileDisplayProps {
    username?: string | null
    name?: string | null
    avatarUrl?: string | null
    showHandle?: boolean
}

export default function TwitterProfileDisplay({
    username,
    name,
    avatarUrl,
    showHandle = true,
}: TwitterProfileDisplayProps) {
    if (!username) {
        return null
    }

    return (
        <div className="flex items-center gap-2">
            {avatarUrl ? (
                <img
                    src={avatarUrl}
                    alt={username}
                    className="w-6 h-6 rounded-full"
                />
            ) : (
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Twitter className="w-3 h-3 text-blue-400" />
                </div>
            )}
            {showHandle && (
                <span className="text-sm text-muted-foreground">
                    @{username}
                </span>
            )}
        </div>
    )
}
