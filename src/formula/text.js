import * as Pattern from '../pattern.js'

/**
 * @param {object} input
 * @param {string} input.text
 * @param {string} input.pattern
 * @returns {string[]}
 */
export const like = ({ text, pattern }) => {
  if (typeof text === 'string' && typeof pattern === 'string') {
    if (Pattern.compile(pattern, Pattern.GLOB).test(text)) {
      return [text]
    } else {
      return []
    }
  } else {
    return []
  }
}

/**
 * @param {[string, ...string[]]} value
 */
export const concat = (value) => {
  if (Array.isArray(value)) {
    return [value.join('')]
  } else {
    return []
  }
}

/**
 * @param {string} value
 */
export const words = (value) => {
  if (typeof value === 'string') {
    return value.split(/\s+/)
  } else {
    return []
  }
}

/**
 * @param {unknown} value
 */
export const lines = (value) => {
  if (typeof value === 'string') {
    return value.split(/\r\n|\r|\n/g)
  } else {
    return []
  }
}

/**
 * @param {unknown} value
 */
export const toUpperCase = (value) => {
  if (typeof value === 'string') {
    return [value.toUpperCase()]
  } else {
    return []
  }
}

/**
 * @param {unknown} value
 */
export const toLowerCase = (value) => {
  if (typeof value === 'string') {
    return [value.toLowerCase()]
  } else {
    return []
  }
}

/**
 * @param {unknown} value
 */
export const trim = (value) => {
  if (typeof value === 'string') {
    return [value.trim()]
  } else {
    return []
  }
}

/**
 * @param {unknown} value
 */
export const trimStart = (value) => {
  if (typeof value === 'string') {
    return [value.trimStart()]
  } else {
    return []
  }
}

/**
 * @param {unknown} value
 */
export const trimEnd = (value) => {
  if (typeof value === 'string') {
    return [value.trimEnd()]
  } else {
    return []
  }
}

/**
 * @param {unknown} value
 */
export const length = (value) => {
  if (typeof value === 'string') {
    return [value.length]
  } else {
    return []
  }
}

/**
 * @param {object} input
 * @param {string} input.text
 * @param {string} input.slice
 * @returns {string[]}
 */
export const includes = ({ text, slice }) => {
  if (text.includes(slice)) {
    return [text]
  } else {
    return []
  }
}

/**
 * @param {object} input
 * @param {string} input.text
 * @param {string} input.start
 * @param {string} input.end
 */
export const slice = ({ text, start, end }) => {
  if (typeof start === 'number' && typeof end === 'number') {
    return [text.slice(start, end)]
  } else {
    return []
  }
}
