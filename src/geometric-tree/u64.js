import * as API from './api.js'

/**
 * Returns the base 2 logarithm of the given `n`, rounded down.
 *
 * @param {API.uint64} n
 * @returns {number}
 */
export const log2Floor = (n) => {
  let result = 0n
  while ((n >>= 1n)) result++
  return Number(result)
}

/**
 * Return the integer logarithm with ceiling for 64 bit unsigned ints.
 *
 * @param {API.uint64} n
 */
export const log2Ceil = (n) => (n <= 1n ? 0 : log2Floor(BigInt(n) - 1n) + 1)
