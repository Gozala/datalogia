import * as API from './api.js'
import * as Formula from './formula.js'

/**
 * @param {API.Formula[]} where
 */
export const toString = (where) => {
  const clauses = []
  for (const formula of where) {
    clauses.push(Formula.toString(formula))
  }

  return `[${clauses.join(', ')}]`
}
