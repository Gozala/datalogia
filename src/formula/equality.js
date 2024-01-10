import * as API from '../api.js'
import * as Term from '../term.js'
import * as Bindings from '../bindings.js'
import * as Constant from '../constant.js'

/**
 * @param {API.Equality} source
 */
export const create = (source) => new Equality(source)

/**
 *
 * @param {API.Equality} model
 * @param {API.Bindings} bindings
 */
export const conform = ({ operand, modifier }, bindings) => {
  const expect = Bindings.get(bindings, operand)
  const actual = Bindings.get(bindings, modifier)
  if (expect != null && actual != null && Constant.equal(expect, actual)) {
    return { ok: {} }
  } else if (expect === actual) {
    return { ok: {} }
  } else {
    return { error: new RangeError(`Expected ${expect} but got ${actual}`) }
  }
}

/**
 * @param {API.Equality} self
 */
export const toString = ({ operand, modifier }) =>
  `{not:{operand:${Term.toString(operand)}, modifier: ${Term.toString(
    modifier
  )}}}`

class Equality {
  /**
   * @param {API.Equality} model
   */
  constructor(model) {
    this.model = model
  }
  get operand() {
    return this.model.operand
  }
  get modifier() {
    return this.model.modifier
  }
  toString() {
    return toString(this)
  }
}
