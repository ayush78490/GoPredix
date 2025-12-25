'use client'

import { Card } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { useDisputeTransactions } from '@/hooks/useDisputeTransactions'
import { ExternalLink, Loader2, AlertCircle, Coins } from 'lucide-react'
import { LogoLoading } from '@/components/ui/logo-loading'

const BSC_TESTNET_EXPLORER = 'https://testnet.bscscan.com'

const truncateAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function DisputeTransactionTable() {
    const { transactions, isLoading, error } = useDisputeTransactions()

    if (isLoading) {
        return (
            <Card className="p-6 bg-card/80 backdrop-blur-sm">
                <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    Recent Disputes
                </h3>
                <div className="flex justify-center items-center py-12">
                    <LogoLoading size={48} />
                </div>
            </Card>
        )
    }

    if (error) {
        return (
            <Card className="p-6 bg-card/80 backdrop-blur-sm">
                <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    Recent Disputes
                </h3>
                <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
                    <p className="text-destructive text-sm">Failed to load disputes</p>
                </div>
            </Card>
        )
    }

    return (
        <Card className="p-6 bg-card/80 backdrop-blur-sm">
            <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                Recent Disputes ({transactions.length})
            </h3>

            {transactions.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-muted-foreground">No disputes yet</p>
                </div>
            ) : (
                <div className="max-h-[600px] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Disputer</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Tx Hash</TableHead>
                                <TableHead>Time</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.map((tx, index) => (
                                <TableRow key={`${tx.txHash}-${index}`}>
                                    <TableCell>
                                        <a
                                            href={`${BSC_TESTNET_EXPLORER}/address/${tx.disputer}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline flex items-center gap-1"
                                        >
                                            {truncateAddress(tx.disputer)}
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <span className={`font-medium ${tx.tokenType === 'PDX'
                                                    ? 'text-purple-400'
                                                    : 'text-yellow-400'
                                                }`}>
                                                {parseFloat(tx.amount).toFixed(4)}
                                            </span>
                                            <span className={`text-xs ${tx.tokenType === 'PDX'
                                                    ? 'text-purple-400/70'
                                                    : 'text-yellow-400/70'
                                                }`}>
                                                {tx.tokenType}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <a
                                            href={`${BSC_TESTNET_EXPLORER}/tx/${tx.txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline flex items-center gap-1"
                                        >
                                            {truncateAddress(tx.txHash)}
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {formatTimestamp(tx.timestamp)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </Card>
    )
}
