import * as API from './api.js'
import * as Variable from './variable.js'
import * as Rule from './rule.js'
import * as Bindings from './bindings.js'
import { equal, Link } from './constant.js'
import * as Term from './term.js'
import { dependencies } from './dsl.js'
import * as Constraint from './constraint.js'
import * as Selector from './selector.js'
import * as Task from './task.js'

export * as Variable from './variable.js'
export * from './api.js'
export * as Memory from './memory.js'
export * from './dsl.js'
export * as Constant from './constant.js'
export { and, or, match, not } from './clause.js'
export { rule } from './rule.js'
export { Rule, Task, API, Link }

const ENTITY = 0
const ATTRIBUTE = 1
const VALUE = 2

export { Constraint }
export const { select } = Constraint

/**
 * @template {API.Selector} Selection
 * @param {API.Querier} db
 * @param {object} source
 * @param {Selection} source.select
 * @param {Iterable<API.Clause>} source.where
 */
export const query = (db, source) => Task.perform(evaluateQuery(db, source))

/**
 * @template {{}} Ok
 * @param {API.Transactor<Ok>} db
 * @param {API.Transaction} transaction
 */
export const transact = (db, transaction) =>
  Task.perform(db.transact(transaction))

/**
 * @template {API.Selector} Selection
 * @param {API.Querier} db
 * @param {object} source
 * @param {Selection} source.select
 * @param {Iterable<API.Clause>} source.where
 * @returns {Task.Task<API.InferBindings<Selection>[] , Error>}
 */
function* evaluateQuery(db, { select, where }) {
  const clauses = []

  // Flatten all the `And` clauses.
  const stack = [...where]
  while (stack.length) {
    const clause = stack[0]
    stack.shift()
    if (clause.And) {
      stack.unshift(...clause.And)
    } else {
      clauses.push(clause)
    }
  }

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
  for (const variable of Selector.variables(select)) {
    for (const clause of dependencies(variable)) {
      clauses.push(clause)
    }
  }

  const frames = yield* evaluate(db, {
    And: clauses.sort(byClause),
  })

  /** @type {API.InferBindings<Selection>[]} */
  const selection = []
  for (const frame of frames) {
    if (selection.length === 0) {
      selection.push(Selector.select(select, frame))
    } else {
      let joined = false
      for (const [offset, match] of selection.entries()) {
        const merged = Selector.merge(select, frame, match)
        if (merged) {
          selection[offset] = merged
          joined = true
        }
      }

      if (!joined) {
        selection.push(Selector.select(select, frame))
      }
    }
  }

  // const selection = [...matches].map((match) => Selector.select(select, match))

  return selection
}

/**
 * @param {API.Clause} operand
 * @param {API.Clause} modifier
 */

const byClause = (operand, modifier) =>
  rateClause(operand) - rateClause(modifier)

/**
 * @param {API.Clause} clause
 */
const rateClause = (clause) => {
  let score = 21
  if (clause.Case) {
    const [entity, attribute, value] = clause.Case
    if (Variable.is(entity)) {
      score -= 8
    }
    if (Variable.is(attribute)) {
      score -= 7
    }
    if (Variable.is(value)) {
      score -= 6
    }
  } else if (clause.And) {
    score -= 5
  } else if (clause.Or) {
    score -= 4
  } else if (clause.Form) {
    score -= 3
  } else if (clause.Not) {
    score -= 2
  } else if (clause.Rule) {
    score -= 1
  }

  return score
}

/**
 *
 * @param {API.Querier} db
 * @param {API.Clause} query
 * @param {Iterable<API.Bindings>} frames
 * @returns {Task.Task<Iterable<API.Bindings>, Error>}
 */
export const evaluate = function* (db, query, frames = [{}]) {
  if (query.Or) {
    return yield* evaluateOr(db, query.Or, frames)
  } else if (query.And) {
    return yield* evaluateAnd(db, query.And, frames)
  } else if (query.Not) {
    return yield* evaluateNot(db, query.Not, frames)
  } else if (query.Form) {
    return yield* evaluateForm(db, query.Form, frames)
  } else if (query.Rule) {
    return yield* evaluateRule(db, query.Rule, frames)
  } else if (query.Is) {
    return yield* evaluateIs(db, query.Is, frames)
  } else {
    return yield* evaluateCase(db, query.Case, frames)
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
    frames = yield* evaluate(db, query, frames)
  }

  return frames
}

/**
 *
 * @param {API.Querier} db
 * @param {API.Clause} operand
 * @param {Iterable<API.Bindings>} frames
 */
