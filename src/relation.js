import * as API from './api.js'
import { Link } from './constant.js'
import * as Term from './term.js'
import * as Bindings from './bindings.js'
import { Constant } from './lib.js'

/**
 * @param {API.Querier} db
 * @param {API.Clause['Match'] & {}} relation
 * @param {Iterable<API.Bindings>} frames
 */
export const evaluate = function* (db, [from, relation, to], frames) {
  const operator = typeof relation === 'string' ? operators[relation] : relation

  const matches = []
  for (const frame of frames) {
    const input = resolve(from, frame)
    for (const out of operator(/** @type {any} */ (input))) {
      if (Term.is(to)) {
        const match = Bindings.unify(out, to, frame)
        if (!match.error) {
          matches.push(match.ok)
        }
      } else {
        /** @type {Record<string, API.Constant>} */
        const extension = /** @type {any} */ (out)
        let bindings = frame
        for (const [key, term] of Object.entries(to)) {
          const match = Bindings.unify(extension[key], term, frame)
          if (match.ok) {
            bindings = match.ok
          } else {
            break
          }
        }
        matches.push(bindings)
      }
    }
  }
  return matches
}

/**
 * @template {API.Terms} Terms
 * @param {Terms} terms
 * @param {API.Bindings} bindings
 * @returns {API.InferTerms<Terms>}
 */
export const resolve = (terms, bindings) =>
  /** @type {API.InferTerms<Terms>} */
  (
    Term.is(terms)
      ? Bindings.get(bindings, terms)
      : Array.isArray(terms)
        ? terms.map((term) => Bindings.get(bindings, term))
        : Object.fromEntries(
            Object.entries(terms).map(([key, term]) => [
              key,
              Bindings.get(bindings, term),
            ])
          )
  )

/**
 * @param {unknown} value
 */
export const type = (value) => {
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
      if (value instanceof Uint8Array) {
        return ['bytes']
      } else if (Link.is(value)) {
        return ['reference']
      } else {
        return []
      }
    }
  }
}

const utf8Decoder = new TextDecoder()
const utf8Encoder = new TextEncoder()

/**
 * @param {API.Constant} value
 */
export const reference = (value) => [Link.of(value)]

export const operators = {
  type,
  '@': reference,
  /**
   * @param {API.Constant} value
   */
  '==': (value) => [value],

  /**
   * @param {string[]} value
   * @returns
   */
  'string/concat': (value) => {
    if (Array.isArray(value)) {
      return [value.join('')]
    } else {
      return []
    }
  },
  /**
   * @param {unknown} value
   */
  'string/words': (value) => {
    if (typeof value === 'string') {
      return value.split(/\s+/)
    } else {
      return []
    }
  },

  /**
   * @param {unknown} value
   */
  'string/lines': (value) => {
    if (typeof value === 'string') {
      return value.split(/\r\n|\r|\n/g)
    } else {
      return []
    }
  },

  /**
   * @param {unknown} value
   */
  'string/case/upper': (value) => {
    if (typeof value === 'string') {
      return [value.toUpperCase()]
    } else {
      return []
    }
  },
  /**
   * @param {unknown} value
   */
  'string/case/lower': (value) => {
    if (typeof value === 'string') {
      return [value.toLowerCase()]
    } else {
      return []
    }
  },

  /**
   * @param {unknown} value
   */
  'string/trim': (value) => {
    if (typeof value === 'string') {
      return [value.trim()]
    } else {
      return []
    }
  },

  /**
   * @param {unknown} value
   */
  'string/trim/start': (value) => {
    if (typeof value === 'string') {
      return [value.trimStart()]
    } else {
      return []
    }
  },

  /**
   * @param {unknown} value
   */
  'string/trim/end': (value) => {
    if (typeof value === 'string') {
      return [value.trimEnd()]
    } else {
      return []
    }
  },

  /**
   * @param {unknown} value
   */
  'string/length': (value) => {
    if (typeof value === 'string') {
      return [value.length]
    } else {
      return []
    }
  },

  /**
   * @param {unknown} value
   */
  'string/from/utf8': (value) => {
    if (value instanceof Uint8Array) {
      return [utf8Decoder.decode(value)]
    } else {
      return []
    }
  },
  /**
   * @param {unknown} value
   * @returns {Uint8Array[]}
   */
  'string/to/utf8': (value) => {
    if (typeof value === 'string') {
      return [utf8Encoder.encode(value)]
    } else {
      return []
    }
  },
}
