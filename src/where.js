import * as API from './api.js'
import * as Selector from './selector.js'
import * as Variable from './variable.js'
import * as Terms from './terms.js'

/**
 * @param {API.Query} query
 * @returns {API.Where}
 */
export const of = ({ select, where }) => {
  const clauses = []
  // Flatten all the `And` clauses.
  const stack = [...where]
  while (stack.length) {
    const clause = stack[0]
    stack.shift()
    if (clause.And) {
      stack.unshift(...clause.And)
    } else {
      clauses.push(clause)
    }
  }

  /**
   * Selected fields may not explicitly appear in the where clause. To
   * illustrate consider following example
   *
   * @example
   *
   * ```ts
   * const Movie = entity({
   *    title: Schema.string(),
   *     year: Schema.number()
   * })
   *
   * const movie = new Movie()
   * const result = query(db, {
   *    select: {
   *      title: movie.title,
   *      year: movie.year
   *  },
   *  where: [movie.year.is(2000)]
   * })
   * ```
   *
   * Query `where` does not contain any references to `movie.title` therefor
   * query engine is not going to collect corresponding facts. However since
   * we do want values for `movie.title` we will add relation per selected
   * attribute to make force engine to collect facts for them.
   *
   * 🫣 This is not ideal solution as in the example above we do use
   * `movie.year` so we do not actually need another relation here. Instead we
   * could collect missing attributes when materializing the results reducing
   * unnecessary work. However this is something that can be optimized later.
   */
  for (const variable of Selector.variables(select)) {
    for (const clause of dependencies(variable)) {
      clauses.push(clause)
    }
  }

  return clauses.toSorted(byClause)
}

/**
 * @param {API.Clause} operand
 * @param {API.Clause} modifier
 */

const byClause = (operand, modifier) =>
  rateClause(modifier) - rateClause(operand)

/**
 * Derives a rate for the clause. It starts by assigning max score of 21 to
 * a clause and then starts to deducts some score depending on number of
 * variables present.
 *
 * @param {API.Clause} clause
 */
const rateClause = (clause) => {
  let score = 21
  if (clause.Case) {
    const [entity, attribute, value] = clause.Case
    if (Variable.is(entity)) {
      score -= 8
    }
    if (Variable.is(attribute)) {
      score -= 7
    }
    if (Variable.is(value)) {
      score -= 6
    }
  } else if (clause.And) {
    score -= 5
  } else if (clause.Or) {
    score -= 4
  } else if (clause.Form) {
    score -= 3
  } else if (clause.Not) {
    score -= 2
  } else if (clause.Rule) {
    score -= 1
  }

  return score
}

/**
 * Create a query execution plan.
 *
 * @param {API.Clause[]} clauses
 */
const plan = (clauses) => {
  const { select, match, not, is, or, form, rule } = group(clauses)

  /** @type {API.Clause[]} */
  const plan = []
  const resolved = new Set()

  // Keep putting assignments while we can find them in the `is` form
  // as it will resolve more variables.
  moveAssignments(plan, is, resolved)

  // Add all formulas we can find that do not have unresolved
  // inputs.
  movePredicates(plan, match, resolved)

  // Then use all the selects followed by any predicate and assignments
  moveSelectors(plan, { select, is, match }, resolved)

  // No we can proceed to the `or` clause
  for (const clause of or) {
    const disjuncts = optimizeOr(clause)
    plan.push({ Or: disjuncts })
    include(resolved, dependencies({ Or: disjuncts }))

    // We may be able to move assignments and predicates since
    // more variables would have got resolved
    moveAssignments(plan, is, resolved)
    movePredicates(plan, match, resolved)
  }

  // now we want to resolve all negations that we can
  moveNegations(plan, not)

  // Finally we will resolve all rules
  moveRules(plan, rule, resolved)

  moveAssignments(plan, is, resolved)
  movePredicates(plan, match, resolved)

  if (is.size + match.size + not.size > 0) {
    throw new Error('Variables is never bound')
  }

  return plan
}

/**
 *
 * @param {API.Clause[]} clauses
 * @returns {API.Clause[]}
 */

const optimizeOr = (clauses) => {
  const disjuncts = []
  const stack = [...clauses]
  for (const clause of stack) {
    if (clause.Or) {
      stack.push(...clause.Or)
    } else {
      const [ordered] = plan([clause])
      disjuncts.push(ordered)
    }
  }
  return disjuncts
}

/**
 * @param {Set<API.Is>} clauses
 * @param {Set<API.Variable>} resolved
 */
const findAssignment = (clauses, resolved) => {
  for (const clause of clauses) {
    const variables = dependencies({ Is: clause })
    const required = exclude(variables, resolved)
    if (required.size < 2) {
      return { clause, provides: required }
    }
  }
  return null
}

/**
 * @param {API.Clause[]} target
 * @param {Set<API.Is>} source
 * @param {Set<API.Variable>} resolved
 */
