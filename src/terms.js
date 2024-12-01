import * as API from './api.js'
import * as Variable from './variable.js'
import * as Constant from './constant.js'

/**
 * @param {API.Terms} source
 */
export const dependencies = (source) => {
  if (Constant.is(source)) {
    return new Set()
  } else if (Variable.is(source)) {
    return new Set([source])
  } else {
    const variables = new Set()
    for (const term of Object.values(source)) {
      if (Variable.is(term)) {
        variables.add(term)
      }
    }
    return variables
  }
}
