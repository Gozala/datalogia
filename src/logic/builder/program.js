import * as API from '../../api.js'
import * as Program from '../program.js'
import * as Declaration from './declaration.js'

/**
 * @typedef {object} Model
 * @property {Record<string, API.Declaration>} relations
 * @property {API.Expression[]} clauses
 */
export const create = () => new ProgramBuilder({ relations: {}, clauses: [] })

/**
 *
 * @param {(builder: ProgramBuilder) => ProgramBuilder} assemble
 * @returns
 */
export const build = (assemble) => assemble(create()).build()

class ProgramBuilder {
  /**
   * @param {Model} model
   */
  constructor(model) {
    this.model = model
  }

  /**
   * @returns {API.Result<API.Program, Error>}
   */
  build() {
    const program = Program.create({
      declarations: Object.values(this.model.relations),
      expressions: this.model.clauses,
    })

    return { ok: program }
  }

  /**
   * @param {string} id
   * @param {(builder: Declaration.Builder) => Declaration.Builder} assemble
   */
  input(id, assemble) {
    this.indexedInput(id, assemble)
  }
  /**
   * @param {string} id
   * @param {(builder: Declaration.Builder) => Declaration.Builder} assemble
   */
  indexedInput(id, assemble) {}
}
