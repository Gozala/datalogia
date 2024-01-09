import * as API from './api.js'
export * from './api.js'
import * as Link from 'multiformats/link'
import { getPropertyKey, PROPERTY_KEY, is as isVariable } from './variable.js'
export { when } from './predicate.js'
import { isBlank, dependencies } from './dsl.js'
import * as Rule from './rule.js'
export * as Memory from './memory.js'
export * from './dsl.js'
import { entries } from './util.js'
export { Rule }
export { API }

/**
 * @typedef {number} Integer
 * @typedef {number} Float
 * @typedef {Readonly<Uint8Array>} Bytes
 * @typedef {string} UTF8
 *
 * @typedef {string|Float|Integer} Entity
 * @typedef {Integer|Float|Bytes|UTF8} Attribute
 * @typedef {API.Constant} Data
 */

/**
 * Database is represented as a collection of facts.
 * @typedef {object} Database
 * @property {number} [entityCount]
 * @property {readonly Fact[]} facts
 */

/**
 * An atomic fact in the database, associating an `entity` , `attribute` ,
 * `value`.
 *
 * - `entity` - The first component is `entity` that specifies who or what the fact is about.
 * - `attribute` - Something that can be said about an `entity` . An attribute has a name,
 *    e.g. "firstName" and a value type, e.g. string, and a cardinality.
 * - `value` - Something that does not change e.g. 42, "John", true. Fact relates
 *    an `entity` to a particular `value` through an `attribute`.ich
 *
 * @typedef {readonly [entity: Entity, attribute: Attribute, value: Data]} Fact
 */

/**
 * Variable is placeholder for a value that will be matched against by the
 * query engine. It is represented as an abstract `Reader` that will attempt
 * to read arbitrary {@type Data} and return result with either `ok` of the
 * `Type` or an `error`.
 *
 * Variables will be assigned unique `bindingKey` by a query engine that will
 * be used as unique identifier for the variable.
 *
 * @template {Data} [Type=Data]
 * @typedef {API.TryFrom<{ Self: Type, Input: Data }> & {[PROPERTY_KEY]?: PropertyKey}} Variable
 */

/**
 * Term is either a constant or a {@link Variable}. Terms are used to describe
 * predicates of the query.
 *
 * @typedef {Data|Variable} Term
 */

/**
 * Describes association between `entity`, `attribute`, `value` of the
 * {@link Fact}. Each component of the {@link Relation} is a {@link Term}
 * that is either a constant or a {@link Variable}.
 *
 * Query engine during execution will attempt to match {@link Relation} against
 * all facts in the database and unify {@link Variable}s across them to identify
 * all possible solutions.
 *
 * @typedef {[entity: Term, attribute: Term, value: Term]} Relation
 */

/**
 * Selection describes set of (named) variables that query engine will attempt
 * to find values for that satisfy the query.
 *
 * @typedef {Record<PropertyKey, Variable>} Selector
 */

/**
 * @template {Selector} Selection
 * @typedef {{[Key in keyof Selection]: Selection[Key] extends Variable<infer T> ? T : never}} InferMatch
 */

/**
 * @template {Selector} Selection
 * @typedef {{[Key in keyof Selection]: Selection[Key] extends Variable<infer T> ? (Variable<T> | T) : never}} InferState
 */

const ENTITY = 0
const ATTRIBUTE = 1
const VALUE = 2

/**
 * Attempts to match given `fact` against the given `relation`, if it is matches
 * returns `state` extended with values for all the variables that were matched,
 * otherwise returns `null`.
 * 
 * @template {Selector} Selection

 * @param {Relation} relation
 * @param {Fact} fact
 * @param {InferState<Selection>} state
 * @returns {InferState<Selection>|null}
 */
export const matchRelation = (relation, fact, state) => {
  /** @type {InferState<Selection>|null} */
  let match = state

  // Match entity, attribute and value on by one. If one of them does not match
  // match fails and we return null.
  match = matchTerm(relation[ENTITY], fact[ENTITY], match)
  match = match && matchTerm(relation[ATTRIBUTE], fact[ATTRIBUTE], match)
  match = match && matchTerm(relation[VALUE], fact[VALUE], match)

  return match
}

/**
 * Attempts to match given `term` against the given fact `data`, if `data`
 * matches the term returns `state` extended with binding corresponding to the
 * `term` otherwise returns `null`.
 *
 * @template {Selector} Selection
 *
 * @param {Term} term
 * @param {Data} data
 * @param {InferState<Selection>} state
 */
