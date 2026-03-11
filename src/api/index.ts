/**
 * Vybe API client: single entry point wiring the API modules.
 */

import { createHttpClient } from './client.js';
import { getToken } from './tokens.js';
import { getLabeledProgramAccount, getTrades, type GetTradesParams } from './trades.js';
import { getTopHolders, type GetTopHoldersParams } from './top-holders.js';
import type { VybeProgramsResponse, VybeToken, VybeTradesResponse, VybeTopHoldersResponse } from '../types/api.js';

export interface VybeClient {
  getToken(mintAddress: string): Promise<VybeToken>;
  getTrades(params: GetTradesParams): Promise<VybeTradesResponse>;
  getLabeledProgramAccount(programAddress: string): Promise<VybeProgramsResponse>;
  getTopHolders(mintAddress: string, params?: GetTopHoldersParams): Promise<VybeTopHoldersResponse>;
}

export function createClient(apiKey: string): VybeClient {
  const http = createHttpClient(apiKey);
  return {
    getToken: (mintAddress: string) => getToken(http, mintAddress),
    getTrades: (params: GetTradesParams) => getTrades(http, params),
    getLabeledProgramAccount: (programAddress: string) => getLabeledProgramAccount(http, programAddress),
    getTopHolders: (mintAddress: string, params?: GetTopHoldersParams) => getTopHolders(http, mintAddress, params),
  };
}

