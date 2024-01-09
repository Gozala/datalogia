import * as API from './api.js'
import { PROPERTY_KEY, getPropertyKey } from './variable.js'
import * as Link from './link.js'
import { entries } from './util.js'

/**
 * @param {unknown} x
 * @returns {x is Schema._}
 */
export const isBlank = (x) => x === Schema._

/**
 * @template {API.Constant} T
 * @typedef {T extends number ? NumberAttribute<T> :
 *           T extends string ? StringAttribute<T> :
 *           DataAttribute<T>} InferAttributeField
 */

/**
 * @template {Record<PropertyKey, API.Variable>} Attributes
 * @typedef {{[Key in keyof Attributes]: Attributes[Key] extends API.Variable<infer T> ? InferAttributeField<T> : never}} InferEntityFields
 */

/**
 * @template {API.Bindings} Attributes
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
 * @template {API.Constant} Self
 * @implements {API.Variable<Self>}
 */
export class Schema {
  /**
   * @param {object} model
   * @param {PropertyKey} [model.key]
   */
  constructor({ key } = {}) {
    this[PROPERTY_KEY] = key
  }

  get type() {
    return { Any: this }
  }

  get $() {
    return getPropertyKey(this)
  }

  [Symbol.toPrimitive]() {
    return getPropertyKey(this)
  }

  /**
   * @param {object} model
   * @param {API.Variable<API.Entity>|API.Entity} model.entity
   * @param {API.Variable<API.Attribute>|API.Attribute} model.attribute
   */
  bind(model) {
    return new DataAttribute({ ...model, schema: this })
  }

  /**
   * @param {API.Constant} value
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
   * @template {API.Constant} Out
   * @param {API.TryFrom<{ Input: Self, Self: Out }>} to
   */
  map(to) {
    return new SchemaPipeline({ from: this, to })
  }

  static link() {
    return new LinkSchema()
  }

  static string() {
    return new StringSchema()
  }
  static integer() {
    return new NumberSchema()
  }

  static float() {
    return new NumberSchema()
  }

  static boolean() {
    return new BooleanSchema()
  }

  static _ = new Schema({ key: '_' })
}

/**
 * @template {API.Constant} Self
 * @template State
 * @extends {Schema<Self>}
 */
class SchemaPipeline extends Schema {
  /**
   * @param {object} model
   * @param {PropertyKey} [model.key]
   * @param {API.TryFrom<{ Input: API.Constant, Self: State }>} model.from
   * @param {API.TryFrom<{ Input: State, Self: Self }>} model.to
   */
  constructor(model) {
    super(model)
    this.model = model
  }
  /**
   * @param {API.Constant} value
   */
  tryFrom(value) {
    const { from, to } = this.model
    const result = from.tryFrom(value)
    return result.error ? result : to.tryFrom(result.ok)
  }
}

/**
 * @template {{}} T
 * @extends {Schema<API.Link<T>>}
 * @implements {API.TryFrom<{ Self: API.Link<T>, Input: API.Constant }>}
 */
class LinkSchema extends Schema {
  /**
   * @param {API.Constant} value
   * @returns {API.Result<API.Link<T>, RangeError>}
   */
  tryFrom(value) {
    if (Link.isLink(value)) {
      return { ok: /** @type {any} */ (value) }
    } else {
      return { error: new RangeError(`Expected number, got ${typeof value}`) }
    }
  }
}

/**
 * @template {number} Self
 * @extends {Schema<Self>}
 * @implements {API.TryFrom<{ Self: Self, Input: API.Constant }>}
 */
class NumberSchema extends Schema {
  /**
   * @template {number} Self
   * @param {API.Constant} value
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
   * @param {API.Term<API.Entity>} model.entity
   * @param {API.Term<API.Attribute>} model.attribute
   * @returns {NumberAttribute<Self>}
   */
  bind(model) {
    return new NumberAttribute({ ...model, schema: this })
  }
  /**
   * @param {API.Constant} value
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
   * @param {API.TryFrom<{ Input: API.Constant, Self: T }>} model.base
   * @param {API.TryFrom<{ Input: T, Self: Self }>} model.constraint
   */
  constructor(model) {
    super(model)
    this.model = model
  }
  /**
   * @param {API.Constant} value
   */
  tryFrom(value) {
    const result = this.model.base.tryFrom(value)
    return result.error ? result : this.model.constraint.tryFrom(result.ok)
  }
}