export const matchTerm = (term, data, state) =>
  // We have a special `_` variable that matches anything. Unlike all other
  // variables it is not unified across all the relations which is why we treat
  // it differently and do add no bindings for it.
  isBlank(term)
    ? state
    : // All other variables get unified which is why we attempt to match them
      // against the data in the current state.
      isVariable(term)
      ? matchVariable(term, data, state)
      : // If term is a constant we simply ensure that it matches the data.
        matchConstant(term, data, state)

/**
 * @template State
 *
 * @param {Data} constant
 * @param {Data} data
 * @param {State} context
 * @returns {State|null}
 */
export const matchConstant = (constant, data, context) =>
  constant === data || equal(context, data) ? context : null

/**
 * @param {unknown} expected
 * @param {unknown} actual
 * @returns {boolean}
 */
const equal = (expected, actual) => {
  let length = /** @type {{byteLength?:number}} */ (expected)?.byteLength
  if (
    length != null &&
    length === /** @type {{byteLength?:number}} */ (actual)?.byteLength
  ) {
    // If both expected and actual have `byteLength` property we assume they are
    // Uint8Array's and proceed with byte by byte comparison. This assumption may
    // be incorrect if at runtime type requirements are not upheld, but we don't
    // we do not support that use case.
    const source = /** @type {Uint8Array} */ (expected)
    const target = /** @type {Uint8Array} */ (actual)
    let offset = 0
    while (offset < length) {
      if (source[offset] !== target[offset]) {
        return false
      }
      offset++
    }
    return true
  }

  return false
}

/**
 * @template {Selector} Selection
 *
 * @param {Variable} variable
 * @param {Data} data
 * @param {InferState<Selection>} context
 * @returns {InferState<Selection>|null}
 */
export const matchVariable = (variable, data, context) => {
  // Get key this variable is bound to in the context
  const key = getPropertyKey(variable)
  // If context already contains binding for we attempt to unify it with the
  // new data otherwise we bind the data to the variable.
  if (key in context) {
    return matchTerm(context[key], data, context)
  } else {
    const result = variable.tryFrom(data)
    return result.error ? null : { ...context, [key]: result.ok }
  }
}

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
 * Goes over all the database facts and attempts to match each one against the
 * given `relation` and current `state`. For every match we collect matched
 * state. Function returns all the matches if any.
 *
 * @template {Selector} Selection
 * @param {Relation} relation
 * @param {Database} db
 * @param {InferState<Selection>} state
 * @returns {InferState<Selection>[]}
 */
const queryRelation = (relation, { facts }, state) => {
  const matches = []
  for (const fact of facts) {
    const match = matchRelation(relation, fact, state)
    if (match) {
      matches.push(match)
    }
  }

  return matches
}

/**
 * @template {Selector} Selection
 * @param {Database} db
 * @param {Relation[]} relations
 * @param {InferState<Selection>} state
 * @returns {InferState<Selection>[]}
 */
export const queryRelations = (db, relations, state) =>
  // Here we start with an initial state (which contains no bindings) and create
  // an extended state for every fact that matched the relation. Then we take
  // all those states and extends them by matching all facts against next
  // relation. If state been extended conflicts with the relation we drop that
  // state and consider next one. On every relation we will map 1 state to 0 or
  // more extended states which is why we flatten results and repeat the process
  // with the next relation. Once we consider all relations we will end up with
  // a list of matched states containing values for all variables.
  relations.reduce(
    /**
     * @param {InferState<Selection>[]} matches
     * @param {Relation} relation
     * @returns
     */
    (matches, relation) =>
      matches.flatMap((match) => queryRelation(relation, db, match)),
    [state]
  )

/**
 * Takes a selector which is set of variables that will be used in the query
 * conditions. Returns a query builder that has `.where` method for specifying
 * the query conditions.
 *
 * @example
 * ```ts
 * const moviesAndTheirDirectorsThatShotArnold = select({
 *    directorName: Schema.string(),
 *    movieTitle: Schema.string(),
 * }).where(({ directorName, movieTitle }) => {
 *    const arnoldId = Schema.number()
 *    const movie = Schema.number()
 *    const director = Schema.number()
 *
 *    return [
 *      [arnold, "person/name", "Arnold Schwarzenegger"],
 *      [movie, "movie/cast", arnoldId],
 *      [movie, "movie/title", movieTitle],
 *      [movie, "movie/director", director],
 *      [director, "person/name", directorName]
 *   ]
 * })
 * ```
 *
 * @template {Selector} Selection
 * @param {Selection} selector
 * @returns {QueryBuilder<Selection>}
 */
export const select = (selector) => new QueryBuilder({ select: selector })