const moveAssignments = (target, source, resolved) => {
  while (true) {
    const assignment = findAssignment(source, resolved)
    if (assignment) {
      source.delete(assignment.clause)
      target.push({ Is: assignment.clause })
      include(resolved, assignment.provides)
    } else {
      break
    }
  }
}

/**
 * @param {Set<API.Formula>} formulas
 * @param {Set<API.Variable>} resolved
 */
const findMatch = (formulas, resolved) => {
  for (const formula of formulas) {
    const [input, , output] = formula
    // If we are able to resolve all the input variables we will be able to
    // resolve all the output variables after execution.
    const variables = Terms.dependencies(/** @type {API.Terms} */ (input))
    const required = exclude(variables, resolved)
    if (required.size === 0) {
      return {
        clause: formula,
        provides: Terms.dependencies(/** @type {API.Terms} */ (output)),
      }
    }
  }
  return null
}

/**
 * @param {API.Clause[]} target
 * @param {Set<API.Formula>} source
 * @param {Set<API.Variable>} resolved
 */
const movePredicates = (target, source, resolved) => {
  while (true) {
    const assignment = findMatch(source, resolved)
    if (assignment) {
      source.delete(assignment.clause)
      target.push({ Match: assignment.clause })
      include(resolved, assignment.provides)
    } else {
      break
    }
  }
}

/**
 *
 * @param {Set<API.Pattern>} selectors
 * @param {number} limit
 * @param {Set<API.Variable>} resolved
 */
const findSelector = (selectors, limit, resolved) => {
  for (const clause of selectors) {
    const variables = dependencies({ Case: clause })
    const required = exclude(variables, resolved)
    if (required.size <= limit) {
      return { clause, provides: required }
    }
  }
  return null
}

/**
 *
 * @param {API.Clause[]} target
 * @param {object} source
 * @param {Set<API.Pattern>} source.select
 * @param {Set<API.Is>} source.is
 * @param {Set<API.Formula>} source.match
 * @param {Set<API.Variable>} resolved
 */
const moveSelectors = (target, source, resolved) => {
  for (const limit of [1, 2, 3]) {
    while (true) {
      const found = findSelector(source.select, limit, resolved)
      if (found) {
        source.select.delete(found.clause)
        target.push({ Case: found.clause })
        include(resolved, found.provides)

        moveAssignments(target, source.is, resolved)
        movePredicates(target, source.match, resolved)
      } else {
        break
      }
    }
  }
}
/**
 * @template T
 * @param {Set<T>} left
 * @param {Set<T>} right
 * @returns {Set<T>}
 */
const exclude = (left, right) => {
  const delta = new Set()
  for (const member of left) {
    if (!right.has(member)) {
      delta.add(member)
    }
  }
  return delta
}

/**
 * @template T
 * @param {Set<T>} into
 * @param {Set<T>} members
 * @returns {Set<T>}
 */
const include = (into, members) => {
  for (const member of members) {
    into.add(member)
  }
  return into
}

/**
 *
 * @param {API.Clause} clause
 * @returns {Set<API.Variable>}
 */
const dependencies = (clause) => {
  if (clause.Is) {
    const [binding, value] = clause.Is
    const cells = new Set()

    if (!Variable.is(binding)) {
      if (Variable.is(value)) {
        cells.add(value)
      }
    } else if (!Variable.is(value)) {
      cells.add(value)
    } else {
      cells.add(binding).add(value)
    }

    return cells
  }

  if (clause.Case) {
    const cells = new Set()
    const [entity, attribute, value] = clause.Case
    if (Variable.is(entity)) {
      cells.add(entity)
    }
    if (Variable.is(attribute)) {
      cells.add(attribute)
    }
    if (Variable.is(value)) {
      cells.add(value)
    }
    return cells
  }

  return new Set()
}

/**
 *
 * @param {API.Clause[]} clauses
 */
const group = (clauses) => {
  const select = new Set()
  /** @type {Set<API.Formula>} */
  const match = new Set()
  const not = new Set()
  const is = new Set()
  /** @type {Set<API.Clause[]>} */
  const or = new Set()
  const form = new Set()
  const rule = new Set()

  const stack = [...clauses]
  for (const clause of stack) {
    if (clause.And) {
      stack.push(...clause.And)
    } else if (clause.Case) {
      select.add(clause.Case)
    } else if (clause.Not) {
      not.add(clause.Not)
    } else if (clause.Match) {
      match.add(clause.Match)
    } else if (clause.Is) {
      is.add(clause.Is)
    } else if (clause.Or) {
      or.add(clause.Or)
    } else if (clause.Form) {
      form.add(clause.Form)
    } else if (clause.Rule) {
      rule.add(clause.Rule)
    }
  }

  return { select, not, match, is, form, rule, or }
}
