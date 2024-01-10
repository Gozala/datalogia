import * as API from './api.js'
import { VARIABLE_ID, getPropertyKey } from './variable.js'
import * as Link from './link.js'
import { entries } from './object.js'

/**
 * @param {unknown} x
 * @returns {x is _}
 */
export const isBlank = (x) => x === _

/**
 * @template {API.Constant} T
 * @typedef {T extends number ? Int32Attribute<T> :
 *           T extends string ? StringAttribute<T> :
 *           DataAttribute<T>} InferAttributeField
 */

/**
 * @template {Record<PropertyKey, API.Variable>} Attributes
 * @typedef {{[Key in keyof Attributes]: Attributes[Key] extends API.Variable<infer T> ? InferAttributeField<T> : never}} InferEntityFields
 */

/**
 * @template {API.Variables} Attributes
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
   * @param {API.VariableID} [model.id]
   */
  constructor({ id } = {}) {
    this[VARIABLE_ID] = id
  }

  /**
   * @returns {API.RowType}
   */
  get type() {
    return { Any: this }
  }

  get $() {
    return getPropertyKey(this)
  }

  get id() {
    return this[VARIABLE_ID]
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
}

/**
 * @template {API.Constant} Self
 * @template State
 * @extends {Schema<Self>}
 */
class SchemaPipeline extends Schema {
  /**
   * @param {object} model
   * @param {API.VariableID} [model.id]
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
 * @template {API.Constant} T
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

  get type() {
    return this.model.schema.type
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
   * @returns {API.Clause}
   */
  is(value) {
    return { match: [this.model.entity, this.model.attribute, value] }
  }

  /**
   * @returns {API.Clause}
   */
  match() {
    return { match: [this.model.entity, this.model.attribute, this] }
  }

  /**
   * @template {T} Not
   * @param {Not} value
   * @returns {API.Clause}
   */
  not(value) {
    return {
      match: [
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
      ],
    }
  }
}

/**
 * @template {API.Int32} Self
 * @extends {Schema<Self>}
 * @implements {API.TryFrom<{ Self: Self, Input: API.Constant }>}
 */
class Int32 extends Schema {
  /**
   * @returns {API.Type}
   */
  get type() {
    return { Int32: this }
  }

  /**
   * @param {object} model
   * @param {API.Term<API.Entity>} model.entity
   * @param {API.Term<API.Attribute>} model.attribute
   * @returns {Int32Attribute<Self>}
   */
  bind(model) {
    return new Int32Attribute({ ...model, schema: this })
  }
  /**
   * @param {API.Constant} value
   * @returns {API.Result<Self, RangeError>}
   */
  tryFrom(value) {
    if (Number.isInteger(value)) {
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
    return new ToInt32({ base: this, constraint })
  }
}

/**
 * @template {API.Int32} T
 * @template {API.Int32} Self
 * @extends {Int32<Self>}
 */
class ToInt32 extends Int32 {
  /**
   * @param {object} model
   * @param {API.VariableID} [model.id]
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
 * @template {number} Self
 * @extends {DataAttribute<Self>}
 */
class Int32Attribute extends DataAttribute {
  /**
   * @param {number} value
   * @returns {API.Clause}
   */
  greaterThan(value) {
    return {
      match: [
        this.model.entity,
        this.model.attribute,
        new ToInt32({
          base: this.model.schema,
          constraint: {
            tryFrom: (x) => {
              return x > value
                ? { ok: x }
                : { error: new RangeError(`Expected ${x} > ${value}`) }
            },
          },
        }),
      ],
    }
  }

  /**
   * @param {number} value
   * @returns {API.Clause}
   */
  lessThan(value) {
    return {
      match: [
        this.model.entity,
        this.model.attribute,
        new ToInt32({
          base: this.model.schema,
          constraint: {
            tryFrom: (x) => {
              return x < value
                ? { ok: x }
                : { error: new RangeError(`Expected ${x} > ${value}`) }
            },
          },
        }),
      ],
    }
  }
}

/**
 * @template {API.Float32} Self
 * @extends {Schema<Self>}
 * @implements {API.TryFrom<{ Self: Self, Input: API.Constant }>}
 */
class Float extends Schema {
  /**
   * @returns {API.Type}
   */
  get type() {
    return { Float32: this }
  }

