import * as Tree from './prolly/tree.js'
import * as CBOR from '@ipld/dag-cbor'
import * as Leaf from './prolly/leaf.js'
import { blake3 } from '@noble/hashes/blake3'

export { Tree }

/**
 * @typedef {object} EncodingSettings
 * @property {(key:unknown) => Uint8Array} toKey
 * @property {(value:unknown) => Uint8Array} toValue
 * @typedef {Tree.Settings & EncodingSettings} Settings
 */

/**
 * @type {Settings}
 */
export const DEFAULT_SETTINGS = {
  width: Tree.DEFAULT_WIDTH,
  toKey: CBOR.encode,
  toValue: CBOR.encode,
  digest: blake3,
}

/**
 *
 * @param {Iterable<[unknown, unknown]>} entries
 * @param {Partial<Settings>} [options]
 */
export const fromEntries = (
  entries,
  {
    toKey = DEFAULT_SETTINGS.toKey,
    toValue = DEFAULT_SETTINGS.toKey,
    digest = DEFAULT_SETTINGS.digest,
    width = DEFAULT_SETTINGS.width,
  } = {}
) => {
  return Tree.fromEntries(
    [...entries].map(([key, value]) => [toKey(key), toValue(value)]),
    { width, digest }
  )
}

/**
 *
 * @param {Tree.Model} tree
 * @param {unknown} key
 * @param {unknown} value
 * @param {Partial<EncodingSettings>} options
 * @returns {Tree.Branch}
 */
export const set = (
  tree,
  key,
  value,
  { toKey = DEFAULT_SETTINGS.toKey, toValue = DEFAULT_SETTINGS.toKey } = {}
) => Tree.insert(tree, Leaf.create(toKey(key), toValue(value)))
