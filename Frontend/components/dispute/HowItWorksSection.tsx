import { Card } from '@/components/ui/card'

export function HowItWorksSection() {
    return (
        <div className="mt-16 mb-8">
            <Card className="p-8 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30 backdrop-blur-sm">
                <h2 className="text-3xl font-bold mb-6 text-white text-center">How Dispute Voting Works</h2>

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    {/* Step 1 */}
                    <div className="bg-background/50 rounded-lg p-6">
                        <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
                            <span className="text-2xl font-bold text-yellow-500">1</span>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-3">Create or Vote on Dispute</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                            When a market is resolved, anyone can challenge the resolution by creating a dispute. You can also vote on existing disputes.
                        </p>
                        <div className="text-xs text-yellow-400 bg-yellow-500/10 rounded p-2">
                            Minimum stake: 0.01 BNB (create) | 0.001 BNB (vote)
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="bg-background/50 rounded-lg p-6">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                            <span className="text-2xl font-bold text-blue-500">2</span>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-3">Stake-Based Voting</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                            Vote ACCEPT (resolution wrong) or REJECT (resolution correct). Your stake determines your influence.
                        </p>
                        <div className="text-xs text-blue-400 bg-blue-500/10 rounded p-2">
                            Higher stake = More influence + Bigger potential reward
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="bg-background/50 rounded-lg p-6">
                        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                            <span className="text-2xl font-bold text-green-500">3</span>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-3">Winners Take All</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                            After 3 days, the side with more total stake wins. Winners share the losing side's stakes (5% platform fee).
                        </p>
                        <div className="text-xs text-green-400 bg-green-500/10 rounded p-2">
                            Winners: Original stake + profit | Losers: Lose 100%
                        </div>
                    </div>
                </div>

                {/* Example Scenario */}
                <div className="bg-background/70 rounded-lg p-6 mb-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span className="text-2xl">💡</span>
                        Example Scenario
                    </h3>

                    <div className="space-y-4 text-sm">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <p className="font-semibold text-white mb-2">The Dispute:</p>
                                <p className="text-muted-foreground italic mb-4">
                                    Market: "Will Bitcoin hit $100k by Dec 15?"<br />
                                    Resolution: NO<br />
                                    Dispute: "Bitcoin hit $100,001 at 11:58 PM!"
                                </p>

                                <p className="font-semibold text-white mb-2">Voting Results:</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center bg-green-500/10 rounded p-2">
                                        <span className="text-green-400">ACCEPT (Resolution Wrong)</span>
                                        <span className="font-bold text-green-500">0.15 BNB</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-red-500/10 rounded p-2">
                                        <span className="text-red-400">REJECT (Resolution Correct)</span>
                                        <span className="font-bold text-red-500">0.05 BNB</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <p className="font-semibold text-white mb-2">Outcome:</p>
                                <div className="bg-green-500/10 rounded p-3 mb-3">
                                    <p className="text-green-400 font-semibold mb-2">✅ ACCEPT Wins (0.15 &gt; 0.05)</p>
                                    <p className="text-xs text-muted-foreground">
                                        Losing side pool: 0.05 BNB<br />
                                        Platform fee (5%): 0.0025 BNB<br />
                                        Winners share: 0.0475 BNB
                                    </p>
                                </div>

                                <p className="font-semibold text-white mb-2">Example Voter (Staked 0.03 BNB on ACCEPT):</p>
                                <div className="bg-background rounded p-3 space-y-1 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Your proportion:</span>
                                        <span className="text-white">0.03 / 0.15 = 20%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Your share:</span>
                                        <span className="text-white">20% × 0.0475 = 0.0095 BNB</span>
                                    </div>
                                    <div className="flex justify-between border-t border-border pt-1 mt-2">
                                        <span className="text-muted-foreground">Original stake:</span>
                                        <span className="text-white">0.03 BNB</span>
                                    </div>
                                    <div className="flex justify-between font-bold">
                                        <span className="text-green-400">Total received:</span>
                                        <span className="text-green-500">0.0395 BNB</span>
                                    </div>
                                    <div className="flex justify-between text-green-400">
                                        <span>Profit:</span>
                                        <span>+0.0095 BNB (+31.7%)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Key Points */}
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <h4 className="font-bold text-green-400 mb-3 flex items-center gap-2">
                            <span>✅</span> If You're Right
                        </h4>
                        <ul className="space-y-2 text-sm text-green-400/90">
                            <li>• Get your original stake back</li>
                            <li>• Receive proportional share of losers' stakes</li>
                            <li>• Possible returns: 20-200%+ profit</li>
                            <li>• Only 5% fee on winnings</li>
                        </ul>
                    </div>

                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                        <h4 className="font-bold text-red-400 mb-3 flex items-center gap-2">
                            <span>❌</span> If You're Wrong
                        </h4>
                        <ul className="space-y-2 text-sm text-red-400/90">
                            <li>• Lose your ENTIRE stake (100% loss)</li>
                            <li>• No refunds or partial returns</li>
                            <li>• Your stake goes to the winners</li>
                            <li>• Only vote when you're confident!</li>
                        </ul>
                    </div>
                </div>

                {/* Important Notes */}
                <div className="mt-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <h4 className="font-bold text-yellow-400 mb-3">⚠️ Important Notes</h4>
                    <ul className="grid md:grid-cols-2 gap-3 text-sm text-yellow-400/90">
                        <li>• Voting period lasts 3 days after dispute creation</li>
                        <li>• You can only vote once per dispute</li>
                        <li>• Higher stakes = more influence in the outcome</li>
                        <li>• Winning side is determined by total BNB staked</li>
                        <li>• Winners claim rewards after voting ends</li>
                        <li>• Always do your research before voting</li>
                    </ul>
                </div>
            </Card>
        </div>
    )
}
