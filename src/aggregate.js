import * as API from './api.js'

/**
 * @type {API.Aggregate<{ Self: number, In: number, Out: number }>}
 */
export const count = {
  init() {
    return 0
  },
  /**
   * @param {number} n
   * @param {unknown} _
   * @returns {API.Result<number, Error>}
   */
  step(n, _) {
    return { ok: n + 1 }
  },
  end(n) {
    return { ok: n }
  },
}

/**
 * @type {API.Aggregate<{ Self: number|null, In: number, Out: number }>}
 */
export const max = {
  init() {
    return null
  },
  /**
   * @param {number|null} max
   * @param {number} n
   * @returns {API.Result<number, Error>}
   */
  step(max, n) {
    return { ok: max == null ? n : Math.max(max, n) }
  },
  end(max) {
    return max == null ? { error: new Error('empty') } : { ok: max }
  },
}

/**
 * @type {API.Aggregate<{ Self: number|null, In: number, Out: number }>}
 */
export const min = {
  init() {
    return null
  },
  /**
   * @param {number|null} min
   * @param {number} n
   * @returns {API.Result<number, Error>}
   */
  step(min, n) {
    return { ok: min == null ? n : Math.min(min, n) }
  },
  end(min) {
    return min == null ? { error: new Error('empty') } : { ok: min }
  },
}

/**
 * @type {API.Aggregate<{ Self: number, In: number, Out: number }>}
 */
export const sum = {
  init() {
    return 0
  },
  /**
   * @param {number} total
   * @param {number} n
   * @returns {API.Result<number, Error>}
   */
  step(total, n) {
    return { ok: total + n }
  },
  end(total) {
    return { ok: total }
  },
}
