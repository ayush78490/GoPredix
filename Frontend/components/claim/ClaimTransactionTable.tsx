"use client"

import { useClaimTransactions, ClaimTransaction } from "@/hooks/useClaimTransactions"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Loader2, Trophy } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export function ClaimTransactionTable() {
    const { transactions, isLoading, error } = useClaimTransactions()

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`
    }

    const getBscScanLink = (txHash: string) => {
        return `https://testnet.bscscan.com/tx/${txHash}`
    }

    if (isLoading) {
        return (
            <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        Recent Claims
                    </CardTitle>
                    <CardDescription>Latest winning claims from all markets</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        Recent Claims
                    </CardTitle>
                    <CardDescription>Latest winning claims from all markets</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive text-sm">{error}</p>
                </CardContent>
            </Card>
        )
    }

    if (transactions.length === 0) {
        return (
            <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        Recent Claims
                    </CardTitle>
                    <CardDescription>Latest winning claims from all markets</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm text-center py-8">
                        No claims yet. Be the first to win and claim!
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Recent Claims
                </CardTitle>
                <CardDescription>Last 5 winning claims from all markets</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border border-primary/20 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-muted/50">
                                <TableHead>Market</TableHead>
                                <TableHead>Winner</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Token</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead className="text-right">Transaction</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.map((tx, index) => (
                                <TableRow key={`${tx.txHash}-${index}`} className="hover:bg-muted/50">
                                    <TableCell className="max-w-[300px]">
                                        <div className="truncate" title={tx.marketQuestion}>
                                            {tx.marketQuestion}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Market #{tx.marketId}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <code className="text-xs bg-muted px-2 py-1 rounded">
                                            {formatAddress(tx.claimer)}
                                        </code>
                                    </TableCell>
                                    <TableCell className="font-semibold text-green-500">
                                        {parseFloat(tx.amount).toFixed(4)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={tx.tokenType === 'BNB' ? 'border-yellow-500 text-yellow-500' : 'border-purple-500 text-purple-500'}
                                        >
                                            {tx.tokenType}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(tx.timestamp * 1000), { addSuffix: true })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <a
                                            href={getBscScanLink(tx.txHash)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                        >
                                            <span className="hidden sm:inline">{formatAddress(tx.txHash)}</span>
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
