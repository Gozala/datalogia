import * as API from './api.js'
import { query } from './lib.js'

/**
 * Takes a selector which is set of variables that will be used in the query
 * conditions. Returns a query builder that has `.where` method for specifying
 * the query conditions.
 *
 * @example
 * ```ts
 * const moviesAndTheirDirectorsThatShotArnold = select({
 *    directorName: Schema.string(),
 *    movieTitle: Schema.string(),
 * }).where(({ directorName, movieTitle }) => {
 *    const arnoldId = Schema.number()
 *    const movie = Schema.number()
 *    const director = Schema.number()
 *
 *    return [
 *      [arnold, "person/name", "Arnold Schwarzenegger"],
 *      [movie, "movie/cast", arnoldId],
 *      [movie, "movie/title", movieTitle],
 *      [movie, "movie/director", director],
 *      [director, "person/name", directorName]
 *   ]
 * })
 * ```
 *
 * @template {API.Selector} Selection
 * @param {Selection} selector
 * @returns {QueryBuilder<Selection>}
 */
export const select = (selector) => new QueryBuilder({ select: selector })

/**
 * A query builder API which is designed to enable type inference of the query
 * and the results it will produce.
 *
 * @template {API.Selector} Select
 */
class QueryBuilder {
  /**
   * @param {object} source
   * @param {Select} source.select
   */
  constructor({ select }) {
    this.select = select
  }
  /**
   * @param {(variables: Select) => Iterable<API.Clause>} conditions
   * @returns {Query<Select>}
   */
  where(conditions) {
    return new Query({
      select: this.select,
      where: [...conditions(this.select)],
    })
  }
}

/**
 * @template {API.Selector} Selection
 */
class Query {
  /**
   * @param {object} model
   * @param {Selection} model.select
   * @param {API.Clause[]} model.where
   */
  constructor(model) {
    this.model = model
  }

  /**
   *
   * @param {API.Querier} db
   * @returns {Promise<API.InferBindings<Selection>[]>}
   */
  async execute(db) {
    return await query(db, this.model)
  }
}
