# Solana Historical Trade Data API

A **Solana historical trade data** and **Solana trade history API** demo: fetch **historical trade data** from **Pump.fun**, **Raydium**, Orca, and 30+ DEXs with pagination, then **transaction export** to CSV. All data comes from vetted markets only—no fake trades or wash trading. This repo includes a **web app (GUI)** to view **historical trade data**, apply filters, and run **transaction export** to CSV in the browser.

## Why This Matters

**Historical trade data** and a reliable **Solana trade history API** are essential for backtesting, analytics, tax reporting, and research. Vybe’s **trade history** endpoint returns clean **historical trade data** from **Pump.fun**, **Raydium**, and other vetted Solana DEXs, with pagination so you can **transaction export** large result sets to CSV without missing data. Combining **historical trade data** with token candles gives price context around each trade. This demo uses two endpoints: the **Solana trade history API** (historical trades with pagination for **transaction export**) and token candles for the same period. The web app lets you browse **historical trade data** and trigger **transaction export** with one click.

### What You Get

- **Historical trade data** — Paginated **trade history** for any token across **Pump.fun**, **Raydium**, Orca, and 30+ DEXs.
- **Transaction export** — Export to **CSV** for **backtesting**, **tax reporting**, or research; no data cap in the demo.
- **Price context** — Optional OHLC candles for the same period so you can align **trades** with **token price**.
- **Web app** — Browse **historical trade data**, filter by time/token, and **export to CSV** from the browser.

### How This Helps

Use this demo for **backtesting**, **tax reporting**, or any app that needs **Solana trade history** or **transaction history**. The **REST API** with **pagination** supports large **transaction export** flows. All data is from vetted **DEX** markets. Get your API key and clone to run **CSV export** or plug into your own **Solana trades API** client.

---

**Get a free Vybe API key** (required to run this demo):

**[Get your free Vybe API key →](https://vybenetwork.com/pricing?utm_source=github&utm_medium=repo&utm_campaign=solana-historical-trade-data-api)**  
**[Vybe API documentation →](https://docs.vybenetwork.com/reference/get_trades_v4?utm_source=github&utm_medium=repo&utm_campaign=solana-historical-trade-data-api)**

---

## How to Run

1. Clone this repository:
```bash
git clone https://github.com/your-org/solana-historical-trade-data-api.git
cd solana-historical-trade-data-api
```

2. Install dependencies:
```bash
npm install
```

3. Set your API key:
```bash
cp .env.example .env
# Edit .env and add your VYBE_API_KEY
```

4. Run the demo (CLI):
```bash
npm start
```

5. Run the web app (GUI):
```bash
npm run dev
```
Then open **http://localhost:3000**. The UI shows **historical trade data** for a token in a table, with filters and an **Export to CSV** (**transaction export**) button.

## Web App / GUI

The included web app is a **Solana historical trade data** viewer with **transaction export**: enter a token mint and optional time range to load **historical trade data** (paginated); view trades in a table (timestamp, price, size, market, signature); **transaction export** to CSV from the browser; and optionally overlay candle data for the same period. All **historical trade data** and **transaction export** use the Vybe **Solana trade history API** in the browser.

## API base and auth

- **Base URL:** `https://api.vybenetwork.xyz`
- **Headers:** `X-API-KEY: <your-api-key>`, `Accept: application/json`

## Solana endpoints and parameters

### 1. Historical trades

**`GET /v4/trades`** — Historical trade data with pagination; use for transaction export or backfill.

| Type | Name | Required | Description |
|------|------|----------|-------------|
| Query | `tokenMintAddress` | No | Filter by base token mint (base58) |
| Query | `limit` | No | Number of trades per page (default/max may vary, e.g. 1000) |
| Query | `page` | No | Page index for pagination (0-based) |
| Query | `timeStart` | No | Start time (Unix seconds) |
| Query | `timeEnd` | No | End time (Unix seconds) |
| Query | `marketId` | No | Filter by market address |
| Query | `programAddress` | No | Filter by DEX program ID |

### 2. Token OHLC candles

**`GET /v4/tokens/{mintAddress}/candles`** — OHLC for price context around the same period.

| Type | Name | Required | Description |
|------|------|----------|-------------|
| Path | `mintAddress` | Yes | Token mint (base58) |
| Query | `resolution` | No | `1m`, `5m`, `15m`, `1h`, `4h`, `1d`, `1w`, `1y` |
| Query | `limit` | No | Number of candles |
| Query | `timeStart` | No | Start time (Unix seconds) |
| Query | `timeEnd` | No | End time (Unix seconds) |
| Query | `eliminateCloseToOpenGaps` | No | Boolean |

- [Historical Trades](https://docs.vybenetwork.com/reference/get_trades_v4)
- [Fetch OHLC Candles](https://docs.vybenetwork.com/docs/fetch-ohlc-candles)

## Code example

```javascript
const axios = require('axios');
const fs = require('fs');

const API = 'https://api.vybenetwork.xyz';
const headers = { 'X-API-KEY': process.env.VYBE_API_KEY, 'Accept': 'application/json' };

// 1) Historical trade data with pagination (for transaction export)
async function fetchAllTrades(tokenMintAddress) {
  let page = 0;
  let all = [];
  let chunk;
  do {
    const { data } = await axios.get(`${API}/v4/trades`, {
      params: { tokenMintAddress, limit: 1000, page },
      headers
    });
    chunk = data.data || [];
    all = all.concat(chunk);
    page++;
  } while (chunk.length === 1000);
  return all;
}

// 2) Token candles for same period (price context)
async function getCandles(mintAddress, timeStart, timeEnd) {
  const { data } = await axios.get(
    `${API}/v4/tokens/${mintAddress}/candles`,
    { params: { resolution: '1h', timeStart, timeEnd, limit: 500 }, headers }
  );
  return data;
}

const tokenMint = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
fetchAllTrades(tokenMint).then(trades => {
  const csv = ['timestamp,price,size,marketId,signature']
    .concat(trades.map(t => [t.blockTime, t.price, t.baseSize, t.marketId, t.signature].join(',')))
    .join('\n');
  fs.writeFileSync('trades.csv', csv);
  console.log('Transaction export: %s trades', trades.length);
});
```

## Example Output

CSV (**transaction export**):
```csv
timestamp,price,size,marketId,signature
1769454000,0.00001234,1000000,ABC123...,5KJp...
1769454100,0.00001245,500000,ABC123...,7MNq...
```

## Need Help?

Reach out to Vybe support:
- **Telegram**: [Vybe Telegram community](https://t.me/vybenetwork)
- **Support ticket**: [Submit a ticket on the Vybe website](https://vybenetwork.com)
