# Live Portfolio Valuation - API Guide

This document explains how the Live Portfolio Valuation tool fetches market data.

## Overview

The tool uses a two-step process to get the Current Market Price (CMP) for a security given its ISIN:
1. **ISIN to Ticker**: Maps the ISIN code (e.g., `INE144J01027`) to a NSE ticker symbol (e.g., `20MICRONS.NS`).
2. **Ticker to Price**: Fetches the latest price for that Ticker.

## APIs Used

### 1. NSE EQUITY_L CSV
Used to map the ISIN code to a NSE ticker symbol.

- **URL**: `https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv`
- **Method**: GET (Fetched via CORS Proxy)
- **Mapping**: Column index 6 (ISIN) is mapped to column index 0 (Symbol). A `.NS` suffix is appended to the symbol.

### 2. Financial Modeling Prep Profile API
Used to get the real-time market price for a ticker symbol.

- **URL**: `https://financialmodelingprep.com/stable/profile?symbol={TICKER}&apikey={API_KEY}`
- **Method**: GET
- **Response**: A JSON array containing an object with a `price` property. We use `data[0].price`.

**Note**: The API Key is provided by the user via the input field in the tool's interface.

## CORS Proxy

Since these APIs do not support CORS (Cross-Origin Resource Sharing) for direct browser requests, we use a proxy:

- **Proxy**: `https://api.allorigins.win/raw?url=`
- **Usage**: The target API URL is encoded and appended to the proxy URL.

## Rate Limiting and Performance

To avoid being blocked by Yahoo Finance or the proxy, the following measures are implemented:
- **Delay**: A 500ms delay is introduced between sequential API calls.
- **Caching**: Ticker symbols are cached in memory once fetched for an ISIN.
- **Incremental Updates**: The UI updates row-by-row as prices are received.

## Error Handling

The tool provides simplified error messages in the "Status / Error" column:
- **"Symbol not found in NSE mapping for this ISIN"**: The ISIN was not found in the NSE EQUITY_L CSV.
- **"Price data not available"**: The Profile API returned no price data for the ticker.
- **"API returned 429"**: Too many requests (Rate Limited).
- **"Network Error"**: Connection issues.
