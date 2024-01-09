import { isLink } from 'multiformats/link'
import * as API from './api.js'

/**
 * @template {Record<string, U>} U
 * @template {API.Variant<U>} Variant
 * @param {Variant} type
 * @returns {keyof Variant}
 */
export const discriminant = (type) => {
  if (type.Boolean) {
    return 'Boolean'
  } else if (type.Bytes) {
    return 'Bytes'
  } else if (type.Float32) {
    return 'Float32'
  } else if (type.Int32) {
    return 'Int32'
  } else if (type.Int64) {
    return 'Int64'
  } else if (type.Link) {
    return 'Link'
  } else if (type.String) {
    return 'String'
  } else {
    return unreachable(`Invalid type ${type}`)
  }
}

/**
 * @param {API.Type} type
 * @param {API.Constant} value
 * @returns {API.Result<{}, TypeError>}
 */
export const check = (type, value) => {
  const other = typeOf(value)
  const result = unify(type, other)
  return result
}

/**
 * @param {API.Type} type
 * @param {API.Type} other
 * @returns {API.Result<API.Type, TypeError>}
 */
export const unify = (type, other) => {
  if (discriminant(type) === discriminant(other)) {
    return { ok: type }
  } else {
    return {
      error: new TypeError(
        `Expected ${toString(type)}, found ${toString(other)}`
      ),
    }
  }
}

/**
 * @param {API.Constant} value
 * @returns {API.Type}
 */

const typeOf = (value) => {
  switch (typeof value) {
    case 'boolean':
      return boolean
    case 'string':
      return string
    case 'number':
      return Number.isInteger(value)
        ? Int32
        : Number.isFinite(value)
          ? Float32
          : unreachable(`Invalid number ${value}`)
    case 'bigint':
      return Int64
    default: {
      if (value instanceof Uint8Array) {
        return Bytes
      } else if (isLink(value)) {
        return Link
      } else {
        return unreachable(`Invalid type ${typeof value}`)
      }
    }
  }
}

/**
 * @param {API.Type} type
 */
export const toString = (type) => discriminant(type)

/**
 * @param {string} message
 * @returns {never}
 */
const unreachable = (message) => {
  throw new Error(message)
}

export const boolean = {
  Boolean: {
    /**
     * @param {API.Constant} value
     * @returns {API.Result<boolean, RangeError>}
     */
    tryFrom: (value) => {
      if (typeof value === 'boolean') {
        return { ok: value }
      } else {
        return {
          error: new TypeError(`Expected boolean, found ${typeof value}`),
        }
      }
    },
  },
}

export const string = {
  String: {
    /**
     * @param {API.Constant} value
     * @returns {API.Result<string, RangeError>}
     */
    tryFrom(value) {
      if (typeof value === 'string') {
        return { ok: value }
      } else {
        return { error: new RangeError(`Expected number, got ${typeof value}`) }
      }
    },
  },
}
export const Int32 = {
  Int32: {
    /**
     * @param {API.Constant} value
     * @returns {API.Result<API.Int32, RangeError>}
     */
    tryFrom(value) {
      if (typeof value === 'number' && Number.isInteger(value)) {
        return { ok: /** @type {API.Int32} */ (value) }
      } else {
        return {
          error: new RangeError(`Expected Int32 instead, got ${typeof value}`),
        }
      }
    },
  },
}
export const Float32 = {
  Float32: {
    /**
     * @param {API.Constant} value
     * @returns {API.Result<API.Float32, RangeError>}
     */
    tryFrom(value) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return { ok: /** @type {API.Float32} */ (value) }
      } else {
        return {
          error: new RangeError(
            `Expected Float32 instead, got ${typeof value}`
          ),
        }
      }
    },
  },
}
export const Int64 = {
  Int64: {
    /**
     * @param {API.Constant} value
     * @returns {API.Result<API.Int64, RangeError>}
     */
    tryFrom(value) {
      if (typeof value === 'bigint') {
        return { ok: /** @type {API.Int64} */ (value) }
      } else {
        return {
          error: new RangeError(`Expected Int64 instead, got ${typeof value}`),
        }
      }
    },
  },
}
export const Bytes = {
  Bytes: {
    /**
     * @param {API.Constant} value
     * @returns {API.Result<Uint8Array, RangeError>}
     */
    tryFrom(value) {
      if (value instanceof Uint8Array) {
        return { ok: value }
      } else {
        return {
          error: new RangeError(
            `Expected Uint8Array instead, got ${typeof value}`
          ),
        }
      }
    },
  },
}

export const Link = {
  Link: {
    /**
     * @param {API.Constant} value
     * @returns {API.Result<API.Link, RangeError>}
     */
    tryFrom(value) {
      if (isLink(value)) {
        return { ok: /** @type {any} */ (value) }
      } else {
        return {
          error: new RangeError(`Expected Link instead, got ${value}`),
        }
      }
    },
  },
}
