/**
 * Fixed physical seating for the hot-seat table. IDs never change identity between
 * hands — only `hierarchy` (relative to whoever currently holds the kütük) does,
 * recomputed each deal in useHotSeatTable.
 */
export const SEAT_IDS = ['baris', 'deniz', 'umut', 'ceren', 'kerem'] as const;
export type SeatId = (typeof SEAT_IDS)[number];

export const SEAT_NAMES: Record<SeatId, string> = {
  baris: 'Barış',
  deniz: 'Deniz',
  umut: 'Umut',
  ceren: 'Ceren',
  kerem: 'Kerem',
};
