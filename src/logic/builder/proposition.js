import * as API from '../../api.js'
import * as Variable from '../../variable.js'
import * as Table from '../table.js'
import * as Row from '../row.js'

/**
 * @template {API.Selector} Variables
 * @typedef {object} Model
 * @property {API.Declaration} relation
 * @property {Variables} variables
 */

/**
 * Creates a proposition builder for the given relation. For example consider
 * following relation `Point({ x: Integer, y: Integer })` this builder could
 * to build `Point` propositions as shown in the example below.
 *
 * @example
 * ```js
 * Proposition.create(Point).bind({ x: 1 }).bind({ y: 2 }).build()
 * ```
 *
 * @param {API.Declaration} relation
 * @returns
 */
const create = (relation) =>
  new PropositionBuilder({
    relation,
    variables: {},
  })

/**
 *
 * @template {API.Selector} Variables
 * @param {API.Declaration} relation
 * @param {(builder: PropositionBuilder<{}>) => PropositionBuilder<Variables>} assemble
 * @returns {API.Result<API.InferBindings<Variables>, Error>}
 */
export const build = (relation, assemble) => assemble(create(relation)).build()

/**
 * @template {API.Selector} Variables
 */
class PropositionBuilder {
  /**
   * @param {Model<Variables>} model
   */
  constructor(model) {
    this.model = model
  }
  get variables() {
    return this.model.variables
  }
  /**
   * @template {API.Selector} Extension
   * @param {Extension} bindings
   * @returns {PropositionBuilder<Variables & Extension>}
   */
  bind(bindings) {
    Object.assign(this.model.variables, bindings)
    return /** @type {any} */ (this)
  }
  /**
   *
   * @returns {API.Result<API.InferBindings<Variables>, Error>}
   */
  build() {
    const schema = this.model.relation.schema
    /** @type {API.Bindings} */
    const proposition = {}
    for (const [rowID, term] of Object.entries(this.variables)) {
      if (Variable.is(term)) {
        return { error: new Error(`Expected all bindings to be constants`) }
      } else {
        const row = Table.getRow(schema, rowID)
        if (!row) {
          return {
            error: new Error(
              `Unrecognized row ${this.model.relation.id}.${rowID}`
            ),
          }
        }

        if (rowID in proposition) {
          return {
            error: new Error(
              `Conflicting row ${this.model.relation.id}.${rowID}`
            ),
          }
        }

        if (Row.check(row, term).error) {
          return {
            error: new Error(
              `Invalid binding for row ${this.model.relation.id}.${rowID}, types do not match`
            ),
          }
        }
      }

      proposition[rowID] = term
    }

    for (const id of Object.keys(schema.rows)) {
      if (!(id in proposition)) {
        return {
          error: new Error(
            `Missing attribute for ${this.model.relation.id}.${id}`
          ),
        }
      }
    }

    if (this.model.relation.source.Edb) {
      return { error: new Error(`Cannot bind to EDB relation`) }
    }

    return {
      ok: /** @type {API.InferBindings<Variables>} */ (proposition),
    }
  }
}
