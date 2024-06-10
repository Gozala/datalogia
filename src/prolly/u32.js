const u32 = new Uint32Array(1)
const bytes = new Uint8Array(u32.buffer)

export const byteLength = Uint32Array.BYTES_PER_ELEMENT

/**
 * @param {number} n
 */
export const toBytes = (n) => {
  u32[0] = n
  return bytes
}

/**
 * @param {Uint8Array} source
 */
export const fromBytes = (source) => {
  bytes[0] = source[0]
  bytes[1] = source[1]
  bytes[2] = source[2]
  bytes[3] = source[3]
  return u32[0]
}