  /**
   * @param {object} model
   * @param {API.Term<API.Entity>} model.entity
   * @param {API.Term<API.Attribute>} model.attribute
   * @returns {FloatAttribute<Self>}
   */
  bind(model) {
    return new FloatAttribute({ ...model, schema: this })
  }
  /**
   * @param {API.Constant} value
   * @returns {API.Result<Self, RangeError>}
   */
  tryFrom(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return { ok: /** @type {Self} */ (value) }
    } else {
      return { error: new RangeError(`Expected float, got ${typeof value}`) }
    }
  }

  /**
   * @template {API.Float32} Refined
   * @param {API.TryFrom<{ Input: Self, Self: Refined }>} constraint
   */
  refine(constraint) {
    return new ToFloat({ base: this, constraint })
  }
}

/**
 * @template {API.Float32} T
 * @template {API.Float32} Self
 * @extends {Float<Self>}
 */
class ToFloat extends Float {
  /**
   * @param {object} model
   * @param {API.VariableID} [model.id]
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
 * @template {API.Float32} Self
 * @extends {DataAttribute<Self>}
 */
class FloatAttribute extends DataAttribute {
  /**
   * @param {number} value
   * @returns {API.Clause}
   */
  greaterThan(value) {
    return {
      match: [
        this.model.entity,
        this.model.attribute,
        new ToFloat({
          base: this.model.schema,
          constraint: {
            tryFrom: (x) => {
              return x > value
                ? { ok: x }
                : { error: new RangeError(`Expected ${x} > ${value}`) }
            },
          },
        }),
      ],
    }
  }

  /**
   * @param {number} value
   * @returns {API.Clause}
   */
  lessThan(value) {
    return {
      match: [
        this.model.entity,
        this.model.attribute,
        new ToFloat({
          base: this.model.schema,
          constraint: {
            tryFrom: (x) => {
              return x < value
                ? { ok: x }
                : { error: new RangeError(`Expected ${x} > ${value}`) }
            },
          },
        }),
      ],
    }
  }
}

/**
 * @template {API.Int64} Self
 * @extends {Schema<Self>}
 * @implements {API.TryFrom<{ Self: Self, Input: API.Constant }>}
 */
class Int64 extends Schema {
  /**
   * @returns {API.Type}
   */
  get type() {
    return { Int64: this }
  }

  /**
   * @param {object} model
   * @param {API.Term<API.Entity>} model.entity
   * @param {API.Term<API.Attribute>} model.attribute
   * @returns {Int64Attribute<Self>}
   */
  bind(model) {
    return new Int64Attribute({ ...model, schema: this })
  }
  /**
   * @param {API.Constant} value
   * @returns {API.Result<Self, RangeError>}
   */
  tryFrom(value) {
    if (typeof value === 'bigint') {
      return { ok: /** @type {Self} */ (value) }
    } else {
      return { error: new RangeError(`Expected number, got ${typeof value}`) }
    }
  }

  /**
   * @template {API.Int64} Refined
   * @param {API.TryFrom<{ Input: Self, Self: Refined }>} constraint
   */
  refine(constraint) {
    return new ToInt64({ base: this, constraint })
  }
}

/**
 * @template {API.Int64} T
 * @template {API.Int64} Self
 * @extends {Int64<Self>}
 */
class ToInt64 extends Int64 {
  /**
   * @param {object} model
   * @param {API.VariableID} [model.id]
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
 * @template {API.Int64} Self
 * @extends {DataAttribute<Self>}
 */
class Int64Attribute extends DataAttribute {
  /**
   * @param {API.Int64} value
   * @returns {API.Clause}
   */
  greaterThan(value) {
    return {
      match: [
        this.model.entity,
        this.model.attribute,
        new ToInt64({
          base: this.model.schema,
          constraint: {
            tryFrom: (x) => {
              return x > value
                ? { ok: x }
                : { error: new RangeError(`Expected ${x} > ${value}`) }
            },
          },
        }),
      ],
    }
  }

