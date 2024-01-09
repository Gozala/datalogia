import * as API from '../api.js'
import * as Instance from '../instance.js'

export const create = () => new OrderedSetRelation(new Map())

/**
 *
 * @param {Iterable<API.Instance>} instances
 */
export const from = (instances) => {
  const relation = create()
  for (const instance of instances) {
    relation.insert({}, instance)
  }

  return relation
}

/**
 * @implements {API.Relation}
 */
class OrderedSetRelation {
  /**
   *
   * @param {Map<string, API.Instance>} model
   */
  constructor(model) {
    this.model = model
  }
  get length() {
    return this.model.size
  }
  isEmpty() {
    return this.model.size === 0
  }
  /**
   * @param {Record<PropertyKey, API.Constant>} bindings
   * @returns {boolean}
   */
  contains(bindings) {
    for (const instance of this.model.values()) {
      for (const [key, value] of Object.entries(bindings)) {
        if (!Instance.row(instance, key)) {
          return false
        }
      }
    }
    return true
  }

  /**
   * @param {Record<PropertyKey, API.Constant>} bindings
   */
  *search(bindings) {
    const keys = Object.keys(bindings)
    for (const instance of this.model.values()) {
      if (keys.every((key) => Instance.row(instance, key))) {
        yield instance
      }
    }
  }

  purge() {
    this.model.clear()
  }

  /**
   *
   * @param {Record<PropertyKey, API.Constant>} _
   * @param {API.Instance} instance
   */
  insert(_, instance) {
    this.model.set(instance.link.toString(), instance)
  }

  /**
   * @param {API.Relation} relation
   */
  merge(relation) {
    if (relation instanceof OrderedSetRelation) {
      for (const instance of relation.model.values()) {
        this.model.set(instance.link.toString(), instance)
      }
    } else {
      throw new Error(`Attempted to merge incompatible relations`)
    }
  }
}
