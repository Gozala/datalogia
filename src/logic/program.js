import * as API from '../api.js'

/**
 * @param {API.Program} source
 */
export const create = (source) => new Program(source)

class Program {
  /**
   * @param {API.Program} model
   */
  constructor(model) {
    this.model = model
  }
  get declarations() {
    return this.model.declarations
  }
  get expressions() {
    return this.model.expressions
  }
}
