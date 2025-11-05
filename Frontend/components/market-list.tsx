// components/market-list.tsx
import { usePredictionMarket } from '../hooks/use-predection-market'
import { useEffect, useState } from 'react'
import React from "react";
import MarketCard from "@/components/market-card";

export function MarketList() {
  const { getAllMarkets, isLoading } = usePredictionMarket()
  const [markets, setMarkets] = useState<any[]>([])

  useEffect(() => {
    const loadMarkets = async () => {
      try {
        const marketData = await getAllMarkets()
        setMarkets(marketData)
      } catch (error) {
        console.error('Failed to load markets:', error)
      }
    }

    loadMarkets()
  }, [getAllMarkets])

  if (isLoading) return <div>Loading markets...</div>

  return (
    <div>
      {markets.map(market => (
        <div key={market.id} className="market-card">
          <h3>{market.question}</h3>
          <p>YES: {market.yesPrice}% | NO: {market.noPrice}%</p>
          <p>Ends: {new Date(market.endTime * 1000).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  )
}

export default function MarketList({ markets }: { markets: any[] }) {
  if (!markets || markets.length === 0) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        No markets found.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {markets.map((m) => (
          <div key={m.id} className="h-full">
            <MarketCard market={m} />
          </div>
        ))}
      </div>
    </div>
  );
}