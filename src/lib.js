import * as API from './api.js'
import * as Variable from './variable.js'
import { isBlank, dependencies } from './dsl.js'
import * as Rule from './rule.js'
import * as Bindings from './bindings.js'
import { entries } from './object.js'
import { equal } from './constant.js'

export * from './api.js'
export * as Memory from './memory.js'
export { when } from './when.js'
export * from './dsl.js'
export * as Constant from './constant.js'
export { Rule }
export { API }

const ENTITY = 0
const ATTRIBUTE = 1
const VALUE = 2

/**
 * @template {API.Selector} Selection
 * @param {API.Querier} db
 * @param {object} source
 * @param {Selection} source.select
 * @param {Iterable<API.Clause>} source.where
 * @returns {API.InferBindings<Selection>[]}
 */
export const query = (db, { select, where }) => {
  const patterns = []

  /**
   * Selected fields may not explicitly appear in the where clause. To
   * illustrate consider following example
   *
   * @example
   *
   * ```ts
   * const Movie = entity({
   *    title: Schema.string(),
   *     year: Schema.number()
   * })
   *
   * const movie = new Movie()
   * const result = query(db, {
   *    select: {
   *      title: movie.title,
   *      year: movie.year
   *  },
   *  where: [movie.year.is(2000)]
   * })
   * ```
   *
   * Query `where` does not contain any references to `movie.title` therefor
   * query engine is not going to collect corresponding facts. However since
   * we do want values for `movie.title` we will add relation per selected
   * attribute to make force engine to collect facts for them.
   *
   * 🫣 This is not ideal solution as in the example above we do use
   * `movie.year` so we do not actually need another relation here. Instead we
   * could collect missing attributes when materializing the results reducing
   * unnecessary work. However this is something that can be optimized later.
   */
  for (const variable of Object.values(select)) {
    for (const clause of dependencies(variable)) {
      patterns.push(clause)
    }
  }

  const matches = evaluate(db, {
    and: [...where, ...patterns],
  })

  return [...matches].map((match) =>
    materialize(select, /** @type {API.InferBindings<Selection>} */ (match))
  )
}

/**
 *
 * @param {API.Pattern} pattern
 * @returns {API.Clause}
 */
export const match = (pattern) => ({
  match: pattern,
})

/**
 * @template {API.Selector} Selection
 * @param {Selection} select
 * @param {API.InferBindings<Selection>} bindings
 * @returns {API.InferBindings<Selection>}
 */
const materialize = (select, bindings) =>
  /** @type {API.InferBindings<Selection>} */
  (
    Object.fromEntries(
      entries(select).map(([name, term]) => [
        name,
        Bindings.get(bindings, term),
      ])
    )
  )

/**
 *
 * @param {API.Querier} db
 * @param {API.Clause} query
 * @param {Iterable<API.Bindings>} frames
 * @returns {Iterable<API.Bindings>}
 */
export const evaluate = function* (db, query, frames = [{}]) {
  if (query.or) {
    yield* evaluateOr(db, query.or, frames)
  } else if (query.and) {
    yield* evaluateAnd(db, query.and, frames)
  } else if (query.not) {
    yield* evaluateNot(db, query.not, frames)
  } else if (query.when) {
    yield* evaluateWhen(db, query.when, frames)
  } else if (query.apply) {
    yield* evaluateRule(db, query.apply, frames)
  } else {
    yield* evaluateMatch(db, query.match, frames)
  }
}

/**
 * Takes conjunct queries and frames and returns extended frames.
 *
 *
 * @param {API.Querier} db
 * @param {API.Clause[]} conjuncts
 * @param {Iterable<API.Bindings>} frames
 */
export const evaluateAnd = function* (db, conjuncts, frames) {
  for (const query of conjuncts) {
    frames = evaluate(db, query, frames)
  }

  yield* frames
}

/**
 *
 * @param {API.Querier} db
 * @param {API.Clause} operand
 * @param {Iterable<API.Bindings>} frames
 */
