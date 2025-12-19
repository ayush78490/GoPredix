"use client"

import { useEffect, useState } from 'react'
import { useDisputes, DisputeStatus } from '@/hooks/useDisputes'
import { AlertCircle } from 'lucide-react'

interface DisputeBadgeProps {
    marketId: number
    marketStatus: number
    className?: string
}

export function DisputeBadge({ marketId, marketStatus, className = '' }: DisputeBadgeProps) {
    const { getMarketDispute } = useDisputes()
    const [hasDispute, setHasDispute] = useState(false)
    const [disputeStatus, setDisputeStatus] = useState<DisputeStatus>(DisputeStatus.None)

    useEffect(() => {
        const checkDispute = async () => {
            // Only check for disputes on resolved markets
            if (marketStatus === 3) { // Resolved
                const dispute = await getMarketDispute(marketId)
                if (dispute) {
                    setHasDispute(true)
                    setDisputeStatus(dispute.status)
                }
            }
        }

        checkDispute()
    }, [marketId, marketStatus, getMarketDispute])

    if (!hasDispute) return null

    const getStatusInfo = () => {
        switch (disputeStatus) {
            case DisputeStatus.Active:
                return {
                    text: 'Dispute Active',
                    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                }
            case DisputeStatus.VotingInProgress:
                return {
                    text: 'Voting in Progress',
                    color: 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                }
            case DisputeStatus.Resolved:
                return {
                    text: 'Dispute Resolved',
                    color: 'bg-green-500/20 text-green-400 border-green-500/50'
                }
            case DisputeStatus.Rejected:
                return {
                    text: 'Dispute Rejected',
                    color: 'bg-red-500/20 text-red-400 border-red-500/50'
                }
            default:
                return null
        }
    }

    const statusInfo = getStatusInfo()
    if (!statusInfo) return null

    return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${statusInfo.color} ${className}`}>
            <AlertCircle className="w-3 h-3" />
            {statusInfo.text}
        </div>
    )
}
