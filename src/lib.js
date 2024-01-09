import * as API from './api.js'
export * from './api.js'
import { getPropertyKey, is as isVariable } from './variable.js'
export { when } from './predicate.js'
import { isBlank, dependencies } from './dsl.js'
import * as Rule from './rule.js'
export * as Memory from './memory.js'
export * from './dsl.js'
import { entries } from './object.js'
import { equal } from './constant.js'
export { Rule }
export { API }

const ENTITY = 0
const ATTRIBUTE = 1
const VALUE = 2

/**
 * @template {API.Constant} T
 * @param {API.Variable<T>} variable
 * @param {API.Frame} frame
 * @returns {API.Result<T, RangeError>}
 */
export const resolveBinding = (variable, frame) => {
  // Get key this variable is bound to in the context
  const key = getPropertyKey(variable)

  if (key in frame) {
    const binding = frame[key]
    if (!isVariable(binding)) {
      return { ok: /** @type {T} */ (binding) }
    }
  }

  return { error: new RangeError(`Variable is not bound yet`) }
}

/**
 * @template {API.Selector} Selection
 * @param {API.Querier} db
 * @param {object} source
 * @param {Selection} source.select
 * @param {Iterable<API.Pattern>} source.where
 * @returns {API.InferFrame<Selection>[]}
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
    and: [...where, ...patterns].map((pattern) => ({ match: pattern })),
  })
  // const matches = queryPatterns(
  //   db,
  //   [...where, ...patterns],
  //   // It would make sense to populate this with corresponding variables instead
  //   // of passing empty object and pretending it is not. For now we we keep it
  //   // simple and we'll deal with this later.
  //   /** @type {API.InferFrame<Selection>} */ ({})
  // )

  return [...matches].map((match) =>
    materialize(select, /** @type {API.InferFrame<Selection>} */ (match))
  )
}

/**
 * @template {API.Selector} Selection
 * @param {Selection} select
 * @param {API.InferFrame<Selection>} frame
 * @returns {API.InferFrame<Selection>}
 */
const materialize = (select, frame) =>
  /** @type {API.InferFrame<Selection>} */
  (
    Object.fromEntries(
      entries(select).map(([name, variable]) => [
        name,
        isVariable(variable) ? frame[getPropertyKey(variable)] : variable,
      ])
    )
  )

/**
 *
 * @param {API.Querier} db
 * @param {API.Query} query
 * @param {Iterable<API.Frame>} frames
 * @returns {Iterable<API.Frame>}
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
  } else if (query.ok) {
    yield* evaluateYes(db, query.ok, frames)
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
 * @param {API.Query[]} conjuncts
 * @param {Iterable<API.Frame>} frames
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
 * @param {API.Query} operand
 * @param {Iterable<API.Frame>} frames
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
 * @param {API.Predicate} predicate
 * @param {Iterable<API.Frame>} frames
 */
export const evaluateWhen = function* (db, predicate, frames) {
  for (const frame of frames) {
    if (!predicate.match(frame).error) {
      yield frame
    }
  }
}

/**
 *
 * @param {API.Querier} db
 * @param {{}} ignore
 * @param {Iterable<API.Frame>} frames
 */
export const evaluateYes = (db, ignore, frames) => frames

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
 * @param {API.Query[]} disjuncts
 * @param {Iterable<API.Frame>} frames
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
 * @param {API.Query['match'] & {}} pattern
 * @param {Iterable<API.Frame>} frames
 */

const evaluateMatch = function* (db, pattern, frames) {
  // We collect facts to avoid reaching for the db on each frame.
  const facts = [...iterateFacts(db, pattern)]
  for (const frame of frames) {
    for (const fact of facts) {
      yield* matchFact(fact, pattern, frame)
    }
  }
}

/**
 *
 * @param {API.Querier} db
 * @param {API.Query['apply'] & {}} rule
 * @param {Iterable<API.Frame>} frames
 */
const evaluateRule = function* (db, rule, frames) {
  for (const frame of frames) {
    yield* matchRule(db, rule, frame)
  }
}

/**
 * @param {API.Querier} db
 * @param {API.Pattern} pattern
 */
const iterateFacts = (db, [entity, attribute, value]) =>
  db.facts({
    entity: isVariable(entity) ? undefined : entity,
    attribute: isVariable(attribute) ? undefined : attribute,
    value: isVariable(value) ? undefined : value,
  })

/**
 * Attempts to match given `fact` against the given `pattern`, if it matches
 * yields extended `frame` with values for all the pattern variables otherwise
 * yields no frames.
 *
 * @param {API.Fact} fact
 * @param {API.Pattern} pattern
 * @param {API.Frame} frame
 */
const matchFact = function* (fact, pattern, frame) {
  const result = matchPattern(pattern, fact, frame)
  if (result.ok) {
    yield result.ok
  }
}

/**
 *
 * @param {API.Pattern} pattern
 * @param {API.Fact} fact
 * @param {API.Frame} frame
 * @returns {API.Result<API.Frame, Error>}
 */
