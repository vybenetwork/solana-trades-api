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
**[Vybe API documentation →](https://docs.vybenetwork.com/reference/get_trade_data_program_v4?utm_source=github&utm_medium=repo&utm_campaign=solana-historical-trade-data-api)**

---

## How to Run

1. Clone this repository:
```bash
git clone https://github.com/vybenetwork/solana-historical-trade-data-api.git
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

4. Run the server + web app:
```bash
npm start
```
Then open **http://localhost:3000**. The UI shows **historical trade data** for a token in a table, with filters and **transaction export** to CSV (paginated).

## Web App / GUI

The included web app is a **Solana historical trade data** viewer with **transaction export**:

- Remote filters (Vybe query params): basic inputs + an **Advanced** section exposing the full `/v4/trades` param set.
- Local filters (no refetch): refine the loaded results in-browser (search, min price/size, market/program contains).
- Trades table: timestamp, price, sizes, market, program, signature (links open in Solscan).
- CSV export:
  - Export the current page.
  - Export across pages (paginated) up to a configurable max pages.

All trade data is fetched from vetted markets via the Vybe **trade history** endpoint (`GET /v4/trades`).

## API base and auth

- **Base URL:** `https://api.vybenetwork.xyz`
- **Headers:** `X-API-KEY: <your-api-key>`, `Accept: application/json`

## Solana endpoints and parameters

### 1. Historical trades

**`GET /v4/trades`** — Historical trade data with pagination; use for transaction export or backfill.

| Type | Name | Required | Description |
|------|------|----------|-------------|
| Query | `programAddress` | No | Filter by DEX program ID |
| Query | `baseMintAddress` | No | Filter by base token mint |
| Query | `quoteMintAddress` | No | Filter by quote token mint |
| Query | `mintAddress` | No | Filter by either base or quote token mint |
| Query | `marketAddress` | No | Filter by market/pool address (when set, base/quote mints are ignored) |
| Query | `authorityAddress` | No | Filter by authority public key |
| Query | `feePayerAddress` | No | Filter by fee payer public key |
| Query | `timeStart` | No | Start time (Unix seconds) |
| Query | `timeEnd` | No | End time (Unix seconds) |
| Query | `page` | No | Page index (0-based) |
| Query | `limit` | No | Trades per page (default/max 1000) |
| Query | `sortByAsc` | No | Sort ascending by `price` or `blockTime` |
| Query | `sortByDesc` | No | Sort descending by `price` or `blockTime` |
| Query | `resolution` | No | Deprecated/optional per docs (kept for completeness) |

### 2. Token OHLC candles

**`GET /v4/tokens/{mintAddress}/candles`** — OHLC for price context around the same period.

| Type | Name | Required | Description |
|------|------|----------|-------------|
| Path | `mintAddress` | Yes | Token mint (base58) |
| Query | `resolution` | No | Candle size: `1m`, `3m`, `5m`, `15m`, `30m`, `1h`, `2h`, `3h`, `4h`, `1d`, `1w`, `1mo`, `1y` (default `1h`) |
| Query | `timeStart` | No | Start time (Unix seconds). Default: 2 weeks ago |
| Query | `timeEnd` | No | End time (Unix seconds). Default: now |
| Query | `limit` | No | Max candles per page (default 1000) |
| Query | `page` | No | Page for pagination (0-indexed) |
| Query | `eliminateCloseToOpenGaps` | No | Boolean (default `true`) |

- [Historical Trades](https://docs.vybenetwork.com/reference/get_trade_data_program_v4)
- [Fetch OHLC Candles](https://docs.vybenetwork.com/docs/fetch-ohlc-candles)

## Code example

```typescript
import axios from 'axios';
import fs from 'node:fs';

const API = 'https://api.vybenetwork.xyz';
const headers = { 'X-API-KEY': process.env.VYBE_API_KEY, Accept: 'application/json' };

type Trade = {
  blockTime: number;
  price: string;
  baseSize: string;
  quoteSize: string;
  marketAddress: string;
  signature: string;
};

async function fetchAllTrades(baseMintAddress: string) {
  let page = 0;
  const limit = 1000;
  const all: Trade[] = [];
  while (true) {
    const { data } = await axios.get<{ data: Trade[] }>(`${API}/v4/trades`, {
      params: { baseMintAddress, limit, page, sortByDesc: 'blockTime' },
      headers,
    });
    const chunk = data.data || [];
    all.push(...chunk);
    if (chunk.length < limit) break;
    page++;
  }
  return all;
}

const tokenMint = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
fetchAllTrades(tokenMint).then((trades) => {
  const csv = ['blockTime,price,baseSize,quoteSize,marketAddress,signature']
    .concat(trades.map((t) => [t.blockTime, t.price, t.baseSize, t.quoteSize, t.marketAddress, t.signature].join(',')))
    .join('\\n');
  fs.writeFileSync('trades.csv', csv);
  console.log('Transaction export: %s trades', trades.length);
});
```

## Example Output

CSV (**transaction export**):
```csv
blockTime,price,baseSize,quoteSize,marketAddress,signature
1769454000,0.00001234,1000000,ABC123...,5KJp...
1769454100,0.00001245,500000,ABC123...,7MNq...
```

## Need Help?

Reach out to Vybe support:
- **Telegram**: [Vybe Telegram community](https://t.me/vybenetwork)
- **Support ticket**: [Submit a ticket on the Vybe website](https://vybenetwork.com)
