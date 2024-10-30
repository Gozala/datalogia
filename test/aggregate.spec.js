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

  'only double aggregate': (assert) =>
    Task.spawn(function* () {
      const lib = DB.Link.of({ name: 'datalogia' })
      const tags = DB.Link.of({ tags: {} })
      const files = DB.Link.of({ files: {} })

      const db = DB.Memory.create([
        [lib, 'tags', tags],
        [tags, '0', 'database'],
        [tags, '1', 'query'],
        [tags, '2', 'db'],
        [lib, 'files', files],
        [files, '0', 'lib.js'],
        [files, '1', 'main.js'],
      ])

      const tag = DB.variable()
      const file = DB.variable()
      const _tags = DB.link()
      const _files = DB.link()

      const match = yield* DB.query(db, {
        select: {
          tag: [tag],
          files: [file],
        },
        where: [
          DB.match([lib, 'tags', _tags]),
          DB.match([_tags, DB._, tag]),
          DB.match([lib, 'files', _files]),
          DB.match([_files, DB._, file]),
        ],
      })

      assert.deepEqual(match, [
        {
          tag: ['database', 'query', 'db'],
          files: ['lib.js', 'main.js'],
        },
      ])
    }),
}
