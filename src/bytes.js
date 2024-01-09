/**
 * @param {Uint8Array} self
 * @param {Uint8Array} other
 * @returns {boolean}
 */
export const equal = (self, other) => {
  let length = self.byteLength
  if (length === other.byteLength) {
    // If both expected and actual have `byteLength` property we assume they are
    // Uint8Array's and proceed with byte by byte comparison. This assumption may
    // be incorrect if at runtime type requirements are not upheld, but we don't
    // we do not support that use case.
    const source = self
    const target = other
    let offset = 0
    while (offset < length) {
      if (source[offset] !== target[offset]) {
        return false
      }
      offset++
    }
    return true
  } else {
    return false
  }
}
