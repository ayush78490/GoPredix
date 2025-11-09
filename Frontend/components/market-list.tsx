// components/market-list.tsx
import { useAllMarkets } from '../hooks/getAllMarkets'
import Link from 'next/link'

// Helper function to generate slug from question (same as in market page)
export const generateSlug = (question: string, id: number): string => {
  const baseSlug = question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .substring(0, 60) // Limit length
    .replace(/-$/, '') // Remove trailing hyphen
  
  return `${baseSlug}-${id}` || `market-${id}`
}

// Helper function to extract category from question
const extractCategory = (question = ""): string => {
  const lowerQuestion = question.toLowerCase()

  if (lowerQuestion.includes("bitcoin") || lowerQuestion.includes("crypto") || lowerQuestion.includes("ethereum") || lowerQuestion.includes("blockchain"))
    return "Crypto"
  if (lowerQuestion.includes("election") || lowerQuestion.includes("president") || lowerQuestion.includes("politics") || lowerQuestion.includes("government"))
    return "Politics"
  if (lowerQuestion.includes("stock") || lowerQuestion.includes("finance") || lowerQuestion.includes("market") || lowerQuestion.includes("investment"))
    return "Finance"
  if (lowerQuestion.includes("sports") || lowerQuestion.includes("game") || lowerQuestion.includes("team") || lowerQuestion.includes("tournament"))
    return "Sports"
  if (lowerQuestion.includes("tech") || lowerQuestion.includes("ai") || lowerQuestion.includes("software") || lowerQuestion.includes("technology"))
    return "Tech"
  if (lowerQuestion.includes("economy") || lowerQuestion.includes("gdp") || lowerQuestion.includes("inflation") || lowerQuestion.includes("economic"))
    return "Economy"
  if (lowerQuestion.includes("movie") || lowerQuestion.includes("entertainment") || lowerQuestion.includes("celebrity") || lowerQuestion.includes("film"))
    return "Entertainment"
  if (lowerQuestion.includes("science") || lowerQuestion.includes("health") || lowerQuestion.includes("research") || lowerQuestion.includes("medical"))
    return "Science"

  return "General"
}

// Convert on-chain market to frontend market format
const convertToFrontendMarket = (m: any, id: number) => {
  const question = m?.question ?? m?.title ?? `Market ${id}`
  const category = m?.category ? m.category.toUpperCase() : extractCategory(question)
  const endTime = Number(m?.endTime ?? m?.end_time ?? Math.floor(Date.now() / 1000))
  const resolutionDate = new Date(endTime * 1000)
  const now = new Date()
  const isActive = resolutionDate > now

  const totalBacking = parseFloat(m?.totalBacking ?? m?.volume ?? "0") || 0
  const yesPool = parseFloat(m?.yesPool ?? "0") || 0
  const noPool = parseFloat(m?.noPool ?? "0") || 0
  const totalPool = yesPool + noPool
  
  const yesOdds = totalPool > 0 ? (yesPool / totalPool) * 100 : 50
  const noOdds = totalPool > 0 ? (noPool / totalPool) * 100 : 50

  const slug = generateSlug(question, id)

  return {
    id: id.toString(),
    title: question,
    description: m?.description ?? question,
    category,
    yesOdds,
    noOdds,
    volume: totalBacking,
    resolutionDate: resolutionDate.toISOString(),
    slug,
    onChainData: m,
    status: m?.status ?? m?.state ?? null,
    isActive,
    daysLeft: Math.max(0, Math.ceil((resolutionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
    creator: m?.creator || "Unknown",
    totalLiquidity: totalPool
  }
}

export function MarketList() {
  const { getAllMarkets, markets, isLoading, error } = useAllMarkets()

  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `$${(vol / 1000000).toFixed(1)}m`
    if (vol >= 1000) return `$${(vol / 1000).toFixed(1)}k`
    return `$${(vol || 0).toFixed(2)}`
  }

  if (isLoading) return <div className="text-center py-8">Loading markets...</div>

  if (error) return <div className="text-center py-8 text-red-600">Error: {error}</div>

  if (markets.length === 0) return <div className="text-center py-8">No markets found</div>

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {markets.map((market, index) => {
        const formattedMarket = convertToFrontendMarket(market, index)
        
        return (
          <Link 
            key={formattedMarket.slug} 
            href={`/market/${formattedMarket.slug}`}
            className="block"
          >
            <div className="market-card p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow cursor-pointer bg-white">
              <div className="flex justify-between items-start mb-3">
                <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                  {formattedMarket.category}
                </span>
                <span className={`text-xs px-2 py-1 rounded ${
                  formattedMarket.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {formattedMarket.isActive ? 'Active' : 'Closed'}
                </span>
              </div>
              
              <h3 className="font-semibold text-lg mb-2 line-clamp-2">{formattedMarket.title}</h3>
              
              <div className="flex justify-between mb-3">
                <div className="text-center">
                  <div className="text-sm text-gray-600">YES</div>
                  <div className="font-bold text-green-600">{formattedMarket.yesOdds.toFixed(1)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">NO</div>
                  <div className="font-bold text-red-600">{formattedMarket.noOdds.toFixed(1)}%</div>
                </div>
              </div>
              
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Volume: {formatVolume(formattedMarket.volume)}</span>
                <span>{formattedMarket.daysLeft}d left</span>
              </div>
              
              <div className="text-xs text-gray-500">
                Ends: {new Date(formattedMarket.resolutionDate).toLocaleDateString()}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}