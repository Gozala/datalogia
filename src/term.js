import * as API from './api.js'
import * as Variable from './variable.js'
import * as Constant from './constant.js'

/**
 * @param {unknown} term
 * @returns {term is API.Term}
 */
export const is = (term) => Variable.is(term) || Constant.is(term)

/**
 * @param {API.Term} term
 */
export const toJSON = (term) =>
  Variable.is(term) ? Variable.toJSON(term) : Constant.toJSON(term)

/**
 * @param {API.Term} term
 * @returns {string}
 */
export const toString = (term) =>
  Variable.is(term) ? Variable.toString(term) : Constant.toString(term)

/**
 * @param {API.Term} term
 */
export const isBlank = (term) => Variable.is(term) && Variable.isBlank(term)