/**
 * @template {Selector} Selection
 * @param {Database} db
 * @param {object} source
 * @param {Selection} source.select
 * @param {Iterable<Relation>} source.where
 * @returns {InferMatch<Selection>[]}
 */
export const query = (db, { select, where }) => {
  const clauses = []

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
      clauses.push(clause)
    }
  }

  const matches = queryRelations(
    db,
    [...where, ...clauses],
    // It would make sense to populate this with corresponding variables instead
    // of passing empty object and pretending it is not. For now we we keep it
    // simple and we'll deal with this later.
    /** @type {InferState<Selection>} */ ({})
  )

  return matches.map((match) => materialize(select, match))
}
/**
 * A query builder API which is designed to enable type inference of the query
 * and the results it will produce.
 *
 * @template {Selector} Select
 */
class QueryBuilder {
  /**
   * @param {object} source
   * @param {Select} source.select
   */
  constructor({ select }) {
    this.select = select
  }
  /**
   * @param {(variables: Select) => Iterable<Relation>} conditions
   * @returns {Query<Select>}
   */
  where(conditions) {
    return new Query({
      select: this.select,
      where: [...conditions(this.select)],
    })
  }
}

/**
 * @template {Selector} Selection
 */
class Query {
  /**
   * @param {object} model
   * @param {Selection} model.select
   * @param {(Relation)[]} model.where
   */
  constructor(model) {
    this.model = model
  }

  /**
   *
   * @param {Database} db
   * @returns {InferMatch<Selection>[]}
   */
  execute(db) {
    return query(db, this.model)
  }
}

/**
 * @template {Selector} Selection
 * @param {Selection} select
 * @param {InferState<Selection>} context
 * @returns {InferMatch<Selection>}
 */
const materialize = (select, context) =>
  /** @type {InferMatch<Selection>} */
  (
    Object.fromEntries(
      entries(select).map(([name, variable]) => [
        name,
        isVariable(variable) ? context[getPropertyKey(variable)] : variable,
      ])
    )
  )

/**
 * @template {Data} [T=Data]
 * @template {PropertyKey} [Key=PropertyKey]
 * @extends {Variable<T>}
 */
class SelectedVariable {
  static lastKey = 0

  /**
   * @param {object} source
   * @param {Key} source.key
   * @param {Variable<T>} source.schema
   */
  constructor({ key, schema }) {
    this.propertyKey = key
    this.schema = schema
  }

  /**
   * @param {Data} value
   */
  from(value) {
    return this.schema.tryFrom(value)
  }
}

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
  let result = matchPatternTerm(pattern[ENTITY], entity, frame)
  result = result.error
    ? result
    : matchPatternTerm(pattern[ATTRIBUTE], attribute, result.ok)

  result = result.error
    ? result
    : matchPatternTerm(pattern[VALUE], value, result.ok)

  return result
}

/**
 *
 * @param {API.Term} term
 * @param {API.Constant} data
 * @param {API.Frame} frame
 * @returns {API.Result<API.Frame, Error>}
 */
const matchPatternTerm = (term, data, frame) =>
  // We have a special `_` variable that matches anything. Unlike all other
  // variables it is not unified across all the relations which is why we treat
  // it differently and do add no bindings for it.
  isBlank(term)
    ? { ok: frame }
    : // All other variables get unified which is why we attempt to match them
      // against the data in the current state.
      isVariable(term)
      ? matchPatternVariable(term, data, frame)
      : // If term is a constant we simply ensure that it matches the data.
        matchLiteral(term, data, frame)

/**
 * @template {API.Frame} State
 *
 * @param {API.Constant} constant
 * @param {API.Constant} data
 * @param {State} frame
 * @returns {API.Result<State, Error>}
 */
export const matchLiteral = (constant, data, frame) =>
  constant === data || equal(constant, data)
    ? { ok: frame }
    : { error: new RangeError(`Expected ${constant} got ${data}`) }

/**
 *
 * @param {API.Variable} variable
 * @param {API.Constant} data
 * @param {API.Frame} frame
 * @returns {API.Result<API.Frame, Error>}
 */
export const matchPatternVariable = (variable, data, frame) => {
  // Get key this variable is bound to in the context
  const key = getPropertyKey(variable)
  // If context already contains binding for we attempt to unify it with the
  // new data otherwise we bind the data to the variable.
  if (key in frame) {
    return matchPatternTerm(frame[key], data, frame)
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
    return matchPatternTerm(value, binding.ok, frame)
  } else if (isVariable(value)) {
    const binding = resolveBinding(value, frame)
    if (!binding.error) {
      return matchPatternTerm(variable, binding.ok, frame)
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
