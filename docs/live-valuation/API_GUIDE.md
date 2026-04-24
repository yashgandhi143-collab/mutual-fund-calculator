# Live Portfolio Valuation - API Guide

This document explains how the Live Portfolio Valuation tool fetches market data.

## Overview

The tool uses a two-step process to get the Current Market Price (CMP) for a security given its ISIN:
1. **ISIN to Ticker**: Maps the ISIN code (e.g., `INE002A01018`) to a Ticker symbol (e.g., `RELIANCE`).
2. **Ticker to Price**: Fetches the latest price for that Ticker.

## APIs Used

### 1. Indian Stock Market Search API
Used to find the ticker symbol for a given ISIN if not found in the local mapping.

- **URL**: `https://nse-api-ruby.vercel.app/search?q={ISIN}`
- **Method**: GET
- **Response**: A JSON object containing a `results` array.

### 2. Indian Stock Market Equity Quote API
Used to get the real-time market price for a ticker symbol.

- **URL**: `https://nse-api-ruby.vercel.app/equityQuote?symbol={TICKER}`
- **Method**: GET
- **Response**: A JSON object containing OCHLV data.
  ```json
  {
    "date": "16-Oct-2023 16:00:00",
    "open": 1432.1,
    "high": 1443.6,
    "low": 1430,
    "close": 1434.15,
    "volume": 4850745
  }
  ```
  The tool uses the `close` field for the Current Market Price (CMP).

## ISIN Mapping Fallback

The tool also uses a local file `docs/assets/EQUITY_L.csv` to map ISINs to symbols. This is the primary method for resolving ISINs.

## Rate Limiting and Performance

To avoid being blocked or rate limited, the following measures are implemented:
- **Delay**: A 200ms delay is introduced between sequential API calls.
- **Caching**: Ticker symbols and price data (valid for 1 hour) are cached in the browser's `localStorage`.
- **Incremental Updates**: The UI updates row-by-row as prices are received.

## Error Handling

The tool provides simplified error messages in the "Status / Error" column:
- **"Ticker not found"**: Both the Search API and local mapping failed to find a matching ticker.
- **"Price not available"**: The Stock API returned no price data for the ticker.
- **"API returned {status}"**: The API returned an error status (e.g., 500).
- **"Network Error"**: Connection issues.
