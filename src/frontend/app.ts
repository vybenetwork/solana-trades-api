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
const programLabelCache: Record<string, string> = {};

const STABLE_QUOTE_SYMBOLS = new Set(['USD', 'USDC', 'USDT', 'PYUSD', 'USD1']);

/** Hardcoded mint → symbol; never fetch these from API. */
const HARDCODED_QUOTE_MINTS: Record<string, string> = {
  So11111111111111111111111111111111111111112: 'wSOL',
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 'USDC',
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: 'USDT',
};

/** Well-known DEX program IDs → label (used when labeled-program-account has no match). Matches token-stats repo. */
const WELL_KNOWN_PROGRAMS: Record<string, string> = {
  '675kPX9MHTjS2zt1qwr1sgbV5tjF6n5paF8GcaxHfL8r': 'Raydium',
  '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP': 'Orca',
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P': 'Pump.fun',
  'EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gje1wcB3NH': 'Orca (Whirlpool)',
  'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK': 'Raydium CLMM',
  'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C': 'Raydium CPMM',
  'Gswppe6ERWKpUTXvRPfXdzHhiCyJvLadVvXGfdpBqcE1': 'Guac Swap',
  'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY': 'Phoenix',
  'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo': 'Meteora',
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'Jupiter',
};

interface ProgramItem {
  programAddress?: string;
  name?: string;
  label?: string;
  labels?: string[];
  symbol?: string;
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

/** For 0 < n < 0.1: at most 3 digits after the leading zeros (e.g. 0.002978518 → 0.00297). Returns null otherwise. */
function fmtTrailingAfterZero(n: number): string | null {
  const abs = Math.abs(n);
  if (abs >= 0.1 || abs === 0) return null;
  const s = abs.toFixed(10);
  if (!s.startsWith('0.')) return null;
  let i = 2;
  while (i < s.length && s[i] === '0') i++;
  if (i >= s.length) return (n < 0 ? '-' : '') + s;
  const prefix = s.slice(0, i);
  const threeDigits = s.slice(i, i + 3);
  const result = (n < 0 ? '-' : '') + prefix + threeDigits;
  return result;
}

/** For 0.1 <= n < 1: at most 3 decimal places, truncated (e.g. 0.147888131 → 0.147). Returns null otherwise. */
function fmtPointOneToOne(n: number): string | null {
  const abs = Math.abs(n);
  if (abs < 0.1 || abs >= 1) return null;
  const truncated = Math.floor(n * 1000) / 1000;
  return truncated.toString();
}

function fmtMaybeNumber(v: unknown, maxFrac = 2): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '—';
  return fmtNum(n, maxFrac);
}

const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
function toSuperscript(exp: number): string {
  if (exp >= 0) return SUPERSCRIPT_DIGITS[exp] ?? String(exp);
  const s = String(exp);
  return '⁻' + s.slice(1).replace(/\d/g, (d) => SUPERSCRIPT_DIGITS[Number(d)] ?? d);
}

/** Compact form for small numbers: 0.0ⁿ + 3 digits, where ⁿ = number of zeros after 0.0 (e.g. 0.0⁸736). Returns null if not in range. */
function fmtSmallNumber(n: number): string | null {
  const abs = Math.abs(n);
  if (abs === 0 || abs >= 0.001) return null;
  const exp = Math.floor(Math.log10(abs));
  const numZeros = -exp; // e.g. 10^-8 → 8 zeros after 0.0
  const mantissa = n * 10 ** -exp;
  const rounded = Math.round(mantissa * 100) / 100;
  const digits = String(rounded.toFixed(2)).replace('.', '').replace(/0+$/, '');
  return `0.0${toSuperscript(numZeros)}${digits}`;
}

function fmtUsd(v: unknown): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '—';
  const small = fmtSmallNumber(n);
  if (small !== null) return `$${small}`;
  const trailing = fmtTrailingAfterZero(n);
  if (trailing !== null) return `$${trailing}`;
  const pointOneToOne = fmtPointOneToOne(n);
  if (pointOneToOne !== null) return `$${pointOneToOne}`;
  const abs = Math.abs(n);
  const maxFrac = abs >= 9.99 ? 0 : abs >= 1 ? 2 : 9;
  return `$${fmtNum(n, maxFrac)}`;
}

