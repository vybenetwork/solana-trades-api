/**
 * Historical trades UI — built from TypeScript; compiles to public/app.js.
 * No imports to keep a single-file build (tsc emits one script).
 */

interface VybeTrade {
  authorityAddress?: string;
  feePayerAddress?: string;
  baseMintAddress?: string;
  quoteMintAddress?: string;
  marketAddress?: string;
  programAddress?: string;
  signature?: string;
  blockTime?: number;
  price?: string;
  baseSize?: string;
  quoteSize?: string;
  [key: string]: unknown;
}

interface TradesResponse {
  data?: VybeTrade[];
  [key: string]: unknown;
}

interface VybeToken {
  mintAddress: string;
  symbol?: string;
  name?: string;
  logoUrl?: string;
  decimal?: number;
  decimals?: number;
  verified?: boolean;
  category?: string;
  subcategory?: string;
  price?: number;
  marketCap?: number;
  usdValueVolume24h?: number;
  tokenAmountVolume24h?: number;
  updateTime?: number;
  holders?: number;
  [key: string]: unknown;
}

interface TokenSymbolResponse {
  symbol?: string;
  error?: string;
}

const mintAddressInput = document.getElementById('mintAddress') as HTMLInputElement;
const timeStartInput = document.getElementById('timeStart') as HTMLInputElement;
const timeEndInput = document.getElementById('timeEnd') as HTMLInputElement;
const limitSelect = document.getElementById('limit') as HTMLSelectElement;
const sortSelect = document.getElementById('sort') as HTMLSelectElement;
const pageFromInput = document.getElementById('pageFrom') as HTMLInputElement;
const pageToInput = document.getElementById('pageTo') as HTMLInputElement;
const maxPagesInput = document.getElementById('maxPages') as HTMLInputElement;

const fetchBtn = document.getElementById('fetchBtn') as HTMLButtonElement;
const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
const exportAllBtn = document.getElementById('exportAllBtn') as HTMLButtonElement;
const loadingIndicator = document.getElementById('loadingIndicator') as HTMLElement;

const baseMintAddressInput = document.getElementById('baseMintAddress') as HTMLInputElement;
const quoteMintAddressInput = document.getElementById('quoteMintAddress') as HTMLInputElement;
const marketAddressInput = document.getElementById('marketAddress') as HTMLInputElement;
const programAddressInput = document.getElementById('programAddress') as HTMLInputElement;
const authorityAddressInput = document.getElementById('authorityAddress') as HTMLInputElement;
const feePayerAddressInput = document.getElementById('feePayerAddress') as HTMLInputElement;
const resolutionInput = document.getElementById('resolution') as HTMLInputElement;

const searchInput = document.getElementById('search') as HTMLInputElement;
const localMarketInput = document.getElementById('localMarket') as HTMLInputElement;
const localProgramInput = document.getElementById('localProgram') as HTMLInputElement;
const minPriceInput = document.getElementById('minPrice') as HTMLInputElement;
const minBaseSizeInput = document.getElementById('minBaseSize') as HTMLInputElement;
const minQuoteSizeInput = document.getElementById('minQuoteSize') as HTMLInputElement;

const tradesError = document.getElementById('tradesError') as HTMLElement;
const tradesMeta = document.getElementById('tradesMeta') as HTMLElement;
const tradesBody = document.getElementById('tradesBody') as HTMLElement;

const tokenLoading = document.getElementById('tokenLoading') as HTMLElement;
const tokenError = document.getElementById('tokenError') as HTMLElement;
const tokenLogo = document.getElementById('tokenLogo') as HTMLImageElement;
const tokenSymbol = document.getElementById('tokenSymbol') as HTMLElement;
const tokenName = document.getElementById('tokenName') as HTMLElement;
const tokenMint = document.getElementById('tokenMint') as HTMLElement;
const tokenDecimals = document.getElementById('tokenDecimals') as HTMLElement;
const tokenVerified = document.getElementById('tokenVerified') as HTMLElement;
const tokenCategory = document.getElementById('tokenCategory') as HTMLElement;
const tokenPriceUsd = document.getElementById('tokenPriceUsd') as HTMLElement;
const tokenMarketCapUsd = document.getElementById('tokenMarketCapUsd') as HTMLElement;
const tokenVolume24hUsd = document.getElementById('tokenVolume24hUsd') as HTMLElement;
const tokenVolume24hToken = document.getElementById('tokenVolume24hToken') as HTMLElement;
const tokenUpdateTime = document.getElementById('tokenUpdateTime') as HTMLElement;

