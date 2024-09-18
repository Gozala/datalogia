import * as API from './api.js'
import { Constant } from './lib.js'
import * as Link from './link.js'
import * as Fact from './fact.js'

/**
 * @param {{}} source
 */
export const entity = (source) => Link.of(source)

/**
 * @param {Iterable<API.Fact|API.Instantiation>} source
 * @returns {API.Querier & API.Transactor}
 */
export const create = (source = []) => {
  const memory = new Memory()
  for (const entry of source) {
    if (Array.isArray(entry)) {
      associate(memory, /** @type {API.Fact} */ (entry))
    } else {
      for (const fact of Fact.derive(
        /** @type {API.Instantiation} */ (entry)
      )) {
        associate(memory, fact)
      }
    }
  }

  return memory
}

/**
 * @param {[API.Entity|null, API.Attribute|null, API.Constant|null]} model
 */
export const toLink = ([entity, attribute, value]) =>
  Link.of([entity, attribute, value])

/**
 * @param {[API.Entity|null, API.Attribute|null, API.Constant|null]} model
 */
export const toKey = (model) => toLink(model).toString()

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
    } else if (instruction.Disassociate) {
      dissociate(model, instruction.Disassociate)
    } else if (instruction.Add) {
      for (const fact of Fact.derive(instruction.Add)) {
        associate(model, fact)
      }
    }
  }

  return { ok: model.data }
}

/**
 *
 * @param {API.Fact} fact
 */

const toKeys = ([entity, attribute, value]) => [
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

/**
 * @typedef {object} Model
 * @property {Record<string, API.Fact>} data
 * @property {Record<string, Record<string, API.Fact>>} index
 *
 *
 * @param {Model} data
 * @param {API.Fact} fact
 */
const associate = ({ data, index }, fact) => {
  const [entity, attribute, value] = fact
  // derive the fact identifier from the fact data
  const id = toKey([entity, attribute, value])

  // If the fact is not yet known we need to store it and index it.
  if (!(id in data)) {
    data[id] = fact

    // We also index new fact by each of its components so that we can
    // efficiently query by entity, attribute or value.
    const keys = [id, ...toKeys([entity, attribute, value])]

    for (const key of keys) {
      // If we already have some facts in this index we add a new fact,
      // otherwise we create a new index.
      const facts = index[key]
      if (facts) {
        facts[id] = fact
      } else {
        index[key] = { [id]: fact }
      }
    }
  }

  return id
}

/**
 * @param {Model} data
 * @param {API.Fact} fact
 */
export const dissociate = ({ data, index }, fact) => {
  const [entity, attribute, value] = fact
  // derive the fact identifier from the fact data
  const id = toKey([entity, attribute, value])

  // If the fact is not yet known we need to store it and index it.
  if (id in data) {
    delete data[id]

    // We also need to delete fact from the index.
    const keys = [id, ...toKeys([entity, attribute, value])]

    for (const key of keys) {
      // If we already have some facts in this index we add a new fact,
      // otherwise we create a new index.
      delete index[key][id]
    }
  }
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
    const key = toLink([entity ?? null, attribute ?? null, value ?? null])
    return Object.values(this.model.index[key.toString()] ?? {})
  }
}
