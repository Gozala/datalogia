import * as API from './api.js'
import * as Blake3 from '@noble/hashes/blake3'
import * as CBOR from '@ipld/dag-cbor'
import * as Digest from 'multiformats/hashes/digest'
import * as Link from 'multiformats/link'

/**
 * @param {[API.Entity, API.Attribute, API.Constant, cause?: API.Link[]]} source
 */
export const create = ([entity, attribute, value, cause = []]) =>
  new Fact(entity, attribute, value, sort(cause))

/**
 *
 * @param {API.Link[]} links
 */
const sort = (links) =>
  links.sort((left, right) => left.toString().localeCompare(right.toString()))

/**
 * @param {[API.Entity, API.Attribute, API.Constant, cause?: API.Link[]]} source
 */
export const link = ([entity, attribute, value, cause = []]) => {
  const bytes = CBOR.encode([entity, attribute, value, sort(cause)])
  const digest = Blake3.blake3(bytes)
  return Link.create(CBOR.code, Digest.create(0x1e, digest))
}

class Fact extends Array {
  get entity() {
    return this[0]
  }
  get attribute() {
    return this[1]
  }
  get value() {
    return this[2]
  }
  get cause() {
    return this[3]
  }
  get link() {
    if (!this._link) {
      this._link = link(/** @type {any} */ (this))
    }
    return this._link
  }
}
