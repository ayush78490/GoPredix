"use client"

import { useState } from "react"
import Header from "@/components/header"
import CreateMarketModal from "@/components/createMarketModal"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useWeb3Context } from "@/lib/wallet-context"
import Footer from "@/components/footer"
import { useRouter } from "next/navigation"
import LightRays from "@/components/LightRays"
import Particles from '@/components/particles';
import Shuffle from '@/components/Shuffle';
import AnimatedParagraphs from "@/components/animateParagraph";

export default function LandingPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const router = useRouter()

  const { account, connectWallet, isCorrectNetwork, isConnecting, isInitialized } = useWeb3Context()

  const handleExplore = () => {
    router.push("/markets")
  }

  const getPDX = () => {
    router.push("/faucetPDX")
  }

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">

      {/* Background Rays */}
      <div className="fixed inset-0 z-0">
        <LightRays
          raysOrigin="top-center"
          raysColor="#6366f1"
          raysSpeed={1.5}
          lightSpread={0.8}
          rayLength={1.2}
          followMouse={true}
          mouseInfluence={0.1}
          noiseAmount={0.1}
          distortion={0.05}
        />
      </div>


      <div className="fixed inset-0 z-5">
        <Particles
          particleColors={['#ffffff', '#ffffff']}
          particleCount={200}
          particleSpread={10}
          speed={0.1}
          particleBaseSize={100}
          moveParticlesOnHover={true}
          alphaParticles={false}
          disableRotation={false}
        />
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 bg-black/70 min-h-screen">
        <Header />

        <div className="max-w-7xl mx-auto px-4 py-8">

          {/* Web3 Initialization */}
          {!isInitialized && (
            <div className="flex justify-center items-center py-12 backdrop-blur-sm bg-card/80 rounded-lg mt-[10vh]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Initializing Gopredix...</span>
            </div>
          )}

          {/* HERO SECTION */}
          {isInitialized && (
            <section className="flex flex-col items-center justify-center text-center min-h-[70vh] mt-[8vh]">

              <button
                className="
                  px-8 py-2 rounded-full bg-cyan-300/15 text-white font-medium text-lg
                  hover:bg-[#ECFEFF] hover:text-black transition mb-[20%]
                  border border-cyan-300 glow-border
                "
                onClick={getPDX}
              >
                Get PDX
              </button>


              {/* <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-widest text-white drop-shadow-lg">
                GOPREDIX
              </h1> */}

              <div className="mb-[2%]">
                <Shuffle
              text="GOPREDIX"
              shuffleDirection="right"
              duration={0.35}
              animationMode="evenodd"
              shuffleTimes={1}
              ease="power3.out"
              stagger={0.03}
              threshold={0.1}
              triggerOnce={true}
              triggerOnHover={true}
              respectReducedMotion={true}
            />
              </div>

              {/* <p className="text-base md:text-lg text-white/80 max-w-2xl mb-10 font-mono">
                Predict the outcome of future events, trade your beliefs, and earn rewards for your accuracy.
              </p> */}

              <div className="">
                <AnimatedParagraphs
                paragraphs={[
                  "Betting on the future so you can brag about it later.",
                  "Markets powered by science, sarcasm, and questionable optimism.",
                  "If your predictions flop, dont worry. We were obviously hacked.",
                  "Fortune favors the bold, but true gains belong to the absolutely reckless.",
                ]}
              />
              </div>

              {/* Hero Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mt-10">
                <button
                  className="px-8 py-3 rounded-full bg-cyan-300/15 text-white font-medium text-lg shadow hover:bg-[#ECFEFF] hover:text-black transition border border-cyan-50"
                  onClick={handleExplore}
                >
                  Explore Markets
                </button>

                <button
                  className="px-8 py-3 rounded-full border border-[#ECFEFF] font-medium text-lg text-white bg-transparent hover:bg-[#ECFEFF] hover:text-black transition"
                  onClick={() => connectWallet()}
                >
                  Login
                </button>
              </div>
            </section>
          )}

          {/* ================================
              EMPTY SPACE (removed prediction-market section)
              ================================= */}
          <div className="h-[10vh]"></div>

          {/* --------------------------------
              HOW IT WORKS SECTION
              -------------------------------- */}
          <section className="max-w-4xl mx-auto text-center mb-24">
            <h2 className="text-3xl font-bold text-white drop-shadow-lg mb-6">
              How It Works
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl hover:scale-[1.02] transition shadow">
                <h3 className="text-xl font-semibold text-white mb-2">Create a Market</h3>
                <p className="text-white/60">
                  Define any event with a clear outcome and allow others to participate.
                </p>
              </div>

              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl hover:scale-[1.02] transition shadow">
                <h3 className="text-xl font-semibold text-white mb-2">Predict & Trade</h3>
                <p className="text-white/60">
                  Stake your belief, buy or sell positions, and react as sentiment changes.
                </p>
              </div>

              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl hover:scale-[1.02] transition shadow">
                <h3 className="text-xl font-semibold text-white mb-2">Settle & Earn</h3>
                <p className="text-white/60">
                  After results are verified, correct predictions receive rewards instantly.
                </p>
              </div>

            </div>
          </section>

          {/* --------------------------------
              INFO SECTION (NO METRICS, JUST INFORMATIVE)
              -------------------------------- */}
          <section className="max-w-4xl mx-auto text-center mb-24">
            <h2 className="text-3xl font-bold text-white drop-shadow-lg mb-4">
              A Smarter Way to Predict the Future
            </h2>

            <p className="text-white/70 max-w-3xl mx-auto leading-relaxed">
              Prediction markets turn everyday insights into valuable information.  
              Instead of guessing, you participate in markets where collective confidence
              shapes probabilities. By contributing your knowledge, you help build a more  
              accurate, community-driven outlook on real-world events — from sports and  
              politics to technology and global trends.
            </p>
          </section>

        </div>

        <Footer />

        {showCreateModal && (
          <CreateMarketModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => setShowCreateModal(false)}
          />
        )}
      </div>
    </main>
  )
}
