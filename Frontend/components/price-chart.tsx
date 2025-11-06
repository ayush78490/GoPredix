"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/card'

interface PriceData {
  date: string
  timestamp: number
  yesPrice: number
  noPrice: number
}

export default function PriceChart({ data, isLoading }: { data: PriceData[], isLoading: boolean }) {
  if (isLoading) {
    return <Card className="p-6 text-center text-muted-foreground">Loading historical data from blockchain...</Card>
  }

  if (!data || data.length === 0) {
    return <Card className="p-6 text-center text-muted-foreground">No historical data available yet</Card>
  }

  // Remove duplicate dates
  const uniqueData = Array.from(new Map(data.map(d => [d.date, d])).values())

  return (
    <Card className="p-6 w-full">
      <h3 className="text-lg font-semibold mb-4">Prediction History</h3>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={uniqueData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis 
            dataKey="date" 
            stroke="#888"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            stroke="#888"
            tick={{ fontSize: 12 }}
            domain={[0, 100]}
            label={{ value: 'Prediction (%)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
            formatter={(value) => `${(value as number).toFixed(2)}%`}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend />
          
          <Line 
            type="monotone" 
            dataKey="yesPrice" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={false}
            name="YES"
          />
          
          <Line 
            type="monotone" 
            dataKey="noPrice" 
            stroke="#ef4444" 
            strokeWidth={2}
            dot={false}
            name="NO"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}