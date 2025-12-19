"use client"

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { useDisputes } from '@/hooks/useDisputes'
import { Card } from '@/components/ui/card'
import { Award, TrendingUp, Trophy, DollarSign } from 'lucide-react'

export function ValidatorStats() {
    const { address } = useAccount()
    const [stats, setStats] = useState({
        totalVotes: 0,
        wonVotes: 0,
        lostVotes: 0,
        totalStaked: '0',
        totalWinnings: '0',
        winRate: 0
    })

    // TODO: Implement actual blockchain queries for validator stats
    // This would require indexing events or calling contract functions

    return (
        <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-500/20 rounded-lg">
                    <Award className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Validator Stats</h3>
                    <p className="text-sm text-muted-foreground">Your dispute voting performance</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-background/50 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1">Total Votes</p>
                    <p className="text-2xl font-bold text-white">{stats.totalVotes}</p>
                </div>

                <div className="bg-green-500/10 rounded-lg p-4">
                    <div className="flex items-center gap-1 mb-1">
                        <Trophy className="w-3 h-3 text-green-500" />
                        <p className="text-xs text-green-400">Won</p>
                    </div>
                    <p className="text-2xl font-bold text-green-500">{stats.wonVotes}</p>
                </div>

                <div className="bg-red-500/10 rounded-lg p-4">
                    <div className="flex items-center gap-1 mb-1">
                        <TrendingUp className="w-3 h-3 text-red-500" />
                        <p className="text-xs text-red-400">Lost</p>
                    </div>
                    <p className="text-2xl font-bold text-red-500">{stats.lostVotes}</p>
                </div>

                <div className="bg-blue-500/10 rounded-lg p-4">
                    <div className="flex items-center gap-1 mb-1">
                        <DollarSign className="w-3 h-3 text-blue-500" />
                        <p className="text-xs text-blue-400">Winnings</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-500">{stats.totalWinnings}</p>
                </div>
            </div>

            {stats.totalVotes > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Win Rate:</span>
                        <span className={`text-lg font-bold ${stats.winRate >= 50 ? 'text-green-500' : 'text-yellow-500'}`}>
                            {stats.winRate.toFixed(1)}%
                        </span>
                    </div>
                    <div className="mt-2 h-2 bg-background rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all"
                            style={{ width: `${stats.winRate}%` }}
                        />
                    </div>
                </div>
            )}

            {stats.totalVotes === 0 && (
                <div className="mt-4 text-center text-sm text-muted-foreground">
                    <p>You haven't voted on any disputes yet.</p>
                    <p className="mt-1">Start validating markets to earn rewards!</p>
                </div>
            )}
        </Card>
    )
}
