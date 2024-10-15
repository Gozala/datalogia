import * as API from './api.js'
import { is as isLink } from './link.js'

/**
 * Checks given `value` against the given `type` and returns `true` if type
 * matches. Function can be used as [type predicate].
 *
 * [type predicate]: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates
 *
 * @example
 *
 * ```ts
 * export const demo = (value: Constant) => {
 *   if (Type.isTypeOf(Type.String, value)) {
 *     // type was narrowed down to string
 *     console.log(value.toUpperCase())
 *   }
 * }
 * ```
 *
 * @template {API.Constant} T
 * @param {API.Type<T>} type
 * @param {API.Constant} value
 * @returns {value is T}
 */
export const isTypeOf = (type, value) => !unify(type, infer(value)).error

/**
 * Checks given `value` against the given `type` and returns either an ok
 * result or type error.
 *
 * @template {API.Constant} T
 * @param {API.Type<T>} type
 * @param {API.Constant} value
 * @returns {API.Result<API.Type, TypeError>}
 */
export const check = (type, value) => unify(type, infer(value))

/**
 * Attempts to unify give types and returns error if types can not be unified
 * or the unified type.
 *
 * @param {API.Type} type
 * @param {API.Type} other
 * @returns {API.Result<API.Type, TypeError>}
 */
export const unify = (type, other) => {
  const expect = toDiscriminant(type)
  const actual = toDiscriminant(other)
  if (expect === actual) {
    return { ok: type }
  } else {
    return {
      error: new TypeError(`Expected type ${expect}, instead got ${actual}`),
    }
  }
}

/**
 * Infers the type of the given constant value. It wil throw an exception at
 * runtime if the value passed is not a constant type, which should not happen
 * if you type check the code but could if used from unchecked JS code.
 *
 * @param {API.Constant} value
 * @returns {API.Type}
 */
export const infer = (value) => {
  switch (typeof value) {
    case 'boolean':
      return Boolean
    case 'string':
      return String
    case 'bigint':
      return Int64
    case 'number':
      return Number.isInteger(value)
        ? Int32
        : Number.isFinite(value)
          ? Float32
          : unreachable(`Number ${value} can not be inferred`)
    default: {
      if (value instanceof Uint8Array) {
        return Bytes
      } else if (isLink(value)) {
        return Link
      } else if (value === null) {
        return Null
      } else {
        throw Object.assign(new TypeError(`Object types are not supported`), {
          value,
        })
      }
    }
  }
}

/**
 * Returns JSON representation of the given type.
 *
 * @template {API.Constant} T
 * @param {API.Type<T>} type
 * @returns {API.Type<T>}
 */
export const toJSON = (type) => /** @type {any} */ ({ [toString(type)]: {} })

/**
 * Returns string representation of the given type.
 *
 * @param {API.Type} type
 */
export const toString = (type) => toDiscriminant(type)

export { toJSON as inspect }

/**
 * Returns the discriminant of the given type.
 *
 * @param {API.Type} type
 * @returns {string & keyof API.Type}
 */
export const toDiscriminant = (type) => {
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
  } else if (type.Null) {
    return 'Null'
  } else {
    throw new TypeError(`Invalid type ${type}`)
  }
}

/**
 * @param {API.Type} type
 * @returns {{[Case in keyof API.Type]: [Case, Unit, {[K in Case]: Unit}]}[keyof API.Type & string] & {}}
 */
export const match = (type) => {
  if (type.Boolean) {
    return ['Boolean', type.Boolean, type]
  } else if (type.Bytes) {
    return ['Bytes', type.Bytes, type]
  } else if (type.Float32) {
    return ['Float32', type.Float32, type]
  } else if (type.Int32) {
    return ['Int32', type.Int32, type]
  } else if (type.Int64) {
    return ['Int64', type.Int64, type]
  } else if (type.Link) {
    return ['Link', type.Link, type]
  } else if (type.String) {
    return ['String', type.String, type]
  } else if (type.Null) {
    return ['Null', type.Null, type]
  } else {
    throw new TypeError(`Invalid type ${type}`)
  }
}

/**
 * @param {string} message
 * @returns {never}
 */
export const unreachable = (message) => {
  throw new Error(message)
}

export const Unit = /** @type {API.Unit} */ Object.freeze({})
export const Boolean = /** @type {API.Type<boolean>} */ ({ Boolean: Unit })
export const Int32 = /** @type {API.Type<API.Int32>} */ ({ Int32: Unit })
export const Float32 = /** @type {API.Type<API.Float32>} */ ({ Float32: Unit })
export const Int64 = /** @type {API.Type<API.Int64>} */ ({ Int64: Unit })
export const String = /** @type {API.Type<string>} */ ({ String: Unit })
export const Bytes = /** @type {API.Type<API.Bytes>} */ ({ Bytes: Unit })
export const Link = /** @type {API.Type<API.Link>} */ ({ Link: Unit })
export const Null = /** @type {API.Type<API.Null>} */ ({ Null: Unit })
