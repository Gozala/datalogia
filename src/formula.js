import * as API from './api.js'
import { Link } from './constant.js'
import * as Term from './term.js'
import * as Bindings from './bindings.js'
import { Var } from './lib.js'
import * as Data from './formula/data.js'
import * as Text from './formula/text.js'
import * as Math from './formula/math.js'
import * as UTF8 from './formula/utf8.js'

/**
 * @param {API.Querier} db
 * @param {API.Clause['Match'] & {}} formula
 * @param {Iterable<API.Bindings>} frames
 */
export const evaluate = function* (db, [from, relation, to], frames) {
  const operator =
    /** @type {(input: API.Operand) => Iterable<API.Operand>} */
    (typeof relation === 'string' ? operators[relation] : relation)

  const matches = []
  for (const frame of frames) {
    const input = resolve(/** @type {API.Terms} */ (from), frame)
    for (const out of operator(input)) {
      if (to == null) {
        matches.push(frame)
      } else if (Term.is(to)) {
        const match = Bindings.unify(/** @type {API.Term} */ (out), to, frame)
        if (!match.error) {
          matches.push(match.ok)
        }
      } else {
        const extension = /** @type {Record<string, API.Constant>} */ (out)
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
 * @param {API.Constant} value
 * @returns {[API.Link]}
 */
export const reference = (value) => [Link.of(value)]

export const operators = {
  '==': Data.is,
  'data/type': Data.type,
  'data/refer': Data.refer,
  'text/like': Text.like,
  'text/concat': Text.concat,
  'text/words': Text.words,
  'text/lines': Text.lines,
  'text/case/upper': Text.toUpperCase,
  'text/case/lower': Text.toLowerCase,
  'text/trim': Text.trim,
  'text/trim/start': Text.trimStart,
  'text/trim/end': Text.trimEnd,
  'text/includes': Text.includes,
  'text/slice': Text.slice,
  'text/length': Text.length,
  'text/to/utf8': UTF8.toUTF8,
  'utf8/to/text': UTF8.fromUTF8,
  '+': Math.sum,
  '-': Math.subtract,
  '*': Math.multiply,
  '/': Math.divide,
  '%': Math.modulo,
  '**': Math.power,
  'math/absolute': Math.absolute,
}

/**
 * Iterates over the variables in the given relation.
 *
 * @param {API.Clause['Match'] & {}} relation
 * @returns {Iterable<API.Variable>}
 */
export const variables = function* ([from, _relation, to]) {
  if (Var.is(from)) {
    yield from
  } else if (Array.isArray(from)) {
    for (const term of from) {
      if (Var.is(term)) {
        yield term
      }
    }
  }

  if (Var.is(to)) {
    yield to
  }
}