export const evaluateNot = function* (db, operand, frames) {
  for (const frame of frames) {
    if (isEmpty(evaluate(db, operand, [frame]))) {
      yield frame
    }
  }
}

/**
 * This is a filter similar to `evaluateNot`, each frame is is used to
 * materialize an input for the predicate function. If predicate returns an
 * error frame is filtered out otherwise it is passed through.
 *
 * TODO: Currently unbound (frame) variables would get filtered out, however
 * we should instead throw an exception as query is invalid.
 *
 * @param {API.Querier} db
 * @param {API.When} predicate
 * @param {Iterable<API.Bindings>} bindings
 */
export const evaluateWhen = function* (db, predicate, bindings) {
  for (const frame of bindings) {
    if (!predicate.match(frame).error) {
      yield frame
    }
  }
}

/**
 * @param {Iterable<unknown>} iterable
 */
const isEmpty = (iterable) => {
  for (const _ of iterable) {
    return false
  }
  return true
}

/**
 * Takes disjunct queries and frames and returns extended frames.
 *
 * @param {API.Querier} db
 * @param {API.Clause[]} disjuncts
 * @param {Iterable<API.Bindings>} frames
 */
export const evaluateOr = function* (db, disjuncts, frames) {
  // We copy iterable here because first disjunct will consume all the frames
  // and subsequent ones will not have any frames to work with otherwise.
  frames = [...frames]
  for (const query of disjuncts) {
    yield* evaluate(db, query, frames)
  }
}

/**
 *
 * @param {API.Querier} db
 * @param {API.Clause['match'] & {}} pattern
 * @param {Iterable<API.Bindings>} frames
 */

const evaluateMatch = function* (db, pattern, frames) {
  // We collect facts to avoid reaching for the db on each frame.
  const facts = [...iterateFacts(db, pattern)]
  for (const bindings of frames) {
    for (const fact of facts) {
      yield* matchFact(fact, pattern, bindings)
    }
  }
}

/**
 *
 * @param {API.Querier} db
 * @param {API.Clause['apply'] & {}} rule
 * @param {Iterable<API.Bindings>} frames
 */
const evaluateRule = function* (db, rule, frames) {
  for (const bindings of frames) {
    yield* matchRule(db, rule, bindings)
  }
}

/**
 * @param {API.Querier} db
 * @param {API.Pattern} pattern
 */
const iterateFacts = (db, [entity, attribute, value]) =>
  db.facts({
    entity: Variable.is(entity) ? undefined : entity,
    attribute: Variable.is(attribute) ? undefined : attribute,
    value: Variable.is(value) ? undefined : value,
  })

/**
 * Attempts to match given `fact` against the given `pattern`, if it matches
 * yields extended `frame` with values for all the pattern variables otherwise
 * yields no frames.
 *
 * @param {API.Fact} fact
 * @param {API.Pattern} pattern
 * @param {API.Bindings} bindings
 */
const matchFact = function* (fact, pattern, bindings) {
  const result = matchPattern(pattern, fact, bindings)
  if (result.ok) {
    yield result.ok
  }
}

/**
 *
 * @param {API.Pattern} pattern
 * @param {API.Fact} fact
 * @param {API.Bindings} bindings
 * @returns {API.Result<API.Bindings, Error>}
 */
const matchPattern = (pattern, [entity, attribute, value], bindings) => {
  let result = matchTerm(pattern[ENTITY], entity, bindings)
  result = result.error
    ? result
    : matchTerm(pattern[ATTRIBUTE], attribute, result.ok)

  result = result.error ? result : matchTerm(pattern[VALUE], value, result.ok)

  return result
}

/**
 * Attempts to match given `term` against the given fact `value`, if `value`
 * matches the term returns succeeds with extended `frame` otherwise returns
 * an error.
 *
 * @param {API.Term} term
 * @param {API.Constant} value
 * @param {API.Bindings} bindings
 * @returns {API.Result<API.Bindings, Error>}
 */
