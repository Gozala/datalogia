import * as API from '../api.js'
import { Link } from '../constant.js'

/**
 * @param {API.Constant} operand
 */
export const is = (operand) => [operand]

export const type =
  /**
   * @param {API.Constant} value
   * @returns {API.TypeName[]}
   */
  (value) => {
    switch (typeof value) {
      case 'boolean':
        return ['boolean']
      case 'string':
        return ['string']
      case 'bigint':
        return ['int64']
      case 'number':
        return Number.isInteger(value)
          ? ['int32']
          : Number.isFinite(value)
            ? ['float32']
            : []
      default: {
        if (value === null) {
          return ['null']
        } else if (value instanceof Uint8Array) {
          return ['bytes']
        } else if (Link.is(value)) {
          return ['reference']
        } else {
          return []
        }
      }
    }
  }

/**
 * @template {API.Constant|Record<string, API.Constant>} T
 * @param {T} data
 */
export const refer = (data) => [Link.of(data)]
