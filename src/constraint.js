import * as API from './api.js'
import * as Bindings from './bindings.js'
import * as Term from './term.js'
import * as Type from './type.js'
import * as Constant from './constant.js'
import * as Selector from './selector.js'

/**
 * @template {API.Selector} Variables
 * @param {Variables} variables
 */
export const select = (variables) => new Selection(variables)

/**
 * @template {API.Selector} Variables
 */
class Selection {
  /**
   * @param {Variables} select
   */
  constructor(select) {
    this.select = select
  }
  /**
   * @param {(value: API.InferBindings<Variables>) => boolean} predicate
   * @returns {API.Clause}
   */
  where(predicate) {
    return new Filter({
      select: this.select,
      predicate,
    })
  }
}

/**
 * @template {API.Selector} Variables
 * @implements {API.MatchForm<Variables>}
 */
class Filter {
  /**
   * @param {object} model
   * @param {Variables} model.select
   * @param {(value: API.InferBindings<Variables>) => boolean} model.predicate
   */
  constructor(model) {
    this.model = model
    this.confirm = this.confirm.bind(this)
  }
  get Form() {
    return this
  }
  get selector() {
    return this.model.select
  }
  get predicate() {
    return this.model.predicate
  }
  /**
   * @param {Variables} selector
   * @param {API.Bindings} bindings
   * @returns {API.Result<API.Unit, Error>}
   */
  confirm(selector, bindings) {
    const { ok: payload, error } = Selector.trySelect(selector, bindings)
    if (error) {
      return { error }
    }

    if (
      this.model.predicate(
        /** @type {API.InferBindings<Variables>} */ (payload)
      )
    ) {
      return { ok: Type.Unit }
    } else {
      return { error: new Error(`Skip`) }
    }
  }
}

/**
 * @param {API.Term<string>} text
 * @param {API.Term<string>} prefix
 * @returns {API.Clause}
 */
export const startsWith = (text, prefix) =>
  select({ text, prefix }).where(({ text, prefix }) => text.startsWith(prefix))

/**
 * @param {API.Term<string>} text
 * @param {API.Term<string>} suffix
 * @returns {API.Clause}
 */
export const endsWith = (text, suffix) =>
  select({ text, suffix }).where(({ text, suffix }) => text.endsWith(suffix))

/**
 * @param {API.Term<string>} text
 * @param {API.Term<string>} fragment
 * @returns {API.Clause}
 */
export const contains = (text, fragment) =>
  select({ text, fragment }).where(({ text, fragment }) =>
    text.includes(fragment)
  )

export const is = Object.assign(
  /**
   * @param {API.Term} operand
   * @param {API.Term} modifier
   */
  (operand, modifier) =>
    select({ operand, modifier }).where(({ operand, modifier }) =>
      Constant.equal(operand, modifier)
    ),
  {
    /**
     * @param {API.Term} operand
     * @param {API.Term} modifier
     */
    not: (operand, modifier) =>
      select({ operand, modifier }).where(
        ({ operand, modifier }) => !Constant.equal(operand, modifier)
      ),
  }
)

/**
 * @template {API.Int32|API.Int64|API.Float32} Type
 * @param {API.Term<Type>} operand
 * @param {API.Term<Type>} modifier
 * @returns
 */
export const greater = (operand, modifier) =>
  select({ operand, modifier }).where(
    ({ operand, modifier }) => operand > modifier
  )

/**
 * @template {API.Int32|API.Int64|API.Float32} Type
 * @param {API.Term<Type>} operand
 * @param {API.Term<Type>} modifier
 * @returns
 */
export const greaterOrEqual = (operand, modifier) =>
  select({ operand, modifier }).where(
    ({ operand, modifier }) => operand >= modifier
  )

/**
 * @template {API.Int32|API.Int64|API.Float32} Type
 * @param {API.Term<Type>} operand
 * @param {API.Term<Type>} modifier
 * @returns
 */
export const less = (operand, modifier) =>
  select({ operand, modifier }).where(
    ({ operand, modifier }) => operand < modifier
  )

/**
 * @template {API.Int32|API.Int64|API.Float32} Type
 * @param {API.Term<Type>} operand
 * @param {API.Term<Type>} modifier
 * @returns
 */
export const lessOrEqual = (operand, modifier) =>
  select({ operand, modifier }).where(
    ({ operand, modifier }) => operand <= modifier
  )

const LIKE = { ignoreCase: true, single: '_', arbitrary: '%' }

/**
 * Creates a clause that checks that
 *
 * @param {API.Term<string>} text
 * @param {API.Term<string>} pattern
 */
export const like = (text, pattern) =>
  select({ pattern, text }).where(({ pattern, text }) =>
    compile(pattern, LIKE).test(text)
  )

const ANY_CHAR = '[\\s\\S]'

const GLOB = { ignoreCase: false, single: '?', arbitrary: '*' }

/**
 * @param {API.Term<string>} pattern
 * @param {API.Term<string>} text
 */
export const glob = (text, pattern) =>
  select({ pattern, text }).where(({ pattern, text }) =>
    compile(pattern, GLOB).test(text)
  )

/**
 *
 * @param {string} source
 * @param {object} options
 * @param {boolean} options.ignoreCase
 * @param {string} options.single
 * @param {string} options.arbitrary
 *
 * @returns
 */
const compile = (source, { ignoreCase, single, arbitrary }) => {
  const flags = ignoreCase ? 'i' : ''
  let pattern = ''
  let escaping = false
  for (const char of source) {
    switch (char) {
      case single: {
        pattern = escaping ? `${pattern}${char}` : `${pattern}${ANY_CHAR}`
        escaping = false
        break
      }
      case arbitrary: {
        pattern = escaping ? `${pattern}${char}` : `${pattern}${ANY_CHAR}*`
        escaping = false
        break
      }
      case '\\': {
        pattern = `${pattern}${char}`
        escaping = !escaping
        break
      }
      case '/':
      case '*':
      case '$':
      case '^':
      case '+':
      case '.':
      case ',':
      case '(':
      case ')':
      case '<':
      case '=':
      case '!':
      case '[':
      case ']':
      case '}':
      case '{':
      case '|': {
        pattern = escaping ? `${pattern}${char}` : `${pattern}\\${char}`
        escaping = false
        break
      }
      default:
        pattern = `${pattern}${char}`
        break
    }
  }

  return new RegExp(`^${pattern}$`, flags)
}
