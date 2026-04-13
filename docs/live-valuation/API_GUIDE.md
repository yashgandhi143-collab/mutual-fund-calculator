# Live Portfolio Valuation - API Guide

This document explains how the Live Portfolio Valuation tool fetches market data.

## Overview

The tool uses a two-step process to get the Current Market Price (CMP) for a security given its ISIN:
1. **ISIN to Ticker**: Maps the ISIN code (e.g., `INF209K01157`) to a Yahoo Finance Ticker symbol (e.g., `PARAGPARIKH.NS`).
2. **Ticker to Price**: Fetches the latest price for that Ticker.

## APIs Used

### 1. Yahoo Finance Search API
Used to find the ticker symbol for a given ISIN.

- **URL**: `https://query2.finance.yahoo.com/v1/finance/search?q={ISIN}`
- **Method**: GET
- **Response**: A JSON object containing a `quotes` array. The first quote's `symbol` is used.

### 2. Yahoo Finance Chart API
Used to get the real-time market price for a ticker symbol.

- **URL**: `https://query1.finance.yahoo.com/v8/finance/chart/{TICKER}?interval=1m&range=1d`
- **Method**: GET
- **Response**: A JSON object containing `chart.result[0].meta.regularMarketPrice`.

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
- **"Symbol not found for this ISIN"**: The Search API couldn't find a matching ticker.
- **"Price data not available"**: The Chart API returned no price data for the ticker.
- **"API returned 429"**: Too many requests (Rate Limited).
- **"Network Error"**: Connection issues.
