/**
 * Vybe API client: single entry point wiring the API modules.
 */

import { createHttpClient } from './client.js';
import { getToken } from './tokens.js';
import { getPrograms, getTrades, type GetTradesParams } from './trades.js';
import type { VybeProgramsResponse, VybeToken, VybeTradesResponse } from '../types/api.js';

export interface VybeClient {
  getToken(mintAddress: string): Promise<VybeToken>;
  getTrades(params: GetTradesParams): Promise<VybeTradesResponse>;
  getPrograms(): Promise<VybeProgramsResponse>;
}

export function createClient(apiKey: string): VybeClient {
  const http = createHttpClient(apiKey);
  return {
    getToken: (mintAddress: string) => getToken(http, mintAddress),
    getTrades: (params: GetTradesParams) => getTrades(http, params),
    getPrograms: () => getPrograms(http),
  };
}

