/**
 * Express server: proxies Vybe trade history API and serves the web GUI.
 */

import express, { type Request, type Response } from 'express';
import { loadEnv, getApiKey, PUBLIC_DIR } from './config.js';
import { createClient } from './api/index.js';
import { toHumanReadableError } from './api/client.js';
import type { GetTradesParams, TradesSortField } from './api/trades.js';

loadEnv();
const apiKey = getApiKey();
console.log('VYBE_API_KEY loaded (length %d)', apiKey.length);

const app = express();
const client = createClient(apiKey);

app.use(express.static(PUBLIC_DIR));

function q(req: Request, key: string): string {
  const v = req.query[key];
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) {
    const first = v[0];
    return typeof first === 'string' ? first : '';
  }
  return '';
}

function qNum(req: Request, key: string): number | undefined {
  const raw = q(req, key).trim();
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

app.get('/api/tokens/:mint', async (req: Request, res: Response) => {
  try {
    const rawMint = req.params.mint;
    const mint = (Array.isArray(rawMint) ? rawMint[0] : rawMint ?? '').trim();
    if (!mint) return res.status(400).json({ error: 'Mint address required' });
    const token = await client.getToken(mint);
    res.json(token);
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status ?? 500;
    res.status(status).json({ error: toHumanReadableError(err) });
  }
});

app.get('/api/token-symbol/:mint', async (req: Request, res: Response) => {
  try {
    const rawMint = req.params.mint;
    const mint = (Array.isArray(rawMint) ? rawMint[0] : rawMint ?? '').trim();
    if (!mint) return res.status(400).json({ error: 'Mint address required' });
    const token = await client.getToken(mint);
    const symbol = (token.symbol ?? '').trim();
    res.json({ symbol: symbol || mint });
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status ?? 500;
    res.status(status).json({ error: toHumanReadableError(err), symbol: Array.isArray(req.params.mint) ? req.params.mint[0] : req.params.mint });
  }
});

app.get('/api/trades', async (req: Request, res: Response) => {
  try {
    const sortByAsc = q(req, 'sortByAsc').trim() as TradesSortField | '';
    const sortByDesc = q(req, 'sortByDesc').trim() as TradesSortField | '';
    if (sortByAsc && sortByDesc) {
      return res.status(400).json({ error: 'Only one of sortByAsc or sortByDesc can be set.' });
    }

    const limitRaw = qNum(req, 'limit');
    const limit = limitRaw != null ? Math.min(Math.max(0, limitRaw), 1000) : undefined;
    const pageRaw = qNum(req, 'page');
    const page = pageRaw != null ? Math.max(0, Math.trunc(pageRaw)) : undefined;

    const marketAddress = q(req, 'marketAddress').trim();

    const params: GetTradesParams = {
      programAddress: q(req, 'programAddress').trim() || undefined,
      baseMintAddress: q(req, 'baseMintAddress').trim() || undefined,
      quoteMintAddress: q(req, 'quoteMintAddress').trim() || undefined,
      mintAddress: q(req, 'mintAddress').trim() || undefined,
      marketAddress: marketAddress || undefined,
      authorityAddress: q(req, 'authorityAddress').trim() || undefined,
      feePayerAddress: q(req, 'feePayerAddress').trim() || undefined,
      resolution: q(req, 'resolution').trim() || undefined,
      timeStart: qNum(req, 'timeStart'),
      timeEnd: qNum(req, 'timeEnd'),
      page,
      limit,
      sortByAsc: sortByAsc || undefined,
      sortByDesc: sortByDesc || undefined,
    };

    // Per API docs: when marketAddress is provided, baseMintAddress/quoteMintAddress are ignored.
    if (params.marketAddress) {
      delete params.baseMintAddress;
      delete params.quoteMintAddress;
    }

    const data = await client.getTrades(params);
    res.json(data);
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status ?? 500;
    res.status(status).json({ error: toHumanReadableError(err) });
  }
});

app.get('/api/programs/labeled-program-account', async (req: Request, res: Response) => {
  try {
    const programAddress = q(req, 'programAddress').trim();
    if (!programAddress) return res.status(400).json({ error: 'programAddress query required' });
    const data = await client.getLabeledProgramAccount(programAddress);
    res.json(data);
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status ?? 500;
    res.status(status).json({ error: toHumanReadableError(err) });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Open in browser to view historical trades.');
});