/**
 * @template {string} Self
 * @extends {Schema<Self>}
 * @implements {API.TryFrom<{ Self: Self, Input: API.Constant }>}
 */
class StringSchema extends Schema {
  /**
   * @param {object} model
   * @param {API.Term<API.Entity>} model.entity
   * @param {API.Term<API.Attribute>} model.attribute
   * @returns {StringAttribute<Self>}
   */
  bind(model) {
    return new StringAttribute({ ...model, schema: this })
  }
  /**
   * @param {API.Constant} value
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
   * @param {API.TryFrom<{ Input: API.Constant, Self: T }>} model.base
   * @param {API.TryFrom<{ Input: T, Self: Self }>} model.constraint
   */
  constructor(model) {
    super(model)
    this.model = model
  }
  /**
   * @param {API.Constant} value
   */
  tryFrom(value) {
    const result = this.model.base.tryFrom(value)
    return result.error ? result : this.model.constraint.tryFrom(result.ok)
  }
}

/**
 * @template {boolean} T
 * @extends {Schema<T>}
 * @implements {API.TryFrom<{ Self: T, Input: API.Constant }>}
 */
class BooleanSchema extends Schema {
  /**
   * @param {API.Constant} value
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
 * @param {API.Variable} variable
 */
export const dependencies = function* (variable) {
  // If variable is the data attribute we need to make sure it is matched
  // to be materialized.
  if (variable instanceof DataAttribute) {
    yield variable.match()
  }
}

/**
 * @template {API.Constant} T
 * @extends {Schema<T>}
 */
class DataAttribute {
  /**
   * @param {object} model
   * @param {API.Variable<T>} model.schema
   * @param {API.Term<API.Attribute>} model.attribute
   * @param {API.Term<API.Entity>} model.entity
   */
  constructor(model) {
    this.model = model
  }

  [Symbol.toPrimitive]() {
    return getPropertyKey(this)
  }

  /**
   * @param {API.Constant} value
   * @returns {API.Result<T, Error>}
   */
  tryFrom(value) {
    return this.model.schema.tryFrom(value)
  }

  /**
   * @param {API.Term<API.Constant>} value
   * @returns {API.Pattern}
   */
  is(value) {
    return [this.model.entity, this.model.attribute, value]
  }

  /**
   * @returns {API.Pattern}
   */
  match() {
    return [this.model.entity, this.model.attribute, this]
  }

  /**
   * @template {T} Not
   * @param {Not} value
   * @returns {API.Pattern}
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
   * @returns {API.Pattern}
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
   * @returns {API.Pattern}
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
   * @returns {API.Pattern}
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
   * @returns {API.Pattern}
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
   * @returns {API.Pattern}
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
   * @returns {API.Pattern}
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

const ID = Symbol.for('entity/id')
/**
 * @typedef {{[ID]: number}} NewEntity
 * @typedef {[entity: NewEntity, attribute: API.Attribute, value: API.Constant|NewEntity]} Assert
 */

/**
 * @template {API.Bindings} Attributes
 * @extends {Schema<API.Entity>}
 */
class EntityView extends Schema {
  /**
   * @param {API.Constant} value
   * @returns {API.Result<API.Entity, RangeError>}
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
   * @param {Partial<{[Key in keyof Attributes]: API.Term}>} pattern
   * @returns {{where: API.Pattern[]}}
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

      where.push(/** @type {API.Pattern} */ ([this, key, term]))
    }

    return { where }
  }

  /**
   * @param {Partial<{[Key in keyof Attributes]: API.Constant|NewEntity}>} model
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
