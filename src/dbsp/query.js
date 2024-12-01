import * as API from '../api.js'
import * as Variable from '../variable.js'
import * as Term from '../term.js'
import * as Constant from '../constant.js'

class View {
  /**
   * @type {Map<API.Fact, number>}
   */
  facts = new Map()

  /**
   * @param {Iterable<API.Clause>} clauses
   */
  constructor(clauses) {
    this.clauses = [...clauses]
  }

  /**
   *
   * @param {API.Fact} fact
   * @param {1|-1} weight
   */
  update(fact, weight) {
    const before = this.facts.get(fact) ?? 0
    const after = before + weight
    if (after === 0) {
      this.facts.delete(fact)
    } else {
      this.facts.set(fact, after)
    }

    const [entity, attribute, value] = fact
    this.evaluate({
      entity,
      attribute,
      value,
      weight,
    })
  }
  /**
   *
   * @param {API.Fact} fact
   */
  assert(fact) {
    this.update(fact, 1)
  }

  /**
   * @param {API.Fact} fact
   */
  retract(fact) {
    this.update(fact, -1)
  }

  /**
   * @typedef {{
   *  entity: API.Entity,
   *  attribute: API.Attribute,
   *  value: API.Constant,
   *  weight: API.Int32
   * }} Change
   * @param {Change} change
   */
  evaluate(change) {
    for (const clause of this.clauses) {
      if (clause.Case) {
        const [entity, attribute, value] = clause.Case
        if (
          match(entity, change.entity).ok &&
          match(attribute, change.attribute).ok &&
          match(value, change.value).ok
        ) {
          // The change fact matches this case; perform necessary operations,
          // such as updating an internal state or producing output frames.
        }
      }
    }
  }
  /**
   *
   * @param {API.Transaction} changes
   */
  transact(changes) {
    for (const change of changes) {
      if (change.Assert) {
        this.assert(change.Assert)
      }
      if (change.Retract) {
        this.retract(change.Retract)
      }
    }
  }
}
/**
 *
 * @param {API.Term} expect
 * @param {API.Constant} actual
 * @returns {API.Result<API.Constant, RangeError>}
 */

const match = (expect, actual) => {
  if (Variable.is(expect)) {
    return { ok: actual }
  } else if (Constant.equal(expect, actual)) {
    return { ok: actual }
  } else {
    return {
      error: new RangeError(`Inconsistency between ${expect} and ${actual}`),
    }
  }
}
