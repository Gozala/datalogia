import * as API from './api.js'
export * from './api.js'
export { API }

/**
 * @typedef {number} Integer
 * @typedef {number} Float
 * @typedef {Readonly<Uint8Array>} Bytes
 * @typedef {string} UTF8
 *
 * @typedef {string|Float|Integer} Entity
 * @typedef {Integer|Float|Bytes|UTF8} Attribute
 * @typedef {boolean|UTF8|Integer|Float|Bytes} Data
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
 * Creates an assertion.
 *
 * @template {Entity} E
 * @template {Attribute} A
 * @template {Data} V
 *
 * @param {E} entity
 * @param {A} attribute
 * @param {V} value
 * @returns {readonly [entity: E, attribute:A, value:V]}
 */
export const assert = (entity, attribute, value) => [entity, attribute, value]

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
  const key = SelectedVariable.getPropertyKey(variable)
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
 * Predicate function that checks if given `term` is a {@link Variable}.
 *
 * @template {Data} T
 * @param {unknown|Variable<T>} term
 * @returns {term is Variable<T>}
 */
const isVariable = (term) => {
  return (
    typeof term === 'object' &&
    term !== null &&
    'tryFrom' in term &&
    typeof term.tryFrom === 'function'
  )
}

/**
 *
 * @param {unknown} x
 * @returns {x is Schema._}
 */
const isBlank = (x) => x === Schema._

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
  const relations = [...where]

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
  for (const attribute of Object.values(select)) {
    // Select also could use plain variables that aren't attribute fields, for
    // those we don't really need to do anything.
    if (attribute instanceof DataAttribute) {
      relations.push(attribute.match())
    }
  }

  const matches = queryRelations(
    db,
    relations,
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
 * @template {Record<string, unknown>} Object
 * @param {Object} object
 * @returns {{[Key in keyof Object]: [Key, Object[Key]]}[keyof Object][]}
 */
const entries = (object) => /** @type {any} */ (Object.entries(object))

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
        isVariable(variable)
          ? context[SelectedVariable.getPropertyKey(variable)]
          : variable,
      ])
    )
  )

const IS = Symbol.for('is')
const PROPERTY_KEY = Symbol.for('propertyKey')

/**
 * @template {Data} Self
 * @implements {API.TryFrom<{ Self: Self, Input: Data }>}
 */
export class Schema {
  /**
   * @param {object} model
   * @param {PropertyKey} [model.key]
   */
  constructor({ key } = {}) {
    this[PROPERTY_KEY] = key
  }

  [Symbol.toPrimitive]() {
    return SelectedVariable.getPropertyKey(this)
  }

  /**
   * @param {object} model
   * @param {Variable<Entity>|Entity} model.entity
   * @param {Variable<Attribute>|Attribute} model.attribute
   */
  bind(model) {
    return new DataAttribute({ ...model, schema: this })
  }

  /**
   * @param {Data} value
   * @returns {API.Result<Self, RangeError>}
   */
  tryFrom(value) {
    switch (typeof value) {
      case 'string':
      case 'boolean':
      case 'number':
        return { ok: /** @type {Self} */ (value) }
      default:
        return value instanceof Uint8Array
          ? { ok: /** @type {Self} */ (value) }
          : { error: new TypeError(`Unknown value type ${typeof value}`) }
    }
  }

  /**
   * @template {Data} Out
   * @param {API.TryFrom<{ Input: Self, Self: Out }>} to
   */
  map(to) {
    return new SchemaPipeline({ from: this, to })
  }

  static string() {
    return new StringSchema()
  }
  static number() {
    return new NumberSchema()
  }

  static boolean() {
    return new BooleanSchema()
  }

  static _ = new Schema({ key: '_' })
}

/**
 * @template {Data} Self
 * @template State
 * @extends {Schema<Self>}
 */
class SchemaPipeline extends Schema {
  /**
   * @param {object} model
   * @param {PropertyKey} [model.key]
   * @param {API.TryFrom<{ Input: Data, Self: State }>} model.from
   * @param {API.TryFrom<{ Input: State, Self: Self }>} model.to
   */
  constructor(model) {
    super(model)
    this.model = model
  }
  /**
   * @param {Data} value
   */
  tryFrom(value) {
    const { from, to } = this.model
    const result = from.tryFrom(value)
    return result.error ? result : to.tryFrom(result.ok)
  }
}

/**
 * @template {number} Self
 * @extends {Schema<Self>}
 * @implements {API.TryFrom<{ Self: Self, Input: Data }>}
 */
