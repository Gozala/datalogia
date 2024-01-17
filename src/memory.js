import * as API from './api.js'
import * as Link from './link.js'

/**
 * @param {object} source
 * @param {Iterable<API.Fact>} source.facts
 * @returns {API.Querier & API.Transactor}
 */
export const create = ({ facts } = { facts: [] }) => {
  const memory = new Memory()
  for (const fact of facts) {
    assert(memory, fact)
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
  for (const { assert: fact } of transaction) {
    assert(model, fact)
  }

  return { ok: model.data }
}

/**
 * @typedef {{data: Record<string, API.Fact[]>}} Model
 *
 * @param {Model} data
 * @param {API.Fact} fact
 */
export const assert = ({ data }, fact) => {
  const [entity, attribute, value] = fact
  // derive the fact identifier from the fact data
  const id = toKey([entity, attribute, value]).toString()

  // If the fact is not yet known we need to store it and index it.
  if (!(id in data)) {
    data[id] = [fact]

    // We also index new fact by each of its components so that we can
    // efficiently query by entity, attribute or value.
    const keys = [
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
      const index = data[id]
      if (index) {
        index.push(fact)
      } else {
        data[id] = [fact]
      }
    }
  }
}

class Memory {
  constructor() {
    /** @type {Record<string, API.Fact[]>} */
    this.data = Object.create(null)
  }

  /**
   * @param {API.Transaction} transaction
   */
  async transact(transaction) {
    return transact(this, transaction)
  }

  /**
   * @param {API.FactsSelector} selector
   */
  facts({ entity, attribute, value }) {
    const key = toKey([entity ?? null, attribute ?? null, value ?? null])
    return this.data[key.toString()] ?? []
  }
}
