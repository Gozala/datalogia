import * as API from './api.js'
import { iterateVariables } from './lib.js'
import * as Table from './table.js'
import * as Row from './row.js'
import * as Variable from './variable.js'

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
 *
 * @param {object} source
 * @param {Match} source.match
 * @param {API.Query[]} [source.where]
 */
const build = ({ match, where = [] }) => {
  const builder = new RuleBodyBuilder()

  for (const variable of iterateVariables({ and: where })) {
  }

  builder.search('self', match)
}

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

/**
 * @template {API.Bindings} Bindings
 */
class HeadBuilder {
  /**
   * @param {object} source
   * @param {API.Declaration} source.relation
   */
  static new({ relation }) {
    return new HeadBuilder({ relation, bindings: {} })
  }
  /**
   * @param {object} model
   * @param {API.Declaration} model.relation
   * @param {Bindings} model.bindings
   */
  constructor({ bindings, relation }) {
    this.relation = relation
    this.bindings = bindings
  }
  /**
   * @template {API.Bindings} Ext
   * @param {Ext} bindings
   * @returns {HeadBuilder<Bindings & Ext>}
   */
  bind(bindings) {
    return Object.assign(/** @type {HeadBuilder<API.Bindings>} */ (this), {
      bindings: Object.assign(this.bindings, bindings),
    })
  }

  /**
   * @param {Record<PropertyKey, API.RowType>} variables
   */
  build(variables) {
    const table = this.relation.schema
    const rows = {}

    for (const [rowID, term] of Object.entries(this.bindings)) {
      const row = Table.getRow(table, rowID)
      if (!row) {
        throw new RangeError(`Invalid row ${this.relation.id}.${rowID}`)
      }

      if (rows.hasOwnProperty(rowID)) {
        throw new RangeError(`Duplicate row ${this.relation.id}.${rowID}`)
      }

      if (Variable.is(term)) {
        const type = variables[Variable.id(term)]
        if (type) {
          const result = Row.unify(type, row.type)
          const result2 = result.ok
            ? Row.unify(result.ok, Variable.type(term))
            : result
        } else {
          throw new RangeError(
            `Clause not range restricted ${rowID} ${getPropertyKey(
              term
            ).toString()}`
          )
        }
      } else {
        const result = Row.check(row.type, term)
        if (result.error) {
          throw new TypeError(
            `Row type conflict ${this.relation.id} ${rowID} : ${result.error.message}`
          )
        }
      }
    }
  }
}
