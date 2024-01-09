import * as API from './api.js'
import * as Link from './link.js'
import * as Bytes from './bytes.js'

/**
 * @param {API.Constant} self
 * @param {API.Constant} other
 */
export const equal = (self, other) => {
  if (self === other) {
    return true
  } else if (self instanceof Uint8Array) {
    return other instanceof Uint8Array && Bytes.equal(self, other)
  } else if (Link.is(self)) {
    return Link.is(other) && Link.equal(self, other)
  } else {
    return false
  }
}
