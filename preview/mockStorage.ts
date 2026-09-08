import type { Tokens } from '../src/shared/types/api';

let current: Tokens | null = null;

export const tokenStorage = {
  async get() {
    return current;
  },
  async save(tokens: Tokens) {
    current = tokens;
  },
  async clear() {
    current = null;
  },
};
