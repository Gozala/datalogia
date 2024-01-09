import * as DB from 'datalogia'
import * as proofsDB from './proof-facts.js'
import * as moviesDB from './movie-facts.js'
import * as employeeDB from './microshaft-facts.js'
import { rule } from '../src/rule.js'
import { count } from '../src/aggregate.js'

/**
 * @type {import('entail').Suite}
 */
export const testAggregate = {
  popularProfile: async (assert) => {
    const follower = DB.Schema.integer()
    const follows = DB.Schema.integer()

    const operand = DB.Schema.integer()
    const same = rule({
      match: {
        operand,
        modifier: operand,
      },
    })

    const Follower = rule({
      match: { follower: follower, follows: follows },
      where: [{ match: [follower, 'follows', follows] }],
    })

    const id = DB.Schema.integer()
    const profile = DB.Schema.integer()
    const c = DB.Schema.integer()
    const popularProfile = rule({
      match: { id },
      where: [
        { match: [id, 'profile', DB.Schema._] },
        Follower.match({ follower: profile, follows: id }),
        same.match({ operand: c, modifier: count.of(profile) }),
        {
          when: DB.when(
            { n: c },
            {
              tryFrom({ n }) {
                return n > 3
                  ? { ok: true }
                  : { error: new Error('not popular') }
              },
            }
          ),
        },
      ],
    })
  },
}