function fmtTokenAmount(v: unknown): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '—';
  const small = fmtSmallNumber(n);
  if (small !== null) return small;
  const trailing = fmtTrailingAfterZero(n);
  if (trailing !== null) return trailing;
  const pointOneToOne = fmtPointOneToOne(n);
  if (pointOneToOne !== null) return pointOneToOne;
  const abs = Math.abs(n);
  const maxFrac = abs >= 10 ? 0 : abs >= 1 ? 2 : 4;
  return fmtNum(n, maxFrac);
}

function fmtPriceAmount(v: unknown): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '—';
  const small = fmtSmallNumber(n);
  if (small !== null) return small;
  const trailing = fmtTrailingAfterZero(n);
  if (trailing !== null) return trailing;
  const pointOneToOne = fmtPointOneToOne(n);
  if (pointOneToOne !== null) return pointOneToOne;
  const abs = Math.abs(n);
  const maxFrac = abs >= 10 ? 0 : abs >= 1 ? 2 : 9;
  return fmtNum(n, maxFrac);
}

function quoteSymOrTrunc(quoteMint: string | undefined): string {
  if (!quoteMint) return '—';
  return quoteSymbolCache[quoteMint] || HARDCODED_QUOTE_MINTS[quoteMint] || truncate(quoteMint);
}

/** Show SOL instead of wSOL in the trades table. */
function displaySymbol(sym: string): string {
  return sym === 'wSOL' ? 'SOL' : sym;
}

/** Truncate symbol to first 5 characters (no ellipsis) for table display. */
function symbolMax5(sym: string): string {
  if (!sym) return sym;
  return sym.length > 5 ? sym.slice(0, 5) : sym;
}

/** Wrap amount/price HTML in a color span when symbol is USDC or SOL. */
function wrapAmountClass(html: string, sym: string): string {
  const d = displaySymbol(sym);
  if (sym === 'USDC') return `<span class="amount-usdc">${html}</span>`;
  if (d === 'SOL') return `<span class="amount-sol">${html}</span>`;
  return html;
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
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
  return `${time} ${date}`;
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

async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_FETCH_RETRIES; attempt++) {
    try {
      const res = await fetch(url, init);
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
  const limit = Number(limitSelect.value);
  if (Number.isFinite(limit)) params.set('limit', String(limit));
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
  const hardcoded = HARDCODED_QUOTE_MINTS[mint];
  if (hardcoded) {
    quoteSymbolCache[mint] = hardcoded;
    return hardcoded;
  }
  if (quoteSymbolCache[mint]) return quoteSymbolCache[mint];
  const res = await fetchWithRetry(`/api/token-symbol/${encodeURIComponent(mint)}`);
  const body = (await res.json().catch(() => ({}))) as TokenSymbolResponse;
  if (!res.ok) return undefined;
  const s = (body.symbol ?? '').trim();
  if (!s || s === mint) return undefined;
  quoteSymbolCache[mint] = s;
  return s;
}

/** Each row has baseMintAddress and quoteMintAddress. Use the one that isn't the mint being analysed. */
function otherMint(t: VybeTrade, mintBeingAnalysed: string): string {
  const base = (t.baseMintAddress ?? '').trim();
  const quote = (t.quoteMintAddress ?? '').trim();
  return base === mintBeingAnalysed ? quote : base;
}

async function ensureQuoteSymbols(trades: VybeTrade[], baseMint: string): Promise<void> {
  const unique = new Set<string>();
  for (const t of trades.slice(0, 250)) {
    const m = otherMint(t, baseMint).trim();
    if (!m || m === baseMint) continue;
    if (quoteSymbolCache[m]) continue;
    unique.add(m);
    if (unique.size >= 12) break;
  }
  for (const m of unique) {
    const s = await fetchSymbol(m);
    if (s) quoteSymbolCache[m] = s;
  }
}

/** Ensure symbol cache has base and quote mints for trades (for table input/output columns). */
async function ensureSymbolsForTrades(trades: VybeTrade[]): Promise<void> {
  const unique = new Set<string>();
  for (const t of trades.slice(0, 500)) {
    const b = (t.baseMintAddress ?? '').trim();
    const q = (t.quoteMintAddress ?? '').trim();
    if (b) unique.add(b);
    if (q) unique.add(q);
    if (unique.size >= 50) break;
  }
  for (const m of unique) {
    if (quoteSymbolCache[m]) continue;
    const s = await fetchSymbol(m);
    if (s) quoteSymbolCache[m] = s;
  }
}

/** Ensure program label cache has labels for programs in trades (for table program column). */
async function ensureProgramLabels(trades: VybeTrade[]): Promise<void> {
  const unique = new Set<string>();
  for (const t of trades.slice(0, 500)) {
    const p = (t.programAddress ?? '').trim();
    if (p) unique.add(p);
    if (unique.size >= 30) break;
  }
  for (const addr of unique) {
    if (programLabelCache[addr]) continue;
    programLabelCache[addr] = WELL_KNOWN_PROGRAMS[addr] ?? addr;
  }
  const needLabel = [...unique].filter((addr) => programLabelCache[addr] === addr);
  if (needLabel.length === 0) return;
  try {
    const r = await fetchWithRetry('/api/programs/labeled-program-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programAddresses: needLabel }),
    });
    if (r.ok) {
      const body = (await r.json().catch(() => ({}))) as { labels?: Record<string, string> };
      const labels = body.labels ?? {};
      Object.assign(programLabelCache, labels);
    }
  } catch {
    // keep WELL_KNOWN or address fallback
  }
}