const summaryLoading = document.getElementById('summaryLoading') as HTMLElement;
const summaryError = document.getElementById('summaryError') as HTMLElement;
const summaryTitle = document.getElementById('summaryTitle') as HTMLElement;
const summaryMeta = document.getElementById('summaryMeta') as HTMLElement;
const topProgramsBody = document.getElementById('topProgramsBody') as HTMLElement;
const topMarketsBody = document.getElementById('topMarketsBody') as HTMLElement;
const topQuotesBody = document.getElementById('topQuotesBody') as HTMLElement;

const SOLSCAN_TX = 'https://solscan.io/tx/';
const SOLSCAN_ACCOUNT = 'https://solscan.io/account/';

const MAX_FETCH_RETRIES = 5;
const FETCH_RETRY_DELAY_MS = 2000;

let lastRemoteTrades: VybeTrade[] = [];
let lastFilteredTrades: VybeTrade[] = [];
let lastBaseSymbol: string | undefined;
const quoteSymbolCache: Record<string, string> = {};

const STABLE_QUOTE_SYMBOLS = new Set(['USD', 'USDC', 'USDT', 'PYUSD', 'USD1']);

/** Well-known DEX program IDs → label (used when /api/programs has no match). */
const WELL_KNOWN_PROGRAMS: Record<string, string> = {
  '675kPX9MHTjS2zt1qwr1sgbV5tjF6n5paF8GcaxHfL8r': 'Raydium',
  '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP': 'Orca',
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P': 'Pump.fun',
  'EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gje1wcB3NH': 'Orca (Whirlpool)',
  'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK': 'Raydium CLMM',
  'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY': 'Phoenix',
  'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo': 'Meteora',
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'Jupiter',
};

interface ProgramsResponse {
  data?: { id?: string; address?: string; programAddress?: string; name?: string; label?: string; symbol?: string }[];
  programs?: { id?: string; address?: string; programAddress?: string; name?: string; label?: string; symbol?: string }[];
}

function showInlineError(el: HTMLElement, msg: string): void {
  el.textContent = msg;
  el.hidden = false;
  el.removeAttribute('aria-hidden');
}

function clearInlineError(el: HTMLElement): void {
  el.textContent = '';
  el.hidden = true;
  el.setAttribute('aria-hidden', 'true');
}

function showError(msg: string): void {
  tradesError.textContent = msg;
  tradesError.hidden = false;
  tradesError.removeAttribute('aria-hidden');
}

function clearError(): void {
  tradesError.textContent = '';
  tradesError.hidden = true;
  tradesError.setAttribute('aria-hidden', 'true');
}

function truncate(s: string | undefined, front = 4, back = 4): string {
  if (!s) return '—';
  if (s.length <= front + back + 4) return s;
  return s.slice(0, front) + '....' + s.slice(-back);
}

function fmtNum(n: number, maxFrac: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}

function fmtMaybeNumber(v: unknown, maxFrac = 2): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '—';
  return fmtNum(n, maxFrac);
}

function fmtTokenAmount(v: unknown): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const maxFrac = abs >= 10 ? 0 : abs >= 1 ? 2 : 4;
  return fmtNum(n, maxFrac);
}

function fmtUsd(v: unknown): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  // Rules:
  // - >= 9.99 USD: show no decimals
  // - 1..9.99 USD: show up to 2 decimals
  // - < 1 USD: show higher precision (up to 9 decimals), no trailing zeros
  const maxFrac = abs >= 9.99 ? 0 : abs >= 1 ? 2 : 9;
  return `$${fmtNum(n, maxFrac)}`;
}

