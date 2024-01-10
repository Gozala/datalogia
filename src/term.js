import * as API from './api.js'
import * as Variable from './variable.js'
import * as Constant from './constant.js'

/**
 * @param {API.Term} term
 * @returns {string}
 */
export const toString = (term) =>
  Variable.is(term) ? Variable.toString(term) : Constant.toString(term)
