-- Migration: Add markets table for tracking market creation dates
-- This prevents the need to scan blockchain for market creation events

-- Create markets table
CREATE TABLE IF NOT EXISTS markets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id INTEGER NOT NULL,
  payment_token TEXT NOT NULL CHECK (payment_token IN ('BNB', 'PDX')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  block_number BIGINT,
  transaction_hash TEXT,
  creator_address TEXT,
  question TEXT,
  category TEXT,
  end_time BIGINT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_market_token UNIQUE (market_id, payment_token)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_markets_market_id ON markets(market_id);
CREATE INDEX IF NOT EXISTS idx_markets_payment_token ON markets(payment_token);
CREATE INDEX IF NOT EXISTS idx_markets_created_at ON markets(created_at);
CREATE INDEX IF NOT EXISTS idx_markets_composite ON markets(market_id, payment_token);

-- Enable Row Level Security (RLS)
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- Allow anyone to read market data
CREATE POLICY "Allow public read access" ON markets
  FOR SELECT
  USING (true);

-- Allow anyone to insert market data (for market creation)
CREATE POLICY "Allow public insert" ON markets
  FOR INSERT
  WITH CHECK (true);

-- Allow updates for authenticated users
CREATE POLICY "Allow public update" ON markets
  FOR UPDATE
  USING (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_markets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER update_markets_updated_at_trigger
  BEFORE UPDATE ON markets
  FOR EACH ROW
  EXECUTE FUNCTION update_markets_updated_at();

-- Add comment to table
COMMENT ON TABLE markets IS 'Stores market creation metadata to avoid blockchain scanning for creation dates';
COMMENT ON COLUMN markets.market_id IS 'On-chain market ID';
COMMENT ON COLUMN markets.payment_token IS 'Payment token type: BNB or PDX';
COMMENT ON COLUMN markets.created_at IS 'Market creation timestamp';
COMMENT ON COLUMN markets.block_number IS 'Block number where market was created';
COMMENT ON COLUMN markets.transaction_hash IS 'Transaction hash of market creation';
