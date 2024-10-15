import * as API from '../api.js'

/**
 * @param {API.Tuple<API.Numeric>} numbers
 * @returns {API.Numeric[]}
 */
export const sum = (numbers) => {
  if (Array.isArray(numbers)) {
    let total = 0
    for (const number of numbers) {
      if (typeof number === 'number') {
        total += number
      } else {
        return []
      }
    }
    return [total]
  } else {
    return []
  }
}

/**
 * @param {number[]} numbers
 * @returns {number[]}
 */
export const subtract = (numbers) => {
  if (Array.isArray(numbers)) {
    if (numbers.length === 0) {
      return [-0]
    }

    const [first, ...rest] = numbers
    if (rest.length === 0) {
      return [-first]
    } else {
      let total = first
      for (const number of rest) {
        if (typeof number === 'number') {
          total -= number
        } else {
          return []
        }
      }
      return [total]
    }
  } else {
    return []
  }
}

/**
 * @param {number[]} numbers
 * @returns {number[]}
 */
export const multiply = (numbers) => {
  if (Array.isArray(numbers)) {
    let total = 1

    for (const number of numbers) {
      if (typeof number === 'number') {
        total *= number
      } else {
        return []
      }
    }
    return [total]
  } else {
    return []
  }
}

/**
 * @param {unknown} numbers
 * @returns {number[]}
 */
export const divide = (numbers) => {
  if (Array.isArray(numbers)) {
    if (numbers.length === 0) {
      return [1]
    }

    const [first, ...rest] = numbers
    if (rest.length === 0) {
      return [1 / first]
    } else {
      let total = first
      for (const number of rest) {
        if (typeof number === 'number' && number !== 0) {
          total /= number
        } else {
          return []
        }
      }
      return [total]
    }
  } else {
    return []
  }
}

/**
 * @param {object} input
 * @param {number} input.n
 * @param {number} input.by
 */
export const modulo = ({ n, by }) => {
  if (typeof n === 'number' && typeof by === 'number' && by !== 0) {
    return [n % by]
  } else if (typeof n === 'bigint' && typeof by === 'bigint') {
    return [n % by]
  } else {
    return []
  }
}

/**
 * @param {object} input
 * @param {number} input.base
 * @param {number} input.exponent
 */
export const power = ({ base, exponent }) => {
  if (typeof base === 'number' && typeof exponent === 'number') {
    return [base ** exponent]
  } else if (typeof base === 'bigint' && typeof exponent === 'bigint') {
    return [base ** exponent]
  } else {
    return []
  }
}

/**
 * @param {number} n
 */
export const absolute = (n) => {
  if (typeof n === 'number') {
    return [Math.abs(n)]
  } else {
    return []
  }
}
