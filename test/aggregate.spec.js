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
  'skip popularProfile': async (assert) => {
    const follower = DB.integer()
    const follows = DB.integer()

    const operand = DB.integer()
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

    const id = DB.integer()
    const profile = DB.integer()
    const c = DB.integer()
    const popularProfile = rule({
      match: { id },
      where: [
        { match: [id, 'profile', DB._] },
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
