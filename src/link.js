import * as API from './lib.js'
import * as Link from 'multiformats/link'
import * as Bytes from './bytes.js'

/**
 * @template {{} | null} T
 * @param {unknown|API.Link<T>} value
 * @returns {value is API.Link<T>}
 */
export const is = (value) =>
  value != null && /** @type {{'/'?: {}}} */ (value)['/'] instanceof Uint8Array

/**
 * @param {API.Link} self
 * @param {API.Link} other
 * @returns {boolean}
 */
export const equal = (self, other) => Bytes.equal(self['/'], other['/'])
