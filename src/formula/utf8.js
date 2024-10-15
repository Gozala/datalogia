const decoder = new TextDecoder()
const encoder = new TextEncoder()

/**
 * @param {Uint8Array} value
 * @returns {Iterable<string>}
 */
export const fromUTF8 = (value) => {
  if (value instanceof Uint8Array) {
    return [decoder.decode(value)]
  } else {
    return []
  }
}

/**
 * @param {string} text
 * @returns {Iterable<Uint8Array>}
 */
export const toUTF8 = (text) => {
  if (typeof text === 'string') {
    return [encoder.encode(text)]
  } else {
    return []
  }
}
