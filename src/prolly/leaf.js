import * as API from './type.js'
import { blake3 as Blake3 } from '@noble/hashes/blake3'
import * as U32 from './u32.js'

/**
 * @typedef {object} Model
 * @property {Uint8Array} key
 * @property {Uint8Array} value
 * @property {Uint8Array} digest
 * @property {0} height
 * @property {Model} anchor
 * @property {undefined} [settings]
 */

/**
 * @param {[Uint8Array, Uint8Array]} entry
 */
export const fromEntry = ([key, value]) => create(key, value)

/**
 *
 * @param {Uint8Array} key
 * @param {Uint8Array} value
 */
export const create = (key, value) => {
  const hash = Blake3.create({})
  hash.update(U32.toBytes(key.length))
  hash.update(key)
  hash.update(U32.toBytes(value.length))
  hash.update(value)

  const digest = hash.digest()

  return new Leaf(digest, key, value)
}

/**
 * @param {Model} leaf
 * @returns {API.ByteView<Model>}
 */
export const toBytes = (leaf) => {
  const length =
    U32.byteLength + leaf.key.length + U32.byteLength + leaf.value.length
  const bytes = new Uint8Array(length)
  let offset = 0
  bytes.set(U32.toBytes(leaf.key.length), offset)
  offset += U32.byteLength
  bytes.set(leaf.key, offset)
  offset += leaf.key.length
  bytes.set(U32.toBytes(leaf.value.length), offset)
  offset += U32.byteLength
  bytes.set(leaf.value, offset)
  return bytes
}

/**
 * @param {API.ByteView<Model>} bytes
 */
export const fromBytes = (bytes) => {
  let offset = 0
  const keyLength = U32.fromBytes(bytes.slice(offset, offset + U32.byteLength))
  offset += U32.byteLength
  const key = bytes.subarray(offset, offset + keyLength)
  offset += keyLength
  const valueLength = U32.fromBytes(
    bytes.subarray(offset, offset + U32.byteLength)
  )
  offset += U32.byteLength
  const value = bytes.subarray(offset, offset + valueLength)
  offset += valueLength

  const digest = Blake3.create({}).update(bytes.subarray(0, offset)).digest()
  return new Leaf(digest, key, value)
}

export class Leaf {
  /**
   * @param {Uint8Array} digest
   * @param {Uint8Array} key
   * @param {Uint8Array} value
   */
  constructor(digest, key, value) {
    this.digest = digest
    this.key = key
    this.value = value
  }

  /** @type {0} */
  height = 0

  get anchor() {
    return this
  }

  get [0]() {
    return this.key
  }
  get [1]() {
    return this.value
  }
}
