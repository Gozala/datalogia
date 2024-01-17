import * as API from './api.js'
import * as Term from './term.js'

/**
 *
 * @param {API.Selector} selector
 */
export const toJSON = (selector) =>
  Object.fromEntries(
    Object.entries(selector).map(([id, term]) => [id, Term.toJSON(term)])
  )

/**
 * @param {API.Selector} variables
 */
export const toString = (variables) => {
  const parts = []
  for (const [id, term] of Object.entries(variables)) {
    parts.push(`${id}:${Term.toString(term)}`)
  }

  return `{${parts.join(', ')}}`
}
