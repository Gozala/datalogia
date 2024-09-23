import * as DB from 'datalogia'
import { Task } from 'datalogia'
import { rule } from '../src/rule.js'

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
  'aggregate items': (assert) =>
    Task.spawn(function* () {
      const groceries = DB.Link.of({ name: 'Groceries' })
      const milk = DB.Link.of({ title: 'Buy Milk' })
      const eggs = DB.Link.of({ title: 'Buy Eggs' })
      const bread = DB.Link.of({ title: 'Buy Bread' })

      const chores = DB.Link.of({ name: 'Chores' })
      const laundry = DB.Link.of({ title: 'Do Laundry' })
      const dishes = DB.Link.of({ title: 'Do Dishes' })

      const db = DB.Memory.create([
        [groceries, 'name', 'Groceries'],
        [milk, 'title', 'Buy Milk'],
        [eggs, 'title', 'Buy Eggs'],
        [bread, 'title', 'Buy Bread'],
        [groceries, 'todo', milk],
        [groceries, 'todo', eggs],
        [groceries, 'todo', bread],
        [chores, 'name', 'Chores'],
        [laundry, 'title', 'Do Laundry'],
        [dishes, 'title', 'Do Dishes'],
        [chores, 'todo', laundry],
        [chores, 'todo', dishes],
      ])

      const list = DB.link()
      const item = DB.link()
      const title = DB.string()
      const name = DB.string()
      const todo = DB.variable()

      const match = yield* DB.query(db, {
        select: {
          name,
          item: [{ todo: item, title }],
        },
        where: [
          DB.match([list, 'name', name]),
          DB.match([list, 'todo', item]),
          DB.match([item, 'title', title]),
          // includes(todo, item),
        ],
      })

      assert.deepEqual(match, [
        {
          name: 'Groceries',
          item: [
            { todo: milk, title: 'Buy Milk' },
            { todo: eggs, title: 'Buy Eggs' },
            { todo: bread, title: 'Buy Bread' },
          ],
        },
        {
          name: 'Chores',
          item: [
            { todo: laundry, title: 'Do Laundry' },
            { todo: dishes, title: 'Do Dishes' },
          ],
        },
      ])
    }),

  'aggregate 0 items': (assert) =>
    Task.spawn(function* () {
      const groceries = DB.Link.of({ name: 'Groceries' })
      const db = DB.Memory.create([[groceries, 'name', 'Groceries']])

      const list = DB.link()
      const item = DB.link()
      const title = DB.string()
      const name = DB.string()
      const todo = DB.variable()

      const match = yield* DB.query(db, {
        select: {
          name,
          item: [{ todo: item, title }],
        },
        where: [
          DB.match([list, 'name', name]),
          DB.match([list, 'todo', item]),
          DB.match([item, 'title', title]),
        ],
      })

      assert.deepEqual(match, [{ name: 'Groceries', item: [] }])
    }),
}