function fmtPriceAmount(v: unknown): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const maxFrac = abs >= 10 ? 0 : abs >= 1 ? 2 : 9;
  return fmtNum(n, maxFrac);
}

function quoteSymOrTrunc(quoteMint: string | undefined): string {
  if (!quoteMint) return '—';
  return quoteSymbolCache[quoteMint] || truncate(quoteMint);
}

function isStableQuoteSymbol(sym: string): boolean {
  return STABLE_QUOTE_SYMBOLS.has(sym.toUpperCase());
}

function solscanLinkAccount(addr: string | undefined, text?: string): string {
  if (!addr) return '—';
  const href = SOLSCAN_ACCOUNT + encodeURIComponent(addr);
  const label = text ?? truncate(addr, 3, 3);
  return `<a href="${href}" target="_blank" rel="noopener noreferrer" title="${addr}">${label}</a>`;
}

function formatTime(blockTime: number | undefined): string {
  if (!blockTime) return '—';
  const d = new Date(blockTime * 1000);
  return d.toLocaleString();
}

function parseUnixSecondsFromDatetimeLocal(v: string): number | undefined {
  const raw = (v ?? '').trim();
  if (!raw) return undefined;
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return undefined;
  return Math.floor(ms / 1000);
}

function parseNumberOrUndefined(v: string): number | undefined {
  const raw = (v ?? '').trim();
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function parseIntOrUndefined(v: string): number | undefined {
  const n = parseNumberOrUndefined(v);
  if (n == null) return undefined;
  return Math.max(0, Math.trunc(n));
}

async function fetchWithRetry(url: string): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_FETCH_RETRIES; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        throw new Error(`HTTP ${res.status}`);
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_FETCH_RETRIES) {
        await new Promise((r) => setTimeout(r, FETCH_RETRY_DELAY_MS));
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr;
}

function buildTradesParamsBase(): URLSearchParams {
  const params = new URLSearchParams();

  const mintAddress = mintAddressInput.value.trim();
  if (mintAddress) params.set('mintAddress', mintAddress);

  const timeStart = parseUnixSecondsFromDatetimeLocal(timeStartInput.value);
  if (timeStart != null) params.set('timeStart', String(timeStart));
  const timeEnd = parseUnixSecondsFromDatetimeLocal(timeEndInput.value);
  if (timeEnd != null) params.set('timeEnd', String(timeEnd));

  // Advanced params (only when set)
  const baseMintAddress = baseMintAddressInput.value.trim();
  if (baseMintAddress) params.set('baseMintAddress', baseMintAddress);
  const quoteMintAddress = quoteMintAddressInput.value.trim();
  if (quoteMintAddress) params.set('quoteMintAddress', quoteMintAddress);
  const marketAddress = marketAddressInput.value.trim();
  if (marketAddress) params.set('marketAddress', marketAddress);
  const programAddress = programAddressInput.value.trim();
  if (programAddress) params.set('programAddress', programAddress);
  const authorityAddress = authorityAddressInput.value.trim();
  if (authorityAddress) params.set('authorityAddress', authorityAddress);
  const feePayerAddress = feePayerAddressInput.value.trim();
  if (feePayerAddress) params.set('feePayerAddress', feePayerAddress);
  const resolution = resolutionInput.value.trim();
  if (resolution) params.set('resolution', resolution);

  return params;
}

function buildTradesQueryForTable(pageOverride?: number): string {
  const params = buildTradesParamsBase();
  const limit = Number(limitSelect.value);
  if (Number.isFinite(limit)) params.set('limit', String(limit));
  const page =
    pageOverride != null ? Math.max(0, Math.trunc(pageOverride)) : Math.max(0, Math.trunc(Number(pageFromInput.value || '0')));
  params.set('page', String(page));

  const [sortField, sortDir] = (sortSelect.value || 'blockTime:desc').split(':');
  if (sortField && sortDir === 'asc') params.set('sortByAsc', sortField);
  if (sortField && sortDir === 'desc') params.set('sortByDesc', sortField);

  return params.toString();
}

function buildTradesQueryForSummary(): string {
  const params = buildTradesParamsBase();
  params.set('limit', '1000');
  params.set('page', '0');
  params.set('sortByDesc', 'blockTime');
  params.delete('sortByAsc');
  return params.toString();
}

