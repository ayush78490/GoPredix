// components/footer.tsx
import Link from "next/link"
import { ExternalLink, Twitter, Github, Mail, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-background/0">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="mb-4">
              <h3 className="text-xl font-bold">Prediction Markets</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Trade your predictions on major events. Buy YES or NO tokens based on your beliefs about the future.
              </p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" size="icon" asChild>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
                  <Twitter className="w-4 h-4" />
                </a>
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                  <Github className="w-4 h-4" />
                </a>
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a href="mailto:contact@predictionmarkets.com">
                  <Mail className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="font-semibold mb-4">Platform</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/markets" className="text-muted-foreground hover:text-foreground transition-colors">
                  All Markets
                </Link>
              </li>
              <li>
                <Link href="/create" className="text-muted-foreground hover:text-foreground transition-colors">
                  Create Market
                </Link>
              </li>
              <li>
                <Link href="/portfolio" className="text-muted-foreground hover:text-foreground transition-colors">
                  My Portfolio
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="text-muted-foreground hover:text-foreground transition-colors">
                  Leaderboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a 
                  href="/docs" 
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center"
                >
                  Documentation
                  <ArrowUpRight className="w-3 h-3 ml-1" />
                </a>
              </li>
              <li>
                <a 
                  href="/guides" 
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center"
                >
                  How It Works
                  <ArrowUpRight className="w-3 h-3 ml-1" />
                </a>
              </li>
              <li>
                <a 
                  href="/faq" 
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center"
                >
                  FAQ
                  <ArrowUpRight className="w-3 h-3 ml-1" />
                </a>
              </li>
              <li>
                <a 
                  href="/tutorial" 
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center"
                >
                  Trading Tutorial
                  <ArrowUpRight className="w-3 h-3 ml-1" />
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/disclaimer" className="text-muted-foreground hover:text-foreground transition-colors">
                  Risk Disclaimer
                </Link>
              </li>
              <li>
                <a 
                  href="/audit" 
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center"
                >
                  Security Audit
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-muted-foreground mb-4 md:mb-0">
            © {currentYear} Prediction Markets. All rights reserved.
          </div>
          
          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Network: BSC Testnet</span>
            </div>
            <a 
              href="https://bscscan.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors flex items-center"
            >
              View on Explorer
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
        </div>

        {/* Risk Warning */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            <strong>Risk Warning:</strong> Prediction markets involve significant risk. Only trade with funds you can afford to lose. 
            Prices can be volatile and you may lose your entire investment. This platform is for educational and experimental purposes only.
          </p>
        </div>
      </div>
    </footer>
  )
}