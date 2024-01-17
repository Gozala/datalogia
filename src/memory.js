import * as API from './api.js'
import { Constant } from './lib.js'
import * as Link from './link.js'

/**
 * @param {object} source
 * @param {Iterable<API.Fact>} source.facts
 * @returns {API.Querier & API.Transactor}
 */
export const create = ({ facts } = { facts: [] }) => {
  const memory = new Memory()
  for (const fact of facts) {
    associate(memory, fact)
  }

  return memory
}

/**
 * @param {[API.Entity|null, API.Attribute|null, API.Constant|null]} model
 */
export const toKey = ([entity, attribute, value]) =>
  Link.of([entity, attribute, value])

/**
 *
 * @param {Model} model
 * @param {API.Transaction} transaction
 * @returns {API.Result<{}, Error>}
 */
export const transact = (model, transaction) => {
  for (const instruction of transaction) {
    if (instruction.Associate) {
      associate(model, instruction.Associate)
    } else if (instruction.Add) {
      add(model, instruction.Add)
    }
  }

  return { ok: model.data }
}

/**
 * @typedef {object} Model
 * @property {Record<string, API.Fact>} data
 * @property {Record<string, API.Fact[]>} index
 *
 *
 * @param {Model} data
 * @param {API.Fact} fact
 */
export const associate = ({ data, index }, fact) => {
  const [entity, attribute, value] = fact
  // derive the fact identifier from the fact data
  const key = toKey([entity, attribute, value])
  const id = key.toString()

  // If the fact is not yet known we need to store it and index it.
  if (!(id in data)) {
    data[id] = fact

    // We also index new fact by each of its components so that we can
    // efficiently query by entity, attribute or value.
    const keys = [
      key,
      // by entity
      toKey([entity, null, null]),
      toKey([entity, attribute, null]),
      toKey([entity, null, value]),
      // by attribute
      toKey([null, attribute, null]),
      toKey([null, attribute, value]),
      // by value
      toKey([null, null, value]),
    ]

    for (const key of keys) {
      const id = key.toString()
      // If we already have some facts in this index we add a new fact,
      // otherwise we create a new index.
      const facts = index[id]
      if (facts) {
        facts.push(fact)
      } else {
        index[id] = [fact]
      }
    }
  }

  return key
}

/**
 * @param {Model} model
 * @param {API.Instantiation} association
 */
export const add = (model, association) => {
  /** @type {Record<string, API.Constant|API.Constant[]>} */
  const entity = {}
  /** @type {Array<[API.Attribute, API.Constant]>} */
  const attributes = []
  for (const [key, value] of Object.entries(association)) {
    switch (typeof value) {
      case 'boolean':
      case 'number':
      case 'bigint':
      case 'string':
        entity[key] = value
        attributes.push([key, value])
        break
      case 'object': {
        if (Constant.is(value)) {
          entity[key] = value
          attributes.push([key, value])
        } else if (Array.isArray(value)) {
          const values = []
          for (const member of value) {
            if (Constant.is(member)) {
              attributes.push([key, member])
              values.push(member)
            } else {
              const entity = add(model, member)
              attributes.push([key, entity])
              values.push(entity)
            }
            entity[key] = values.sort(Constant.compare)
          }
        } else {
          const link = add(model, value)
          entity[key] = link
          attributes.push([key, link])
        }
        break
      }
      default:
        throw new TypeError(`Unsupported value type: ${value}`)
    }
  }

  const link = Link.of(entity)
  for (const [attribute, value] of attributes) {
    associate(model, [link, attribute, value])
  }

  return link
}

class Memory {
  constructor() {
    /** @type {Model} */
    this.model = {
      data: Object.create(null),
      index: Object.create(null),
    }
  }
  get index() {
    return this.model.index
  }
  get data() {
    return this.model.data
  }

  /**
   * @param {API.Transaction} transaction
   */
  async transact(transaction) {
    return transact(this.model, transaction)
  }

  /**
   * @param {API.FactsSelector} selector
   */
  facts({ entity, attribute, value }) {
    const key = toKey([entity ?? null, attribute ?? null, value ?? null])
    return this.model.index[key.toString()] ?? []
  }
}
