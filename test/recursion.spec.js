import * as DB from 'datalogia'
import { rule, Rule } from '../src/rule.js'

const $ = DB.Memory.entity

const db = DB.Memory.create([
  [$(1), 'name', 'a'],
  [$(2), 'name', 'b'],
  [$(3), 'name', 'c'],
  [$(0), 'data/type', 'list'],
  [$(0), 'list/next', $(1)],
  [$(1), 'list/next', $(2)],
  [$(2), 'list/next', $(3)],
])

/**
 * @type {import('entail').Suite}
 */
export const testRecursion = {
  'test recursion': async (assert) => {
    const list = DB.link()
    const item = DB.link()
    const head = DB.link()
    const child = new Rule({
      match: { list, item },
      /**
       * @type {DB.Clause}
       */
      get where() {
        return DB.or(
          // head of the list is the child
          DB.match([list, 'list/next', item]),
          DB.and(
            // child of the head is the child of the list
            DB.match([head, 'list/next', item]),
            child.match({ list, item: head })
          )
        )
      },
    })

    const root = DB.link()
    const each = DB.link()
    const next = DB.variable()

    const name = DB.string()

    const matches = DB.query(db, {
      select: {
        id: each,
        name,
        next,
      },
      where: [
        DB.match([root, 'data/type', 'list']),
        child.match({ list: root, item: each }),
        DB.match([each, 'name', name]),
        DB.or(
          DB.match([each, 'list/next', next]),
          DB.not(DB.match([each, 'list/next', next]))
        ),
      ],
    })

    assert.deepEqual(
      [...matches],
      [
        { id: $(1), name: 'a', next: $(2) },
        { id: $(2), name: 'b', next: $(3) },
        // @ts-ignore
        { id: $(3), name: 'c', next: undefined },
      ]
    )
  },
}