/** Program column: first word only, or first + second word if second is all CAPS and 4–5 chars (e.g. CLMM, CPMM). */
function programDisplayLabel(addr: string | undefined): string {
  if (!addr) return '—';
  const label = programLabelCache[addr] ?? WELL_KNOWN_PROGRAMS[addr] ?? addr;
  if (!label || label === addr) return truncate(addr, 5, 4);
  const words = label.trim().split(/\s+/);
  const first = words[0] ?? '';
  const second = words[1];
  if (second && /^[A-Z]+$/.test(second) && second.length >= 4 && second.length <= 5) {
    return `${first} ${second}`;
  }
  return first;
}

async function renderSummaryFromTrades(trades: VybeTrade[]): Promise<void> {
  const baseMint = mintAddressInput.value.trim();
  const marketCount: Record<string, number> = {};
  const marketQuoteCount: Record<string, Record<string, number>> = {};
  trades.forEach((t) => {
    const m = (t.marketAddress ?? '').trim();
    const q = otherMint(t, baseMint);
    if (!m) return;
    marketCount[m] = (marketCount[m] ?? 0) + 1;
    if (q && q !== baseMint) {
      if (!marketQuoteCount[m]) marketQuoteCount[m] = {};
      marketQuoteCount[m][q] = (marketQuoteCount[m][q] ?? 0) + 1;
    }
  });

  const topMarketsRaw = Object.entries(marketCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([addr, count]) => {
      const quoteCounts = marketQuoteCount[addr] ?? {};
      const bestQuoteMint =
        Object.entries(quoteCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      return { marketAddress: addr, count, bestQuoteMint };
    });

  const programs = topCounts(trades.map((t) => t.programAddress), 5);
  const quotesRaw = topCounts(
    trades.map((t) => otherMint(t, baseMint)).filter((m) => m && m !== baseMint),
    20
  );

  const programLabels: Record<string, string> = {};
  programs.forEach((p) => {
    programLabels[p.key] = WELL_KNOWN_PROGRAMS[p.key] ?? p.key;
  });
  const needLabel = programs.filter((p) => !WELL_KNOWN_PROGRAMS[p.key]);
  if (needLabel.length > 0) {
    try {
      const r = await fetchWithRetry('/api/programs/labeled-program-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programAddresses: needLabel.map((p) => p.key) }),
      });
      if (r.ok) {
        const body = (await r.json().catch(() => ({}))) as { labels?: Record<string, string> };
        const labels = body.labels ?? {};
        Object.assign(programLabels, labels);
      }
    } catch {
      // keep WELL_KNOWN or address fallback
    }
  }

  const baseSymbol = (lastBaseSymbol ?? '').toUpperCase() || '—';

  const needSymbolMints = new Set<string>();
  for (const { bestQuoteMint } of topMarketsRaw) {
    if (bestQuoteMint && !quoteSymbolCache[bestQuoteMint] && !HARDCODED_QUOTE_MINTS[bestQuoteMint]) {
      needSymbolMints.add(bestQuoteMint);
    }
  }
  for (const q of quotesRaw.slice(0, 20)) {
    if (!quoteSymbolCache[q.key] && !HARDCODED_QUOTE_MINTS[q.key]) needSymbolMints.add(q.key);
  }
  const pairQuoteSymbols: Record<string, string> = { ...HARDCODED_QUOTE_MINTS, ...quoteSymbolCache };
  if (needSymbolMints.size > 0) {
    try {
      const r = await fetchWithRetry('/api/token-symbols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mints: [...needSymbolMints] }),
      });
      if (r.ok) {
        const body = (await r.json().catch(() => ({}))) as { symbols?: Record<string, string> };
        const symbols = body.symbols ?? {};
        Object.assign(pairQuoteSymbols, symbols);
        Object.assign(quoteSymbolCache, symbols);
      }
    } catch {
      // use cache only
    }
  }

  topProgramsBody.innerHTML = programs.length
    ? programs
        .map((p) => {
          const link = solscanLinkAccount(p.key, truncate(p.key, 5, 4));
          const rawLabel = programLabels[p.key];
          const hasRealLabel = rawLabel && rawLabel !== p.key;
          const displayLabel = hasRealLabel ? (rawLabel.length > 19 ? rawLabel.slice(0, 19) + '...' : rawLabel) : '';
          const labelSuffix = displayLabel ? ` (${displayLabel})` : '';
          return `<tr><td>${link}${labelSuffix}</td><td style="text-align:right">${p.count}</td></tr>`;
        })
        .join('')
    : '<tr><td>—</td><td style="text-align:right">—</td></tr>';

  const topMarketsWithPair = topMarketsRaw
    .map(({ marketAddress, count, bestQuoteMint }) => {
      const quoteSym = bestQuoteMint ? (pairQuoteSymbols[bestQuoteMint] ?? truncate(bestQuoteMint, 4, 4)) : '—';
      const pairDisplay = bestQuoteMint ? `${baseSymbol} / ${quoteSym}` : '—';
      return { marketAddress, count, pairDisplay };
    })
    .filter((m) => m.pairDisplay !== '—')
    .slice(0, 5);

  topMarketsBody.innerHTML = topMarketsWithPair.length
    ? topMarketsWithPair
        .map(({ marketAddress, count, pairDisplay }) => {
          const marketLink = solscanLinkAccount(marketAddress, truncate(marketAddress, 4, 4));
          return `<tr><td>${marketLink}</td><td>${pairDisplay}</td><td style="text-align:right">${count}</td></tr>`;
        })
        .join('')
    : '<tr><td>—</td><td>—</td><td style="text-align:right">—</td></tr>';

  const quotes = quotesRaw.filter((q) => {
    const s = pairQuoteSymbols[q.key] ?? HARDCODED_QUOTE_MINTS[q.key];
    return s && s.trim() !== '' && s !== q.key;
  }).slice(0, 5);

  topQuotesBody.innerHTML = quotes.length
    ? quotes
        .map((q) => {
          const sym = pairQuoteSymbols[q.key] ?? HARDCODED_QUOTE_MINTS[q.key] ?? '—';
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
          const inputSym = quoteSymOrTrunc(t.baseMintAddress);
          const outputSym = quoteSymOrTrunc(t.quoteMintAddress);
          const analysedMint = mintAddressInput.value.trim();
          const baseMint = (t.baseMintAddress ?? '').trim();
          const quoteMint = (t.quoteMintAddress ?? '').trim();

          const priceN = Number(t.price);
          let priceRaw: string;
          let priceSym: string;
          if (!Number.isFinite(priceN)) {
            priceRaw = '—';
            priceSym = '';
          } else if (analysedMint && quoteMint === analysedMint) {
            const inv = 1 / priceN;
            priceSym = isStableQuoteSymbol(inputSym) ? inputSym : displaySymbol(inputSym);
            const priceSymD = symbolMax5(priceSym);
            priceRaw = isStableQuoteSymbol(inputSym)
              ? `${fmtUsd(inv)} ${priceSymD}`
              : `${fmtPriceAmount(inv)} ${priceSymD}`;
          } else {
            priceSym = isStableQuoteSymbol(outputSym) ? outputSym : displaySymbol(outputSym);
            const priceSymD = symbolMax5(priceSym);
            priceRaw = isStableQuoteSymbol(outputSym)
              ? `${fmtUsd(priceN)} ${priceSymD}`
              : `${fmtPriceAmount(priceN)} ${priceSymD}`;
          }
          const price = priceSym ? wrapAmountClass(priceRaw, priceSym) : priceRaw;

          const type = !analysedMint ? '—' : baseMint === analysedMint ? 'Sell' : quoteMint === analysedMint ? 'Buy' : '—';

          const inputSymD = symbolMax5(displaySymbol(inputSym));
          const inputAmountRaw = t.baseSize != null ? `${fmtTokenAmount(t.baseSize)} ${inputSymD}` : '—';
          const inputAmount = wrapAmountClass(inputAmountRaw, inputSym);
          const outputSizeN = Number(t.quoteSize);
          const outputSymD = symbolMax5(displaySymbol(outputSym));
          const outputAmountRaw = t.quoteSize != null
            ? isStableQuoteSymbol(outputSym) && Number.isFinite(outputSizeN)
              ? `${fmtUsd(outputSizeN)} ${outputSymD}`
              : `${fmtTokenAmount(t.quoteSize)} ${outputSymD}`
            : '—';
          const outputAmount = wrapAmountClass(outputAmountRaw, outputSym);

          const otherSymbol =
            analysedMint && (baseMint === analysedMint || quoteMint === analysedMint)
              ? baseMint === analysedMint
                ? outputSymD
                : inputSymD
              : `${inputSymD}/${outputSymD}`;
          const market = t.marketAddress
            ? `<a href="${SOLSCAN_ACCOUNT}${encodeURIComponent(t.marketAddress)}" target="_blank" rel="noopener noreferrer" title="${t.marketAddress}">${truncate(t.marketAddress, 4, 4)} (${otherSymbol})</a>`
            : '—';
          const program = t.programAddress
            ? `<a href="${SOLSCAN_ACCOUNT}${encodeURIComponent(t.programAddress)}" target="_blank" rel="noopener noreferrer" title="${t.programAddress}">${programDisplayLabel(t.programAddress)}</a>`
            : '—';
          const authority = (t.authorityAddress ?? '').trim();
          const feePayer = (t.feePayerAddress ?? '').trim();
          const feePayerLink = feePayer
            ? `<span class="fee-payer-cell">(${solscanLinkAccount(feePayer, truncate(feePayer, 4, 4))})</span>`
            : '';
          const authorityFeePayer =
            !authority && !feePayer
              ? '—'
              : authority === feePayer
                ? solscanLinkAccount(authority || undefined, truncate(authority || undefined, 4, 4))
                : authority && feePayer
                  ? `${solscanLinkAccount(authority, truncate(authority, 4, 4))} ${feePayerLink}`
                  : authority
                    ? solscanLinkAccount(authority, truncate(authority, 4, 4))
                    : feePayer
                      ? feePayerLink
                      : '—';
          const txid = t.signature
            ? `<a href="${SOLSCAN_TX}${encodeURIComponent(t.signature)}" target="_blank" rel="noopener noreferrer" title="${t.signature}" class="txid-icon" aria-label="View transaction">↗</a>`
            : '—';

          return `<tr>
            <td>${time}</td>
            <td style="text-align:center">${type}</td>
            <td style="text-align:right">${price}</td>
            <td style="text-align:right">${inputAmount}</td>
            <td style="text-align:right">${outputAmount}</td>
            <td>${market}</td>
            <td>${program}</td>
            <td>${authorityFeePayer}</td>
            <td style="text-align:center">${txid}</td>
          </tr>`;
        })
        .join('')
    : '<tr><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>';
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

    // Fetch trades for summary boxes (same limit as UI).
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

    const pageFrom = parseIntOrUndefined(pageFromInput.value) ?? 0;
    const pageTo = parseIntOrUndefined(pageToInput.value);
    const pages =
      pageTo != null && pageTo > pageFrom ? Array.from({ length: pageTo - pageFrom }, (_, i) => pageFrom + i) : [pageFrom];

    let allTrades: VybeTrade[];
    const singlePage0 = pages.length === 1 && pages[0] === 0;
    const sortIsBlockTimeDesc = (sortSelect.value || 'blockTime:desc') === 'blockTime:desc';
    const canReuseSummary = summaryRes.ok && singlePage0 && sortIsBlockTimeDesc;

    if (canReuseSummary) {
      allTrades = summaryTrades;
    } else {
      allTrades = [];
      for (const p of pages) {
        const query = buildTradesQueryForTable(p);
        const url = `/api/trades?${query}`;
        const res = await fetchWithRetry(url);
        const body = (await res.json().catch(() => ({}))) as TradesResponse & { error?: string };
        if (!res.ok) {
          showError(body.error || `Failed (${res.status})`);
          lastRemoteTrades = [];
          lastFilteredTrades = [];
          renderTrades([], { remoteCount: 0, filteredCount: 0, query: '' });
          return;
        }
        const chunk = Array.isArray(body.data) ? body.data : [];
        allTrades.push(...chunk);
      }
    }

    lastRemoteTrades = allTrades;
    lastFilteredTrades = applyLocalFilters(lastRemoteTrades);
    await ensureQuoteSymbols(lastFilteredTrades, mintAddressInput.value.trim());
    await ensureSymbolsForTrades(lastFilteredTrades);
    await ensureProgramLabels(lastFilteredTrades);
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
    const limit = Number(limitSelect.value) || 250;
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