function applyLocalFilters(trades: VybeTrade[]): VybeTrade[] {
  const search = searchInput.value.trim().toLowerCase();
  const localMarket = localMarketInput.value.trim().toLowerCase();
  const localProgram = localProgramInput.value.trim().toLowerCase();
  const minPrice = parseNumberOrUndefined(minPriceInput.value);
  const minBaseSize = parseNumberOrUndefined(minBaseSizeInput.value);
  const minQuoteSize = parseNumberOrUndefined(minQuoteSizeInput.value);

  return trades.filter((t) => {
    if (search) {
      const hay = [
        t.signature,
        t.marketAddress,
        t.programAddress,
        t.authorityAddress,
        t.feePayerAddress,
        t.baseMintAddress,
        t.quoteMintAddress,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(search)) return false;
    }

    if (localMarket) {
      const m = (t.marketAddress ?? '').toLowerCase();
      if (!m.includes(localMarket)) return false;
    }

    if (localProgram) {
      const p = (t.programAddress ?? '').toLowerCase();
      if (!p.includes(localProgram)) return false;
    }

    if (minPrice != null) {
      const p = Number(t.price);
      if (!Number.isFinite(p) || p < minPrice) return false;
    }

    if (minBaseSize != null) {
      const s = Number(t.baseSize);
      if (!Number.isFinite(s) || s < minBaseSize) return false;
    }

    if (minQuoteSize != null) {
      const s = Number(t.quoteSize);
      if (!Number.isFinite(s) || s < minQuoteSize) return false;
    }

    return true;
  });
}

function renderTokenEmpty(): void {
  tokenLogo.style.display = 'none';
  tokenLogo.src = '';
  tokenLogo.alt = '';
  tokenSymbol.textContent = '—';
  tokenName.textContent = '—';
  tokenMint.textContent = '—';
  tokenDecimals.textContent = '—';
  tokenVerified.textContent = '—';
  tokenCategory.textContent = '—';
  tokenPriceUsd.textContent = '—';
  tokenMarketCapUsd.textContent = '—';
  tokenVolume24hUsd.textContent = '—';
  tokenVolume24hToken.textContent = '—';
  tokenUpdateTime.textContent = '—';
}

function renderSummaryEmpty(): void {
  summaryMeta.textContent = '—';
  topProgramsBody.innerHTML = '<tr><td>—</td><td style="text-align:right">—</td></tr>';
  topMarketsBody.innerHTML = '<tr><td>—</td><td>—</td><td style="text-align:right">—</td></tr>';
  topQuotesBody.innerHTML =
    '<tr><td>—</td><td>—</td><td style="text-align:right">—</td></tr>';
}

