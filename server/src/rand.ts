import { randomInt } from 'node:crypto';

/**
 * Feeds src/game/handEvaluator.ts's shuffle()/bettingEngine.ts's createHand() —
 * their own comments say explicitly: "Sunucuda crypto.randomInt ile besle — Math.random
 * kullanma." This is that.
 */
export function cryptoRand(n: number): number {
  return randomInt(n);
}
