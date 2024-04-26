import * as Bytes from '../bytes.js'
import * as U32 from './u32.js'
import * as Leaf from './leaf.js'

/**
 * @typedef {object} Model
 * @property {Uint8Array} key
 * @property {Uint8Array} digest
 */

/**
 * Compares leaf nodes to determine order
 *
 * @param {Model} left
 * @param {Model} right
 */
export const compare = (left, right) => {
  const order = Bytes.compare(left.key, right.key)
  return order === 0 ? Bytes.compare(left.digest, right.digest) : order
}

/**
 * @param {Uint8Array} digest
 * @param {number} width
 */
export const isBoundary = (digest, width) =>
  U32.fromBytes(digest) < (1n << 32n) / BigInt(width)

export const anchor = Leaf.fromBytes(new Uint8Array([]))
