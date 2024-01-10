import * as API from '../api.js'
import * as Instance from '../association.js'

export const create = () => new OrderedSetRelation(new Map())

/**
 *
 * @param {Iterable<API.Association>} instances
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
   * @param {Map<string, API.Association>} model
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
        if (!Instance.get(instance, key)) {
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
      if (keys.every((key) => Instance.get(instance, key))) {
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
   * @param {API.Association} instance
   */
  insert(_, instance) {
    this.model.set(Instance.link(instance).toString(), instance)
  }

  /**
   * @param {API.Relation} relation
   */
  merge(relation) {
    if (relation instanceof OrderedSetRelation) {
      for (const instance of relation.model.values()) {
        this.model.set(Instance.link(instance).toString(), instance)
      }
    } else {
      throw new Error(`Attempted to merge incompatible relations`)
    }
  }
}