class NumberSchema extends Schema {
  /**
   * @template {number} Self
   * @param {Data} value
   * @returns {API.Result<Self, RangeError>}
   */
  static tryFrom(value) {
    if (typeof value === 'number') {
      return { ok: /** @type {Self} */ (value) }
    } else {
      return { error: new RangeError(`Expected number, got ${typeof value}`) }
    }
  }

  /**
   * @param {object} model
   * @param {Variable<Entity>|Entity} model.entity
   * @param {Variable<Attribute>|Attribute} model.attribute
   * @returns {NumberAttribute<Self>}
   */
  bind(model) {
    return new NumberAttribute({ ...model, schema: this })
  }
  /**
   * @param {Data} value
   * @returns {API.Result<Self, RangeError>}
   */
  tryFrom(value) {
    if (typeof value === 'number') {
      return { ok: /** @type {Self} */ (value) }
    } else {
      return { error: new RangeError(`Expected number, got ${typeof value}`) }
    }
  }

  /**
   * @template {number} Refined
   * @param {API.TryFrom<{ Input: Self, Self: Refined }>} constraint
   */
  refine(constraint) {
    return new ToNumberSchema({ base: this, constraint })
  }
}

/**
 * @template {number} T
 * @template {number} Self
 * @extends {NumberSchema<Self>}
 */
class ToNumberSchema extends NumberSchema {
  /**
   * @param {object} model
   * @param {PropertyKey} [model.key]
   * @param {API.TryFrom<{ Input: Data, Self: T }>} model.base
   * @param {API.TryFrom<{ Input: T, Self: Self }>} model.constraint
   */
  constructor(model) {
    super(model)
    this.model = model
  }
  /**
   * @param {Data} value
   */
  tryFrom(value) {
    const result = this.model.base.tryFrom(value)
    return result.error ? result : this.model.constraint.tryFrom(result.ok)
  }
}

/**
 * @template {string} Self
 * @extends {Schema<Self>}
 * @implements {API.TryFrom<{ Self: Self, Input: Data }>}
 */
class StringSchema extends Schema {
  /**
   * @param {object} model
   * @param {Variable<Entity>|Entity} model.entity
   * @param {Variable<Attribute>|Attribute} model.attribute
   * @returns {StringAttribute<Self>}
   */
  bind(model) {
    return new StringAttribute({ ...model, schema: this })
  }
  /**
   * @param {Data} value
   * @returns {API.Result<Self, RangeError>}
   */
  tryFrom(value) {
    if (typeof value === 'string') {
      return { ok: /** @type {Self} */ (value) }
    } else {
      return { error: new RangeError(`Expected number, got ${typeof value}`) }
    }
  }

  /**
   * @template {string} Refined
   * @param {API.TryFrom<{ Input: Self, Self: Refined }>} constraint
   */
  refine(constraint) {
    return new ToStringSchema({ base: this, constraint })
  }
}

/**
 * @template {string} T
 * @template {string} Self
 * @extends {StringSchema<Self>}
 */
class ToStringSchema extends StringSchema {
  /**
   * @param {object} model
   * @param {PropertyKey} [model.key]
   * @param {API.TryFrom<{ Input: Data, Self: T }>} model.base
   * @param {API.TryFrom<{ Input: T, Self: Self }>} model.constraint
   */
  constructor(model) {
    super(model)
    this.model = model
  }
  /**
   * @param {Data} value
   */
  tryFrom(value) {
    const result = this.model.base.tryFrom(value)
    return result.error ? result : this.model.constraint.tryFrom(result.ok)
  }
}

/**
 * @template {boolean} T
 * @extends {Schema<T>}
 * @implements {API.TryFrom<{ Self: T, Input: Data }>}
 */
class BooleanSchema extends Schema {
  /**
   * @param {Data} value
   * @returns {API.Result<T, RangeError>}
   */
  tryFrom(value) {
    if (typeof value === 'boolean') {
      return { ok: /** @type {T} */ (value) }
    } else {
      return { error: new RangeError(`Expected number, got ${typeof value}`) }
    }
  }
}

/**
 * @template {Data} T
 * @extends {Schema<T>}
 */
class DataAttribute {
  /**
   * @param {object} model
   * @param {Variable<T>} model.schema
   * @param {Term} model.attribute
   * @param {Variable<Entity>|Entity} model.entity
   */
  constructor(model) {
    this.model = model
  }

  [Symbol.toPrimitive]() {
    return SelectedVariable.getPropertyKey(this)
  }

  /**
   * @param {Data} value
   * @returns {API.Result<T, Error>}
   */
  tryFrom(value) {
    return this.model.schema.tryFrom(value)
  }

  /**
   * @param {Data|Variable} value
   * @returns {Relation}
   */
  is(value) {
    return [this.model.entity, this.model.attribute, value]
  }

  /**
   * @returns {Relation}
   */
  match() {
    return [this.model.entity, this.model.attribute, this]
  }

