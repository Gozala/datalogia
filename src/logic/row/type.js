// @ts-nocheck

import * as API from '../../api.js'
import * as Type from '../../type.js'

/**
 * @param {API.RowType} type
 * @returns {type is { Any: API.RowType['Any'] & {} }}
 */
export const isAny = (type) => type.Any != null

class AnyRow {
  /**
   * @param {API.Constant} value
   */
  tryFrom(value) {
    return { ok: value }
  }

  get Any() {
    return this
  }
}

export const Any = new AnyRow()

/**
 * @param {API.RowType} type
 * @param {API.Constant} value
 * @returns {API.Result<{}, TypeError>}
 */
export const check = (type, value) => {
  if (isAny(type)) {
    return { ok: {} }
  } else {
    return Type.satisfies(type, value)
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

/**
 * @param {API.RowType} type
 */
export const inspect = (type) =>
  isAny(type) ? { Type: {} } : Type.inspect(type)