const matchTerm = (term, value, bindings) =>
  // We have a special `_` variable that matches anything. Unlike all other
  // variables it is not unified across all the relations which is why we treat
  // it differently and do add no bindings for it.
  isBlank(term)
    ? { ok: bindings }
    : // All other variables get unified which is why we attempt to match them
      // against the data in the current state.
      Variable.is(term)
      ? matchVariable(term, value, bindings)
      : // If term is a constant we simply ensure that it matches the data.
        matchConstant(term, value, bindings)

/**
 * @template {API.Bindings} Bindings
 *
 * @param {API.Constant} constant
 * @param {API.Constant} value
 * @param {Bindings} frame
 * @returns {API.Result<Bindings, Error>}
 */
export const matchConstant = (constant, value, frame) =>
  constant === value || equal(constant, value)
    ? { ok: frame }
    : { error: new RangeError(`Expected ${constant} got ${value}`) }

/**
 *
 * @param {API.Variable} variable
 * @param {API.Constant} data
 * @param {API.Bindings} frame
 * @returns {API.Result<API.Bindings, Error>}
 */
export const matchVariable = (variable, data, frame) => {
  // Get key this variable is bound to in the context
  const key = Variable.id(variable)
  // If context already contains binding for we attempt to unify it with the
  // new data otherwise we bind the data to the variable.
  if (key in frame) {
    return matchTerm(frame[key], data, frame)
  } else {
    const result = variable.tryFrom(data)
    return result.error ? result : { ok: { ...frame, [key]: result.ok } }
  }
}

/**
 *
 * @param {API.Querier} db
 * @param {API.ApplyRule} rule
 * @param {API.Bindings} bindings
 */
const matchRule = function* (db, rule, bindings) {
  const { match, where } = Rule.setup(rule.rule)

  // Unify passed rule bindings with the rule match pattern.
  const result = unifyRule(rule.input, match, bindings)
  if (!result.error) {
    yield* evaluate(db, where, [result.ok])
  }
}

/**
 *
 * @param {API.Frame} input
 * @param {API.Variables} match
 * @param {API.Bindings} bindings
 * @returns {API.Result<API.Bindings, Error>}
 */
const unifyRule = (input, match, bindings) => {
  for (const [key, variable] of Object.entries(match)) {
    const result = unifyMatch(input[key], variable, bindings)
    if (result.error) {
      return result
    }
    bindings = result.ok
  }

  return { ok: bindings }
}

/**
 * @param {API.Term} binding
 * @param {API.Variable} variable
 * @param {API.Bindings} bindings
 * @returns {API.Result<API.Bindings, Error>}
 */
const unifyMatch = (binding, variable, bindings) => {
  if (binding === variable) {
    return { ok: bindings }
  } else if (Variable.is(binding)) {
    return extendIfPossible(binding, variable, bindings)
  } else if (Variable.is(variable)) {
    return extendIfPossible(variable, binding, bindings)
  } else {
    return { error: new RangeError(`Expected ${binding} got ${variable}`) }
  }
}

/**
 * @template {API.Constant} T
 * @param {API.Variable<T>} variable
 * @param {API.Term<T>} value
 * @param {API.Bindings} bindings
 * @returns {API.Result<API.Bindings, Error>}
 */
const extendIfPossible = (variable, value, bindings) => {
  const binding = Bindings.get(bindings, variable)
  if (binding != null) {
    return matchTerm(value, binding, bindings)
  } else if (Variable.is(value)) {
    const binding = Bindings.get(bindings, value)
    if (binding != null) {
      return matchTerm(variable, binding, bindings)
    } else {
      return {
        ok: /** @type {API.Bindings} */ ({
          ...bindings,
          [Variable.id(variable)]: value,
        }),
      }
    }

    // Not sure how can we resolve variable to query here which is why
    // it is commented out.
    // } else if (isDependent(value, variable, frame)) {
    //   return { error: new Error(`Can not self reference`) }
  } else {
    return { ok: { ...bindings, [Variable.id(variable)]: value } }
  }
}