export const evaluateNot = function* (db, operand, frames) {
  const matches = []
  for (const frame of frames) {
    if (isEmpty(yield* evaluate(db, operand, [frame]))) {
      matches.push(frame)
    }
  }
  return matches
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
 * @param {API.MatchForm} form
 * @param {Iterable<API.Bindings>} frames
 */
export const evaluateForm = function* (db, form, frames) {
  const matches = []
  for (const bindings of frames) {
    if (form.confirm(form.selector, bindings).ok) {
      matches.push(bindings)
    }
  }
  return matches
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
  const matches = []
  for (const query of disjuncts) {
    const bindings = yield* evaluate(db, query, frames)
    matches.push(...bindings)
  }
  return matches
}

/**
 * @param {API.Querier} _
 * @param {API.Clause['Is'] & {}} is
 * @param {Iterable<API.Bindings>} frames
 */
export const evaluateIs = function* (_, [expect, actual], frames) {
  const matches = []
  for (const bindings of frames) {
    const result = unifyMatch(expect, actual, bindings)
    if (!result.error) {
      matches.push(result.ok)
    }
  }
  return matches
}

/**
 * @param {API.Querier} db
 * @param {API.Clause['Case'] & {}} pattern
 * @param {Iterable<API.Bindings>} frames
 */

const evaluateCase = function* (db, pattern, frames) {
  // We collect facts to avoid reaching for the db on each frame.
  const facts = yield* iterateFacts(db, pattern)
  const matches = []
  for (const bindings of frames) {
    for (const fact of facts) {
      matches.push(...matchFact(fact, pattern, bindings))
    }
  }
  return matches
}

/**
 *
 * @param {API.Querier} db
 * @param {API.Clause['Rule'] & {}} rule
 * @param {Iterable<API.Bindings>} frames
 */
const evaluateRule = function* (db, rule, frames) {
  const matches = []
  for (const frame of frames) {
    const bindings = yield* matchRule(db, rule, frame)
    matches.push(...bindings)
  }
  return matches
}

/**
 * @param {API.Querier} db
 * @param {API.Pattern} pattern
 */
const iterateFacts = (db, [entity, attribute, value]) =>
  db.scan({
    entity: Variable.is(entity) ? undefined : entity,
    attribute: Variable.is(attribute) ? undefined : attribute,
    value: Variable.is(value) ? undefined : value,
  })

/**
 * Attempts to match given `fact` against the given `pattern`, if it matches
 * yields extended `frame` with values for all the pattern variables otherwise
 * yields no frames.
 *
 * @param {API.Fact|API.Datum} fact
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
 * @param {API.Fact|API.Datum} fact
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
  Term.isBlank(term)
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
 * @param {API.Constant} value
 * @param {API.Bindings} bindings
 * @returns {API.Result<API.Bindings, Error>}
 */
export const matchVariable = (variable, value, bindings) => {
  // Get key this variable is bound to in the context
  const key = Variable.toKey(variable)
  // If context already contains binding for we attempt to unify it with the
  // new data otherwise we bind the data to the variable.
  if (key in bindings) {
    return matchTerm(bindings[key], value, bindings)
  } else {
    const result = Variable.check(variable, value)
    return result.error ? result : { ok: { ...bindings, [key]: value } }
  }
}

/**
 *
 * @param {API.Querier} db
 * @param {API.MatchRule} rule
 * @param {API.Bindings} bindings
 */
const matchRule = function* (db, rule, bindings) {
  const matches = []
  if (rule.rule) {
    const { match, where } = Rule.setup(rule.rule)

    // Unify passed rule bindings with the rule match pattern.
    const result = unifyRule(rule.input, match, bindings)
    if (!result.error) {
      const bindings = yield* evaluate(db, where, [result.ok])
      matches.push(...bindings)
    }
  } else {
    matches.push(bindings)
  }
  return matches
}

/**
 *
 * @param {API.Selector} input
 * @param {API.Selector} selector
 * @param {API.Bindings} bindings
 * @returns {API.Result<API.Bindings, Error>}
 */
const unifyRule = (input, selector, bindings) => {
  for (const [path, variable] of Selector.entries(selector)) {
    const result = unifyMatch(Selector.at(input, path), variable, bindings)
    if (result.error) {
      return result
    }
    bindings = result.ok
  }

  return { ok: bindings }
}

/**
 * @param {API.Term} input
 * @param {API.Term} variable
 * @param {API.Bindings} bindings
 * @returns {API.Result<API.Bindings, Error>}
 */
const unifyMatch = (input, variable, bindings) => {
  if (input === variable) {
    return { ok: bindings }
  } else if (Variable.is(input)) {
    return extendIfPossible(input, variable, bindings)
  } else if (Variable.is(variable)) {
    return extendIfPossible(variable, input, bindings)
  } else {
    return { error: new RangeError(`Expected ${input} got ${variable}`) }
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
          [Variable.toKey(variable)]: value,
        }),
      }
    }

    // Not sure how can we resolve variable to query here which is why
    // it is commented out.
    // } else if (isDependent(value, variable, frame)) {
    //   return { error: new Error(`Can not self reference`) }
  } else {
    return { ok: { ...bindings, [Variable.toKey(variable)]: value } }
  }
}
