import * as API from './api.js'
import * as Table from './logic/table.js'
import * as Row from './logic/row.js'
import * as Variable from './variable.js'
import * as Clause from './clause.js'
import * as Schema from './dsl.js'
import * as Constant from './constant.js'

/**
 * @template {API.Variables} Match
 *
 * @param {object} source
 * @param {Match} source.match
 * @param {API.Clause[]} [source.where]
 */
export const rule = ({ match, where = [] }) =>
  new Rule({
    match,
    where: { And: where },
  })

/**
 * @template {API.Variables} Match
 *
 * @param {object} source
 * @param {Match} source.match
 * @param {API.Clause[]} [source.where]
 */
const build = ({ match, where = [] }) => {
  const builder = new RuleBodyBuilder()

  for (const variable of Clause.variables({ And: where })) {
  }

  builder.search('self', match)
}

/**
 * @template {API.Variables} Match
 */
export class Rule {
  /**
   * @param {object} source
   * @param {Match} source.match
   * @param {API.Clause} source.where
   */
  constructor(source) {
    this.source = source
  }
  /**
   *
   * @param {{[K in keyof Match]: Match[K] extends API.Variable<infer T> ? API.Term<T> : Match[K]}} input
   * @returns {API.Clause}
   */
  match(input) {
    return {
      Rule: { input, rule: this.source },
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
   * @param {API.Variables} bindings
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
   * @param {API.Variables} bindings
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
      if (Variable.is(this.link)) {
        Object.assign(this.bindings, {
          [Variable.toKey(this.link)]: Schema.link(),
        })
      }
    }

    for (const [key, value] of Object.entries(this.bindings)) {
      if (Variable.is(value)) {
        Object.assign(this.bindings, {
          [Variable.toKey(value)]: Schema.link(),
        })
      }
    }
  }
}

let RULE_APPLICATION_ID = 0

/**
 * @param {API.Rule} rule
 */
export const setup = (rule) => renameVariablesIn(rule, {})

/**
 *
 * @param {API.Rule} rule
 * @param {Record<string, API.Variable>} table
 */
const renameVariablesIn = (rule, table = {}) => {
  const match = renameSelectorVariables(rule.match, table)
  const where = renameClauseVariables(rule.where, table)
  return { match, where }
}

/**
 * @param {API.Selector} selector
 * @param {Record<string, API.Variable>} table
 * @returns {API.Selector}
 */
const renameSelectorVariables = (selector, table) =>
  Object.fromEntries(
    Object.entries(selector).map(([key, member]) => [
      key,
      Variable.is(member)
        ? renameVariable(member, table)
        : Constant.is(member)
          ? member
          : renameSelectorVariables(member, table),
    ])
  )

/**
 *
 * @param {API.Clause} clause
 * @param {Record<string, API.Variable>} table
 * @returns {API.Clause}
 */
export const renameClauseVariables = (clause, table) => {
  if (clause.And) {
    return { And: clause.And.map(($) => renameClauseVariables($, table)) }
  } else if (clause.Or) {
    return { Or: clause.Or.map(($) => renameClauseVariables($, table)) }
  } else if (clause.Not) {
    return { Not: renameClauseVariables(clause.Not, table) }
  } else if (clause.Form) {
    return {
      Form: {
        selector: renameSelectorVariables(clause.Form.selector, table),
        confirm: clause.Form.confirm,
      },
    }
  } else if (clause.Case) {
    const [entity, attribute, value] = clause.Case
    return {
      Case: [
        renameTermVariable(entity, table),
        renameTermVariable(attribute, table),
        renameTermVariable(value, table),
      ],
    }
  } else if (clause.Rule) {
    return {
      Rule: {
        input: renameSelectorVariables(clause.Rule.input, table),
        rule: clause.Rule.rule,
      },
    }
  } else {
    return clause
  }
}

/**
 * @template {API.Term} T
 * @param {T} term
 * @param {Record<string, API.Variable>} table
 * @returns {T}
 */
const renameTermVariable = (term, table) =>
  Variable.is(term) ? renameVariable(term, table) : term

/**
 * @template {API.Variable} T
 * @param {T} variable
 * @param {Record<string, API.Variable>} table
 * @returns {T}
 */
const renameVariable = (variable, table) => {
  const id = Variable.id(variable)
  const type = Variable.toType(variable)
  if (table[id] == null) {
    table[id] = Variable.variable(type)
  }
  return /** @type {T} */ (table[id])
}

/**
 * @param {API.Rule} rule
 */
export const conclusion = (rule) => rule.match

/**
 * @param {API.Rule} rule
 */
export const body = (rule) => rule.where

/**
 * @template {API.Variables} Bindings
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
   * @template {API.Variables} Ext
   * @param {Ext} bindings
   * @returns {HeadBuilder<Bindings & Ext>}
   */
  bind(bindings) {
    return Object.assign(/** @type {HeadBuilder<API.Variables>} */ (this), {
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
        const type = variables[Variable.toKey(term)]
        if (type) {
          const result = Row.Type.unify(type, row.type)
          const result2 = result.ok
            ? // @ts-expect-error - TODO: Fix this
              Row.Type.unify(result.ok, Variable.toType(term))
            : result
        } else {
          throw new RangeError(
            `Clause not range restricted ${rowID} ${Variable.toKey(
              term
            ).toString()}`
          )
        }
      } else {
        const result = Row.Type.check(row.type, term)
        if (result.error) {
          throw new TypeError(
            `Row type conflict ${this.relation.id} ${rowID} : ${result.error.message}`
          )
        }
      }
    }
  }
}
