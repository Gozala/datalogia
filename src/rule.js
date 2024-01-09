import * as API from './api.js'
import { isVariable, getPropertyKey, Schema } from './lib.js'

/**
 * @template {API.Bindings} Match
 *
 * @param {object} source
 * @param {Match} source.match
 * @param {API.Query[]} [source.where]
 */
export const rule = ({ match, where = [] }) =>
  new Rule({
    match,
    where: { and: where },
  })

/**
 * @template {API.Bindings} Match
 */
class Rule {
  /**
   * @param {object} source
   * @param {Match} source.match
   * @param {API.Query} source.where
   */
  constructor(source) {
    this.source = source
  }
  /**
   *
   * @param {{[K in keyof Match]: Match[K] extends API.Variable<infer T> ? API.Term<T> : Match[K]}} input
   * @returns {{apply: API.ApplyRule}}
   */
  match(input) {
    return {
      apply: { input, rule: this.source },
    }
  }
}

class RuleBodyBuilder {
  constructor() {
    /**
     * @type {Record<PropertyKey, RelationsBuilder>}
     */
    this.relations = {}
  }

  /**
   * @template {PropertyKey} ID
   * @param {ID} id
   * @param {API.Bindings} bindings
   */
  search(id, bindings) {
    const builder = RelationsBuilder.new()
    for (const [key, value] of Object.entries(bindings)) {
      builder.bind(key, value)
    }
    this.relations[id] = builder
  }

  /**
   * @template {PropertyKey} ID
   * @param {ID} id
   * @param {API.Link} link
   * @param {API.Bindings} bindings
   */
  searchLink(id, link, bindings) {
    const builder = RelationsBuilder.new()
    for (const [key, value] of Object.entries(bindings)) {
      builder.bind(key, value)
    }
    this.relations[id] = builder
  }
}

/**
 * @template {Record<PropertyKey, API.Term>} [Bindings=Record<PropertyKey, API.Term>]
 */
class RelationsBuilder {
  /**
   * @param {{}} [link]
   * @returns {RelationsBuilder<{}>}
   */
  static new(link) {
    return new RelationsBuilder(link ?? null, {})
  }
  /**
   * @param {{}|null} link
   * @param {Bindings} bindings
   */
  constructor(link, bindings) {
    this.link = link
    this.bindings = bindings
  }

  /**
   * @template {PropertyKey} ID
   * @template {API.Term} Value
   * @param {ID} id
   * @param {Value} term
   * @returns {RelationsBuilder<Bindings & {[key: ID]: Value}>}
   */
  bind(id, term) {
    Object.assign(this.bindings, { [id]: term })
    return this
  }

  /**
   * @param {unknown} relation
   * @param {{}} frame
   */

  build(relation, frame) {
    if (this.link) {
      if (isVariable(this.link)) {
        Object.assign(this.bindings, {
          [getPropertyKey(this.link)]: Schema.link(),
        })
      }
    }

    for (const [key, value] of Object.entries(this.bindings)) {
      if (isVariable(value)) {
        Object.assign(this.bindings, {
          [getPropertyKey(value)]: Schema.link(),
        })
      }
    }
  }
}

let RULE_APPLICATION_ID = 0

/**
 * @param {API.Rule} rule
 */
export const setup = (rule) => {
  // TODO: Generate new keys for all the variables inside the rule
  return rule
}

/**
 * @param {API.Rule} rule
 */
export const conclusion = (rule) => rule.match
