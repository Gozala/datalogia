import * as Bytes from '../bytes.js'
import * as API from './api.js'

/**
 * @typedef {object} Model
 * @property {Uint8Array} key
 */

/**
 * Compares leaf nodes to determine order
 *
 * @param {Model} left
 * @param {Model} right
 */
export const compare = (left, right) => Bytes.compare(left.key, right.key)

/**
 *
 * @param {API.Node} node
 * @returns {IterableIterator<API.Leaf>}
 */
export function* iterate(node) {
  if (node.children) {
    for (const child of node.children) {
      yield* iterate(child)
    }
  } else {
    yield node
  }
}