function topCounts(items: Array<string | undefined>, n: number): Array<{ key: string; count: number }> {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = (it ?? '').trim();
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return Array.from(m.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

async function fetchTokenMeta(mint: string): Promise<void> {
  renderTokenEmpty();
  clearInlineError(tokenError);
  if (!mint) return;

  tokenLoading.hidden = false;
  tokenLoading.setAttribute('aria-hidden', 'false');
  try {
    const res = await fetchWithRetry(`/api/tokens/${encodeURIComponent(mint)}`);
    const body = (await res.json().catch(() => ({}))) as VybeToken & { error?: string };
    if (!res.ok) {
      showInlineError(tokenError, body.error || `Failed (${res.status})`);
      return;
    }

    const symbol = body.symbol?.trim() || '—';
    tokenSymbol.textContent = symbol;
    tokenName.textContent = body.name?.trim() || '—';
    tokenMint.innerHTML = solscanLinkAccount(body.mintAddress || mint, body.mintAddress || mint);
    tokenDecimals.textContent =
      body.decimals != null ? String(body.decimals) : body.decimal != null ? String(body.decimal) : '—';
    tokenVerified.textContent = body.verified === true ? 'Yes' : body.verified === false ? 'No' : '—';
    tokenCategory.textContent = body.category?.trim() || '—';
    tokenPriceUsd.textContent = fmtUsd(body.price);
    tokenMarketCapUsd.textContent = fmtUsd(body.marketCap);
    tokenVolume24hUsd.textContent = fmtUsd(body.usdValueVolume24h);
    tokenVolume24hToken.textContent = fmtMaybeNumber(body.tokenAmountVolume24h, 2) + (symbol !== '—' ? ` ${symbol}` : '');
    tokenUpdateTime.textContent = body.updateTime ? new Date(body.updateTime * 1000).toLocaleString() : '—';

    lastBaseSymbol = symbol !== '—' ? symbol : undefined;

    const logo = (body.logoUrl ?? '').trim();
    if (logo) {
      tokenLogo.src = logo;
      tokenLogo.alt = body.name?.trim() || symbol;
      tokenLogo.style.display = 'block';
    }
  } catch (err) {
    showInlineError(tokenError, err instanceof Error ? err.message : String(err));
  } finally {
    tokenLoading.hidden = true;
    tokenLoading.setAttribute('aria-hidden', 'true');
  }
}

async function fetchSymbol(mint: string): Promise<string | undefined> {
  const res = await fetchWithRetry(`/api/token-symbol/${encodeURIComponent(mint)}`);
  const body = (await res.json().catch(() => ({}))) as TokenSymbolResponse;
  if (!res.ok) return undefined;
  const s = (body.symbol ?? '').trim();
  if (!s || s === mint) return undefined;
  return s;
}

async function ensureQuoteSymbols(trades: VybeTrade[]): Promise<void> {
  const unique = new Set<string>();
  for (const t of trades.slice(0, 250)) {
    const m = (t.quoteMintAddress ?? '').trim();
    if (!m) continue;
    if (quoteSymbolCache[m]) continue;
    unique.add(m);
    if (unique.size >= 12) break;
  }
  for (const m of unique) {
    const s = await fetchSymbol(m);
    if (s) quoteSymbolCache[m] = s;
  }
}

async function renderSummaryFromTrades(trades: VybeTrade[]): Promise<void> {
  const baseMint = mintAddressInput.value.trim();
  const marketCount: Record<string, number> = {};
  const marketQuoteCount: Record<string, Record<string, number>> = {};
  trades.forEach((t) => {
    const m = (t.marketAddress ?? '').trim();
    const q = (t.quoteMintAddress ?? '').trim();
    if (!m) return;
    marketCount[m] = (marketCount[m] ?? 0) + 1;
    if (q && q !== baseMint) {
      if (!marketQuoteCount[m]) marketQuoteCount[m] = {};
      marketQuoteCount[m][q] = (marketQuoteCount[m][q] ?? 0) + 1;
    }
  });

  const topMarketsWithPair = Object.entries(marketCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([addr, count]) => {
      const quoteCounts = marketQuoteCount[addr] ?? {};
      const bestQuoteMint =
        Object.entries(quoteCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      return { marketAddress: addr, count, bestQuoteMint };
    });

  const programs = topCounts(trades.map((t) => t.programAddress), 5);
  const quotes = topCounts(trades.map((t) => t.quoteMintAddress), 5);

  let programLabels: Record<string, string> = {};
  try {
    const progRes = await fetchWithRetry('/api/programs');
    const progBody = (await progRes.json().catch(() => ({}))) as ProgramsResponse;
    const list = progBody.data ?? progBody.programs ?? [];
    if (Array.isArray(list)) {
      list.forEach((p) => {
        const id = (p.id ?? p.address ?? p.programAddress ?? '').trim();
        const name = (p.name ?? p.label ?? p.symbol ?? '').trim();
        if (id && name) programLabels[id] = name;
      });
    }
    programs.forEach((p) => {
      if (!programLabels[p.key]) programLabels[p.key] = WELL_KNOWN_PROGRAMS[p.key] ?? p.key;
    });
  } catch {
    programs.forEach((p) => {
      programLabels[p.key] = WELL_KNOWN_PROGRAMS[p.key] ?? p.key;
    });
  }

  const baseSymbol = (lastBaseSymbol ?? '').toUpperCase() || '—';

  topProgramsBody.innerHTML = programs.length
    ? programs
        .map((p) => {
          const link = solscanLinkAccount(p.key, truncate(p.key, 5, 4));
          const label = programLabels[p.key];
          const labelSuffix = label && label !== p.key ? ` (${label})` : '';
          return `<tr><td>${link}${labelSuffix}</td><td style="text-align:right">${p.count}</td></tr>`;
        })
        .join('')
    : '<tr><td>—</td><td style="text-align:right">—</td></tr>';

  const pairQuoteSymbols: Record<string, string> = { ...quoteSymbolCache };
  for (const { bestQuoteMint } of topMarketsWithPair) {
    if (bestQuoteMint && !pairQuoteSymbols[bestQuoteMint]) {
      const s = await fetchSymbol(bestQuoteMint);
      if (s) pairQuoteSymbols[bestQuoteMint] = s;
    }
  }

  topMarketsBody.innerHTML = topMarketsWithPair.length
    ? topMarketsWithPair
        .map(({ marketAddress, count, bestQuoteMint }) => {
          const marketLink = solscanLinkAccount(marketAddress, truncate(marketAddress, 4, 4));
          const quoteSym = bestQuoteMint ? (pairQuoteSymbols[bestQuoteMint] ?? truncate(bestQuoteMint, 4, 4)) : '—';
          const pairDisplay = bestQuoteMint ? `${baseSymbol} / ${quoteSym}` : '—';
          return `<tr><td>${marketLink}</td><td>${pairDisplay}</td><td style="text-align:right">${count}</td></tr>`;
        })
        .join('')
    : '<tr><td>—</td><td>—</td><td style="text-align:right">—</td></tr>';

  const symbols: Record<string, string> = {};
  for (const q of quotes) {
    const s = await fetchSymbol(q.key);
    if (s) symbols[q.key] = s;
  }

  topQuotesBody.innerHTML = quotes.length
    ? quotes
        .map((q) => {
          const sym = symbols[q.key] ?? '—';
          const mint = solscanLinkAccount(q.key, truncate(q.key, 4, 4));
          return `<tr>
            <td>${sym}</td>
            <td>${mint}</td>
            <td style="text-align:right">${q.count}</td>
          </tr>`;
        })
        .join('')
    : '<tr><td>—</td><td>—</td><td style="text-align:right">—</td></tr>';
}

function renderTrades(trades: VybeTrade[], meta: { remoteCount: number; filteredCount: number; query: string }): void {
  tradesMeta.textContent = `Remote: ${meta.remoteCount} trade(s). Showing: ${meta.filteredCount} after local filters.`;

  tradesBody.innerHTML = trades.length
    ? trades
        .map((t) => {
          const time = formatTime(t.blockTime);
          const mint = mintAddressInput.value.trim();
          const baseSym = lastBaseSymbol || (mint ? truncate(mint) : '—');
          const quoteSym = quoteSymOrTrunc(t.quoteMintAddress);

          const priceN = Number(t.price);
          const price = Number.isFinite(priceN)
            ? isStableQuoteSymbol(quoteSym)
              ? `${fmtUsd(priceN)} USD`
              : `${fmtPriceAmount(priceN)} ${quoteSym}`
            : '—';

          const baseSize = t.baseSize != null ? `${fmtTokenAmount(t.baseSize)} ${baseSym}` : '—';
          const quoteSizeN = Number(t.quoteSize);
          const quoteSize = t.quoteSize != null
            ? isStableQuoteSymbol(quoteSym) && Number.isFinite(quoteSizeN)
              ? `${fmtUsd(quoteSizeN)} USD`
              : `${fmtTokenAmount(t.quoteSize)} ${quoteSym}`
            : '—';

          const market = t.marketAddress
            ? `<a href="${SOLSCAN_ACCOUNT}${encodeURIComponent(t.marketAddress)}" target="_blank" rel="noopener noreferrer" title="${t.marketAddress}">${truncate(t.marketAddress, 4, 4)}</a>`
            : '—';
          const program = t.programAddress
            ? `<a href="${SOLSCAN_ACCOUNT}${encodeURIComponent(t.programAddress)}" target="_blank" rel="noopener noreferrer" title="${t.programAddress}">${truncate(t.programAddress, 5, 4)}</a>`
            : '—';
          const sig = t.signature
            ? `<a href="${SOLSCAN_TX}${encodeURIComponent(t.signature)}" target="_blank" rel="noopener noreferrer" title="${t.signature}">${truncate(t.signature, 3, 3)}</a>`
            : '—';

          return `<tr>
            <td>${time}</td>
            <td style="text-align:right">${price}</td>
            <td style="text-align:right">${baseSize}</td>
            <td style="text-align:right">${quoteSize}</td>
            <td>${market}</td>
            <td>${program}</td>
            <td>${sig}</td>
          </tr>`;
        })
        .join('')
    : '<tr><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>';
}

function toCsv(trades: VybeTrade[]): string {
  const header = [
    'blockTime',
    'price',
    'baseSize',
    'quoteSize',
    'baseMintAddress',
    'quoteMintAddress',
    'marketAddress',
    'programAddress',
    'authorityAddress',
    'feePayerAddress',
    'signature',
  ];
  const rows = trades.map((t) =>
    [
      t.blockTime ?? '',
      t.price ?? '',
      t.baseSize ?? '',
      t.quoteSize ?? '',
      t.baseMintAddress ?? '',
      t.quoteMintAddress ?? '',
      t.marketAddress ?? '',
      t.programAddress ?? '',
      t.authorityAddress ?? '',
      t.feePayerAddress ?? '',
      t.signature ?? '',
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );
  return [header.join(','), ...rows].join('\n');
}

function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function onFetch(): Promise<void> {
  clearError();
  clearInlineError(summaryError);
  clearInlineError(tokenError);
  fetchBtn.disabled = true;
  exportBtn.disabled = true;
  exportAllBtn.disabled = true;
  loadingIndicator.hidden = false;
  loadingIndicator.setAttribute('aria-hidden', 'false');

  try {
    // Reset UI back to empty placeholders before fetching.
    renderTokenEmpty();
    renderSummaryEmpty();

    const mint = mintAddressInput.value.trim();

    // Fire-and-forget token metadata; should not block trades table.
    void fetchTokenMeta(mint);

    // Fetch last 1000 trades (for summary boxes).
    summaryLoading.hidden = false;
    summaryLoading.setAttribute('aria-hidden', 'false');
    const summaryQuery = buildTradesQueryForSummary();
    const summaryRes = await fetchWithRetry(`/api/trades?${summaryQuery}`);
    const summaryBody = (await summaryRes.json().catch(() => ({}))) as TradesResponse & { error?: string };
    const summaryTrades = summaryRes.ok && Array.isArray(summaryBody.data) ? summaryBody.data : [];
    if (!summaryRes.ok) {
      showInlineError(summaryError, summaryBody.error || `Failed (${summaryRes.status})`);
      summaryMeta.textContent = '—';
      summaryTitle.textContent = 'Summary unavailable';
    } else {
      summaryTitle.textContent = `Last ${summaryTrades.length} trades summary`;
      summaryMeta.textContent = `From last ${summaryTrades.length} trades: top 5 programs / pools / quote mints.`;
      await renderSummaryFromTrades(summaryTrades);
    }

    summaryLoading.hidden = true;
    summaryLoading.setAttribute('aria-hidden', 'true');

    // Fetch trades for the main table:
    // - If "to" is unset: fetch a single page (pageFrom).
    // - If "to" is set: fetch pages [pageFrom, pageTo) (end-exclusive).
    const pageFrom = parseIntOrUndefined(pageFromInput.value) ?? 0;
    const pageTo = parseIntOrUndefined(pageToInput.value);
    const pages =
      pageTo != null && pageTo > pageFrom ? Array.from({ length: pageTo - pageFrom }, (_, i) => pageFrom + i) : [pageFrom];

    const allTrades: VybeTrade[] = [];
    for (const p of pages) {
      const query = buildTradesQueryForTable(p);
      const url = `/api/trades?${query}`;
      const res = await fetchWithRetry(url);
      const body = (await res.json().catch(() => ({}))) as TradesResponse & { error?: string };
      if (!res.ok) {
        showError(body.error || `Failed (${res.status})`);
        lastRemoteTrades = [];
        lastFilteredTrades = [];
        renderTrades([], { remoteCount: 0, filteredCount: 0, query });
        return;
      }
      const chunk = Array.isArray(body.data) ? body.data : [];
      allTrades.push(...chunk);
    }

    lastRemoteTrades = allTrades;
    lastFilteredTrades = applyLocalFilters(lastRemoteTrades);
    await ensureQuoteSymbols(lastFilteredTrades);
    renderTrades(lastFilteredTrades, {
      remoteCount: lastRemoteTrades.length,
      filteredCount: lastFilteredTrades.length,
      query: pages.length > 1 ? `pages=${pageFrom}..${pageTo}` : `page=${pageFrom}`,
    });
    exportBtn.disabled = lastFilteredTrades.length === 0;
    exportAllBtn.disabled = lastRemoteTrades.length === 0;
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err));
  } finally {
    fetchBtn.disabled = false;
    loadingIndicator.hidden = true;
    loadingIndicator.setAttribute('aria-hidden', 'true');
  }
}

function onLocalFilterChange(): void {
  lastFilteredTrades = applyLocalFilters(lastRemoteTrades);
  renderTrades(lastFilteredTrades, {
    remoteCount: lastRemoteTrades.length,
    filteredCount: lastFilteredTrades.length,
    query: '',
  });
  exportBtn.disabled = lastFilteredTrades.length === 0;
}

fetchBtn.addEventListener('click', () => {
  void onFetch();
});

exportBtn.addEventListener('click', () => {
  const page = Math.max(0, Math.trunc(Number(pageFromInput.value || '0')));
  const csv = toCsv(lastFilteredTrades);
  downloadCsv(`trades-page-${page}.csv`, csv);
});

exportAllBtn.addEventListener('click', async () => {
  clearError();
  exportAllBtn.disabled = true;
  loadingIndicator.hidden = false;
  loadingIndicator.setAttribute('aria-hidden', 'false');

  try {
    const query = buildTradesQueryForTable();
    const limit = Number(limitSelect.value) || 1000;
    const maxPages = Math.max(1, Math.trunc(Number(maxPagesInput.value || '50')));

    // Export pulls pages starting from pageFrom.
    const startPage = Math.max(0, Math.trunc(Number(pageFromInput.value || '0')));
    const all: VybeTrade[] = [];

    for (let i = 0; i < maxPages; i++) {
      const page = startPage + i;
      const qs = new URLSearchParams(query);
      qs.set('page', String(page));
      qs.set('limit', String(limit));
      const res = await fetchWithRetry(`/api/trades?${qs.toString()}`);
      const body = (await res.json().catch(() => ({}))) as TradesResponse & { error?: string };
      if (!res.ok) throw new Error(body.error || `Failed (${res.status})`);

      const chunk = Array.isArray(body.data) ? body.data : [];
      all.push(...chunk);

      // Done when a page returns fewer than limit.
      if (chunk.length < limit) break;
    }

    const filtered = applyLocalFilters(all);
    const csv = toCsv(filtered);
    downloadCsv(`trades-export-${startPage}-pages.csv`, csv);
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err));
  } finally {
    loadingIndicator.hidden = true;
    loadingIndicator.setAttribute('aria-hidden', 'true');
    exportAllBtn.disabled = lastRemoteTrades.length === 0;
  }
});

searchInput.addEventListener('input', onLocalFilterChange);
localMarketInput.addEventListener('input', onLocalFilterChange);
localProgramInput.addEventListener('input', onLocalFilterChange);
minPriceInput.addEventListener('input', onLocalFilterChange);
minBaseSizeInput.addEventListener('input', onLocalFilterChange);
minQuoteSizeInput.addEventListener('input', onLocalFilterChange);

// Initial empty state
renderTrades([], { remoteCount: 0, filteredCount: 0, query: '' });
renderTokenEmpty();
renderSummaryEmpty();
clearError();

