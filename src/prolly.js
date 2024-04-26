import * as Tree from './prolly/tree.js'
import * as CBOR from '@ipld/dag-cbor'
import * as Leaf from './prolly/leaf.js'

export { Tree }

export const DEFAULT_SETTINGS = {
  width: Tree.DEFAULT_WIDTH,
  toKey: CBOR.encode,
  toValue: CBOR.encode,
}

/**
 *
 * @param {Iterable<[unknown, unknown]>} entries
 * @param {object} [options]
 * @param {(key:unknown) => Uint8Array} [options.toKey]
 * @param {(key:unknown) => Uint8Array} [options.toValue]
 * @param {number} [options.width]
 */
export const fromEntries = (
  entries,
  {
    toKey = CBOR.encode,
    toValue = CBOR.encode,
    width = Tree.DEFAULT_WIDTH,
  } = {}
) => {
  return Tree.fromEntries(
    [...entries].map(([key, value]) => [toKey(key), toValue(value)]),
    { width }
  )
}

/**
 *
 * @param {Tree.Model} tree
 * @param {unknown} key
 * @param {unknown} value
 * @param {object} options
 * @param {(key:unknown) => Uint8Array} [options.toKey]
 * @param {(key:unknown) => Uint8Array} [options.toValue]
 * @returns {Tree.Branch}
 */
export const set = (
  tree,
  key,
  value,
  { toKey = CBOR.encode, toValue = CBOR.encode } = {}
) => Tree.insert(tree, Leaf.create(toKey(key), toValue(value)))