const matchPattern = (pattern, [entity, attribute, value], frame) => {
  let result = matchTerm(pattern[ENTITY], entity, frame)
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
 * @param {API.Frame} frame
 * @returns {API.Result<API.Frame, Error>}
 */
const matchTerm = (term, value, frame) =>
  // We have a special `_` variable that matches anything. Unlike all other
  // variables it is not unified across all the relations which is why we treat
  // it differently and do add no bindings for it.
  isBlank(term)
    ? { ok: frame }
    : // All other variables get unified which is why we attempt to match them
      // against the data in the current state.
      isVariable(term)
      ? matchVariable(term, value, frame)
      : // If term is a constant we simply ensure that it matches the data.
        matchConstant(term, value, frame)

/**
 * @template {API.Frame} State
 *
 * @param {API.Constant} constant
 * @param {API.Constant} value
 * @param {State} frame
 * @returns {API.Result<State, Error>}
 */
export const matchConstant = (constant, value, frame) =>
  constant === value || equal(constant, value)
    ? { ok: frame }
    : { error: new RangeError(`Expected ${constant} got ${value}`) }

/**
 *
 * @param {API.Variable} variable
 * @param {API.Constant} data
 * @param {API.Frame} frame
 * @returns {API.Result<API.Frame, Error>}
 */
export const matchVariable = (variable, data, frame) => {
  // Get key this variable is bound to in the context
  const key = getPropertyKey(variable)
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
 * @param {API.Frame} frame
 */
const matchRule = function* (db, rule, frame) {
  const { match, where } = Rule.setup(rule.rule)

  // Unify passed rule bindings with the rule match pattern.
  const result = unifyRule(rule.input, match, frame)
  if (!result.error) {
    yield* evaluate(db, where, [result.ok])
  }
}

/**
 *
 * @param {API.Frame} input
 * @param {API.Bindings} match
 * @param {API.Frame} frame
 * @returns {API.Result<API.Frame, Error>}
 */
const unifyRule = (input, match, frame) => {
  for (const [key, variable] of Object.entries(match)) {
    const result = unifyMatch(input[key], variable, frame)
    if (result.error) {
      return result
    }
    frame = result.ok
  }

  return { ok: frame }
}

/**
 * @param {API.Term} binding
 * @param {API.Variable} variable
 * @param {API.Frame} frame
 * @returns {API.Result<API.Frame, Error>}
 */
const unifyMatch = (binding, variable, frame) => {
  if (binding === variable) {
    return { ok: frame }
  } else if (isVariable(binding)) {
    return extendIfPossible(binding, variable, frame)
  } else if (isVariable(variable)) {
    return extendIfPossible(variable, binding, frame)
  } else {
    return { error: new RangeError(`Expected ${binding} got ${variable}`) }
  }
}

/**
 * @template {API.Constant} T
 * @param {API.Variable<T>} variable
 * @param {API.Term<T>} value
 * @param {API.Frame} frame
 * @returns {API.Result<API.Frame, Error>}
 */
const extendIfPossible = (variable, value, frame) => {
  const binding = resolveBinding(variable, frame)
  if (!binding.error) {
    return matchTerm(value, binding.ok, frame)
  } else if (isVariable(value)) {
    const binding = resolveBinding(value, frame)
    if (!binding.error) {
      return matchTerm(variable, binding.ok, frame)
    } else {
      return { ok: { ...frame, [getPropertyKey(variable)]: value } }
    }

    // Not sure how can we resolve variable to query here which is why
    // it is commented out.
    // } else if (isDependent(value, variable, frame)) {
    //   return { error: new Error(`Can not self reference`) }
  } else {
    return { ok: { ...frame, [getPropertyKey(variable)]: value } }
  }
}

/**
 *
 * @param {API.Query} query
 * @param {API.Variable} variable
 * @param {API.Frame} frame
 */
const isDependent = (query, variable, frame) => {
  for (const each of iterateVariables(query)) {
    if (each === variable) {
      return true
    } else {
      const binding = resolveBinding(each, frame)
      if (!binding.error) {
        // @ts-ignore - not sure how can we resolve variable to a query
        if (isDependent(binding.ok, variable, frame)) {
          return true
        }
      }
    }
  }
  return false
}

/**
 * @param {API.Query} query
 * @returns {Iterable<API.Variable>}
 */
export const iterateVariables = function* (query) {
  if (query.and) {
    for (const conjunct of query.and) {
      yield* iterateVariables(conjunct)
    }
  } else if (query.or) {
    for (const disjunct of query.or) {
      yield* iterateVariables(disjunct)
    }
  } else if (query.not) {
    yield* iterateVariables(query.not)
  } else if (query.when) {
  } else if (query.ok) {
  } else if (query.apply) {
    for (const binding of Object.values(query.apply.input)) {
      if (isVariable(binding)) {
        yield binding
      }
    }
  } else {
    const [entity, attribute, value] = query.match
    if (isVariable(entity)) {
      yield entity
    }
    if (isVariable(attribute)) {
      yield attribute
    }
    if (isVariable(value)) {
      yield value
    }
  }
}
