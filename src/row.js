import * as API from './api.js'
import * as Type from './type.js'

/**
 * @template {API.RowType} RowType
 */
class Row {
  /**
   * @param {object} source
   * @param {RowType} source.type
   * @param {API.RowID} source.id
   */
  constructor({ type, id }) {
    this.id = id
    this.type = type
  }
}

/**
 * @template {API.RowType} RowType
 * @param {object} source
 * @param {RowType} source.type
 * @param {API.RowID} source.id
 */

export const create = (source) => new Row(source)

export const Any = {
  Any: {
    /**
     * @param {API.Constant} value
     */
    tryFrom: (value) => ({ ok: value }),
  },
}

/**
 *
 * @param {API.RowType} type
 * @returns {type is { Any: {} }}
 */
export const isAny = (type) => type.Any != null

/**
 * @param {API.RowType} type
 * @param {API.Constant} value
 * @returns {API.Result<{}, TypeError>}
 */
export const check = (type, value) => {
  if (isAny(type)) {
    return { ok: {} }
  } else {
    return Type.check(type, value)
  }
}

/**
 * @param {API.RowType} type
 * @param {API.RowType} other
 * @returns {API.Result<API.RowType, TypeError>}
 */
export const unify = (type, other) => {
  if (isAny(type)) {
    return { ok: other }
  } else if (isAny(other)) {
    return { ok: type }
  } else {
    return Type.unify(type, other)
  }
}

/**
 * @param {API.RowType} type
 * @param {API.RowType} to
 * @returns {API.Result<API.RowType, TypeError>}
 */
export const downcast = (type, to) => {
  if (isAny(type)) {
    return { ok: to }
  } else if (type === to) {
    return { ok: to }
  } else {
    return {
      error: new TypeError(
        `Can not downcast ${toString(type)} to ${toString(to)}`
      ),
    }
  }
}

/**
 * @param {API.RowType} type
 */

export const toString = (type) => {
  if (isAny(type)) {
    return 'Any'
  } else {
    return Type.toString(type)
  }
}
