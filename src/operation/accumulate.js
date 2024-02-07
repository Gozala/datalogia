import * as API from '../api.js'
import { entries } from '../object.js'
import * as Bindings from '../bindings.js'
import * as Selector from '../selector.js'
import * as Where from '../where.js'
import * as Variable from '../variable.js'

/**
 * @template {API.Constant} T
 * @template {API.Variables} Variables
 * @param {API.Accumulate<T, Variables>} source
 */
export const create = (source) => new Accumulate(source)

/**
 * @param {API.Accumulate} self
 * @param {API.Bindings} bindings
 * @returns {API.Result<API.Bindings, Error>}
 */
export const apply = (self, bindings) => {
  /** @type {API.Bindings} */
  const groupByValues = {}
  for (const [id, term] of entries(self.groupByRows)) {
    const value = Bindings.get(bindings, term)
    if (value == null) {
      return { error: new Error(`Expected term ${term} to resolve a binding`) }
    }
    groupByValues[id] = value
  }

  let aggregate = self.aggregator.init()
  for (const association of self.relation.search(groupByValues)) {
    /** @type {API.Bindings} */
    let match = {}
    for (const [id, term] of Object.entries(association.attributes)) {
      const value = Bindings.get(bindings, term)
      if (value == null) {
        return {
          error: new Error(`Expected term ${term} to resolve a binding`),
        }
      }

      match = Bindings.insert(
        match,
        { Relation: { id: self.id, alias: self.alias, row: id } },
        value
      )
    }

    /** @type {API.Bindings} */
    let input = {}
    for (const [id, term] of Object.entries(association.attributes)) {
      const value = Bindings.get(match, term)
      if (value == null) {
        return {
          error: new Error(
            `Attribute for aggregation ${term} failed to resolve`
          ),
        }
      }

      input[id] = value
    }

    const step = self.aggregator.step(aggregate, input)
    if (step.error) {
      return step
    } else {
      aggregate = step.ok
    }
  }

  const result = self.aggregator.end(aggregate)
  if (result.error) {
    return result
  }

  let next = { ...bindings }

  next = Bindings.insert(
    next,
    {
      Aggregate: { id: self.id, alias: self.alias, variable: self.target },
    },
    result.ok
  )

  return { ok: next }
}

/**
 * @param {API.Accumulate} self
 */
export const toString = (self) => {
  const select = Selector.toString(self.variables)
  const where = Where.toString(self.when)
  const into = Variable.toString(self.target)

  return `{accumulate: {select:${select}, where:${where}, into:${into} }`
}

/**
 * @template {API.Constant} T
 * @template {API.Variables} Variables
 */
class Accumulate {
  /**
   * @param {API.Accumulate<T, Variables>} model
   */
  constructor(model) {
    this.model = model
  }

  get variables() {
    return this.model.variables
  }

  get aggregator() {
    return this.model.aggregator
  }

  get groupByRows() {
    return this.model.groupByRows
  }

  get target() {
    return this.model.target
  }

  get id() {
    return this.model.id
  }
  get alias() {
    return this.model.alias
  }
  get when() {
    return this.model.when
  }
  get operation() {
    return this.model.operation
  }
}
