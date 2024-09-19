import * as DB from 'datalogia'
import * as proofsDB from './proofs.db.js'
import * as moviesDB from './movie.db.js'
import * as employeeDB from './microshaft.db.js'
import { rule } from '../src/rule.js'
import { count } from '../src/aggregate.js'

/**
 * @type {import('entail').Suite}
 */
export const testAggregate = {
  'skip popularProfile': async (assert) => {
    const follower = DB.link()
    const follows = DB.link()

    const operand = DB.link()
    const same = rule({
      select: {
        operand,
        modifier: operand,
      },
    })

    const Follower = rule({
      select: { follower: follower, follows: follows },
      where: [{ Case: [follower, 'follows', follows] }],
    })

    const id = DB.link()
    const profile = DB.link()
    const c = DB.integer()
    const popularProfile = rule({
      select: { id },
      where: [
        DB.match([id, 'profile', DB._]),
        Follower.match({ follower: profile, follows: id }),
        // @ts-expect-error - we do not yet have aggregators
        same.match({ operand: c, modifier: count.of(profile) }),
        c.confirm((c) => c > 3),
      ],
    })
  },
}