  /**
   * @template {T} Not
   * @param {Not} value
   * @returns {Relation}
   */
  not(value) {
    return [
      this.model.entity,
      this.model.attribute,
      new SchemaPipeline({
        from: this.model.schema,
        to: {
          tryFrom: (x) =>
            x === value
              ? { error: new RangeError(`Expected ${x} != ${value}`) }
              : { ok: x },
        },
      }),
    ]
  }
}

/**
 * @template {number} Self
 * @extends {DataAttribute<Self>}
 */
class NumberAttribute extends DataAttribute {
  /**
   * @param {number} value
   * @returns {Relation}
   */
  greaterThan(value) {
    return [
      this.model.entity,
      this.model.attribute,
      new ToNumberSchema({
        base: this.model.schema,
        constraint: {
          tryFrom: (x) => {
            return x > value
              ? { ok: x }
              : { error: new RangeError(`Expected ${x} > ${value}`) }
          },
        },
      }),
    ]
  }

  /**
   * @param {number} value
   * @returns {Relation}
   */
  lessThan(value) {
    return [
      this.model.entity,
      this.model.attribute,
      new ToNumberSchema({
        base: this.model.schema,
        constraint: {
          tryFrom: (x) => {
            return x < value
              ? { ok: x }
              : { error: new RangeError(`Expected ${x} > ${value}`) }
          },
        },
      }),
    ]
  }
}

/**
 * @template {string} T
 * @extends {DataAttribute<T>}
 */
class StringAttribute extends DataAttribute {
  /**
   * @template {string} Prefix
   * @param {Prefix} prefix
   * @returns {Relation}
   */
  startsWith(prefix) {
    return [
      this.model.entity,
      this.model.attribute,
      new ToStringSchema({
        base: this.model.schema,
        constraint: {
          tryFrom: (x) => {
            return x.startsWith(prefix)
              ? { ok: x }
              : {
                  error: new RangeError(
                    `Expected ${x} to start with ${prefix}`
                  ),
                }
          },
        },
      }),
    ]
  }
  /**
   * @template {string} Prefix
   * @param {Prefix} prefix
   * @returns {Relation}
   */
  doesNotStartsWith(prefix) {
    return [
      this.model.entity,
      this.model.attribute,
      new ToStringSchema({
        base: this.model.schema,
        constraint: {
          tryFrom: (x) => {
            return x.startsWith(prefix)
              ? {
                  error: new RangeError(
                    `Expected ${x} to not start with ${prefix}`
                  ),
                }
              : { ok: x }
          },
        },
      }),
    ]
  }
  /**
   * @template {string} Suffix
   * @param {Suffix} suffix
   * @returns {Relation}
   */
  endsWith(suffix) {
    return [
      this.model.entity,
      this.model.attribute,
      new ToStringSchema({
        base: this.model.schema,
        constraint: {
          tryFrom: (x) => {
            return x.endsWith(suffix)
              ? { ok: x }
              : {
                  error: new RangeError(`Expected ${x} to end with ${suffix}`),
                }
          },
        },
      }),
    ]
  }
  /**
   * @param {string} chunk
   * @returns {Relation}
   */
  includes(chunk) {
    return [
      this.model.entity,
      this.model.attribute,
      new ToStringSchema({
        base: this.model.schema,
        constraint: {
          tryFrom: (x) => {
            return x.includes(chunk)
              ? { ok: x }
              : {
                  error: new RangeError(`Expected ${x} to include ${chunk}`),
                }
          },
        },
      }),
    ]
  }

  toLowerCase() {
    return new StringAttribute({
      ...this.model,
      schema: new ToStringSchema({
        base: this.model.schema,
        constraint: {
          tryFrom: (x) => ({ ok: x.toLowerCase() }),
        },
      }),
    })
  }

  toUpperCase() {
    return new StringAttribute({
      ...this.model,
      schema: new ToStringSchema({
        base: this.model.schema,
        constraint: {
          tryFrom: (x) => ({ ok: x.toUpperCase() }),
        },
      }),
    })
  }
}

/**
 * @template {Data} [T=Data]
 * @template {PropertyKey} [Key=PropertyKey]
 * @extends {Variable<T>}
 */
class SelectedVariable {
  static lastKey = 0

