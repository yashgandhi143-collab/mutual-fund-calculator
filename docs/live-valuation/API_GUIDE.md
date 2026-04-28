# Live Portfolio Valuation - API Guide

This document explains how the Live Portfolio Valuation tool fetches market data.

## Overview

The tool uses a two-step process to get the Current Market Price (CMP) for a security given its ISIN:
1. **ISIN to Ticker**: Maps the ISIN code (e.g., `INE002A01018`) to a Ticker symbol (e.g., `RELIANCE`).
2. **Ticker to Price**: Fetches the latest price for that Ticker.

## APIs Used

### 1. NSE India Equity Quote API (via CORS Proxy)
Used to get the real-time market price and daily change for a ticker symbol. Due to CORS restrictions on the official NSE India domain, requests are routed through a CORS proxy.

- **Target URL**: `https://www.nseindia.com/api/NextApi/apiClient/GetQuoteApi?functionName=getSymbolData&marketType=N&series=EQ&symbol={TICKER}`
- **Proxy used**: `https://corsproxy.io/?url=`
- **Method**: GET
- **Response**: A JSON object containing an `equityResponse` array.
  ```json
  {
    "equityResponse": [
      {
        "metaData": {
          "closePrice": 782.55,
          "pChange": -0.94,
          ...
        },
        ...
      }
    ]
  }
  ```
  The tool uses `metaData.closePrice` for the Current Market Price (CMP) and `metaData.pChange` for the daily percentage change.

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