  /**
   * @param {API.Int64} value
   * @returns {API.Clause}
   */
  lessThan(value) {
    return {
      match: [
        this.model.entity,
        this.model.attribute,
        new ToInt64({
          base: this.model.schema,
          constraint: {
            tryFrom: (x) => {
              return x < value
                ? { ok: x }
                : { error: new RangeError(`Expected ${x} > ${value}`) }
            },
          },
        }),
      ],
    }
  }
}

/**
 * @template {string} Self
 * @extends {Schema<Self>}
 * @implements {API.TryFrom<{ Self: Self, Input: API.Constant }>}
 */
class StringSchema extends Schema {
  /**
   * @returns {API.Type}
   */
  get type() {
    return { String: this }
  }
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
   * @param {API.VariableID} [model.id]
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
 * @template {string} T
 * @extends {DataAttribute<T>}
 */
class StringAttribute extends DataAttribute {
  /**
   * @template {string} Prefix
   * @param {Prefix} prefix
   * @returns {API.Clause}
   */
  startsWith(prefix) {
    return {
      match: [
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
      ],
    }
  }
  /**
   * @template {string} Prefix
   * @param {Prefix} prefix
   * @returns {API.Clause}
   */
  doesNotStartsWith(prefix) {
    return {
      match: [
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
      ],
    }
  }
  /**
   * @template {string} Suffix
   * @param {Suffix} suffix
   * @returns {API.Clause}
   */
  endsWith(suffix) {
    return {
      match: [
        this.model.entity,
        this.model.attribute,
        new ToStringSchema({
          base: this.model.schema,
          constraint: {
            tryFrom: (x) => {
              return x.endsWith(suffix)
                ? { ok: x }
                : {
                    error: new RangeError(
                      `Expected ${x} to end with ${suffix}`
                    ),
                  }
            },
          },
        }),
      ],
    }
  }
  /**
   * @param {string} chunk
   * @returns {API.Clause}
   */
  includes(chunk) {
    return {
      match: [
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
      ],
    }
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
 * @template {boolean} T
 * @extends {Schema<T>}
 * @implements {API.TryFrom<{ Self: T, Input: API.Constant }>}
 */
class BooleanSchema extends Schema {
  /**
   * @returns {API.Type}
   */
  get type() {
    return { Boolean: this }
  }
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
 * @template {{}|null} T
 * @extends {Schema<API.Link<T>>}
 * @implements {API.TryFrom<{ Self: API.Link<T>, Input: API.Constant }>}
 */
class LinkSchema extends Schema {
  /**
   * @param {API.Constant} value
   * @returns {API.Result<API.Link<T>, RangeError>}
   */
  tryFrom(value) {
    if (Link.is(value)) {
      return { ok: /** @type {any} */ (value) }
    } else {
      return { error: new RangeError(`Expected number, got ${typeof value}`) }
    }
  }
}

/**
 * @template {API.Bytes} Self
 * @extends {Schema<Self>}
 * @implements {API.TryFrom<{ Self: Self, Input: API.Constant }>}
 */
class Bytes extends Schema {
  /**
   * @param {API.Constant} value
   * @returns {API.Result<Self, RangeError>}
   */
  tryFrom(value) {
    if (value instanceof Uint8Array) {
      return { ok: /** @type {Self} */ (value) }
    } else {
      return { error: new RangeError(`Expected bytes, got ${typeof value}`) }
    }
  }
}

/**
 * @param {API.Term} variable
 */
export const dependencies = function* (variable) {
  // If variable is the data attribute we need to make sure it is matched
  // to be materialized.
  if (variable instanceof DataAttribute) {
    yield variable.match()
  }
}

const ID = Symbol.for('entity/id')
/**
 * @typedef {{[ID]: number}} NewEntity
 * @typedef {[entity: NewEntity, attribute: API.Attribute, value: API.Constant|NewEntity]} Assert
 */

/**
 * @template {API.Variables} Attributes
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
   * @returns {{where: API.Clause[]}}
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

      where.push(/** @type {API.Clause} */ ({ match: [this, key, term] }))
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

export const link = () => new LinkSchema()

export const bytes = () => new Bytes()

export const string = () => new StringSchema()

export const integer = () => new Int32()

export const float = () => new Float()

export const boolean = () => new BooleanSchema()

/**
 * @type {API.Variable<any>} T
 */
export const _ = new Schema({ id: 0 })