  /**
   * @param {Variable} variable
   * @returns {PropertyKey}
   */
  static getPropertyKey(variable) {
    const propertyKey = variable[PROPERTY_KEY]
    if (propertyKey) {
      return propertyKey
    } else {
      const bindingKey = `$${++this.lastKey}`
      variable[PROPERTY_KEY] = bindingKey
      return bindingKey
    }
  }

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
 * @template {Record<PropertyKey, Variable>} Attributes
 * @typedef {{[Key in keyof Attributes]: Attributes[Key] extends Variable<infer T> ? InferAttributeField<T> : never}} InferEntityFields
 */

/**
 * @template {Data} T
 * @typedef {T extends number ? NumberAttribute<T> :
 *           T extends string ? StringAttribute<T> :
 *           DataAttribute<T>} InferAttributeField
 */

/**
 * @template {Record<PropertyKey, Variable>} Attributes
 * @param {Attributes} attributes
 * @returns {{new(): EntityView<Attributes> & InferEntityFields<Attributes>}}
 */
export const entity = (attributes) =>
  // @ts-ignore
  class Entity extends EntityView {
    constructor() {
      super()
      for (const [key, variable] of entries(attributes)) {
        // @ts-ignore
        this[key] =
          variable instanceof Schema
            ? variable.bind({ entity: this, attribute: String(key) })
            : new DataAttribute({
                entity: this,
                attribute: String(key),
                schema: variable,
              })
      }
    }
  }

/**
 * @template {Record<PropertyKey, Variable>} Bindings
 * @param {Bindings} bindings
 * @param {Relation[]} clauses
 */
export const rule = (bindings, clauses) =>
  class Rule {
    constructor() {
      this.bindings = bindings
      this.clauses = clauses
    }
    *[Symbol.iterator]() {
      yield* clauses
    }
    /**
     * @param {Bindings} input
     */
    static match(input) {
      throw 0
    }
  }

/**
 * @template {Record<PropertyKey, Variable>} Attributes
 * @extends {Schema<Entity>}
 */
class EntityView extends Schema {
  /**
   * @param {Data} value
   * @returns {API.Result<Entity, RangeError>}
   */
  tryFrom(value) {
    switch (typeof value) {
      case 'string':
      case 'number':
        return { ok: value }
      default:
        return {
          error: new RangeError(
            `Expected entity identifier instead got ${value}`
          ),
        }
    }
  }

  /**
   * @param {Partial<{[Key in keyof Attributes]: Term}>} pattern
   * @returns {{where: Relation[]}}
   */
  match(pattern = {}) {
    const where = []
    const attributes = /** @type {Attributes} */ (this.valueOf())

    for (const [key, variable] of entries(attributes)) {
      const term = pattern[key] ?? variable
      // If there is a reference to an entity we include into relation, this
      // ensures that values for all entity attributes are aggregated.
      if (term instanceof EntityView) {
        where.push(...term.match().where)
      }

      where.push(/** @type {Relation} */ ([this, key, term]))
    }

    return { where }
  }

  /**
   * @param {Partial<{[Key in keyof Attributes]: Data|NewEntity}>} model
   * @returns {Iterable<Assert>}
   */
  *assert(model) {
    const attributes = /** @type {Attributes} */ (this.valueOf())
    for (const key of Object.keys(attributes)) {
      const value = model[key]
      if (value) {
        yield [/** @type {NewEntity} */ (model), key, value]
      }
    }
  }
}

const ID = Symbol.for('entity/id')

/**
 * Asserts certain facts about the entity.
 *
 * @typedef {Record<PropertyKey, Data> & {[ID]?: Entity}} EntityAssertion
 */

/**
 * @typedef {{[ID]: number}} NewEntity
 * @typedef {[entity: NewEntity, attribute: Attribute, value: Data|NewEntity]} Assert
 */

// /**
//  * @param {Database} db
//  * @param {Iterable<Fact|Iterable<Fact|Assert>>} assertions
//  */
// export const transact = (db, assertions) => {
//   const delta = { ...db, facts: [...db.facts] }
//   for (const assertion of assertions) {
//     const facts = isFact(assertion) ? [assertion] : assertion
//     for (const [entity, attribute, value] of facts) {
//       // New entities will not have an IDs associated with them which is why
//       // we are going to allocate new one. We also store it in the entity
//       // field so that we keep same ID across all associations on the entity.
//       if (typeof entity === 'object' && !entity[ID]) {
//         entity[ID] = delta.entityCount++
//       }

//       /** @type {Fact} */
//       const fact =
//         ID in /** @type {{[ID]?: number}} */ (entity)
//           ? [entity[ID], attribute, value]
//           : [entity, attribute, value]

//       delta.facts.push(fact)
//     }
//   }
// }

// /**
//  * @param {Database} db
//  * @param {*} x
//  */
// const resolveID = (x) => {
//   if (typeof x === 'object' && ID in x) {
//     return x[ID]
//   }
// }

// /**
//  *
//  * @param {unknown} x
//  * @returns {x is Fact}
//  */
// const isFact = (x) => Array.isArray(x) && x.length === 3
