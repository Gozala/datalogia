import * as DB from 'datalogia'
import { Task, Link } from 'datalogia'

const $ = DB.Memory.entity

const db = DB.Memory.create([
  [$(1), 'text', 'hello'],
  [$(1), 'int', 3],
  [$(1), 'bigint', 2n ** 60n],
  [$(1), 'float', 5.2],
  [$(1), 'true', true],
  [$(1), 'false', false],
  [$(1), 'bytes', new Uint8Array([1, 2, 3])],
  // [$(1), 'null', /** @type {any} */ (null)],
  [$(1), 'id', $(1)],
])

/**
 * @type {import('entail').Suite}
 */
export const testRelation = {
  'test type relation': (assert) =>
    Task.spawn(function* () {
      const type = DB.variable()
      const q = DB.variable()
      const expert = {
        text: 'string',
        int: 'int32',
        bigint: 'int64',
        float: 'float32',
        true: 'boolean',
        false: 'boolean',
        bytes: 'bytes',
        // null: 'null',
        id: 'reference',
      }

      for (const [key, type] of Object.entries(expert)) {
        assert.deepEqual(
          yield* DB.query(db, {
            select: { type },
            where: [
              {
                Case: [$(1), key, q],
              },
              {
                Match: [q, 'type', type],
              },
            ],
          }),
          [{ type: type }]
        )
      }

      assert.deepEqual(
        yield* DB.query(db, {
          select: { type },
          where: [
            {
              Match: [Infinity, 'type', type],
            },
          ],
        }),
        [],
        'will produce no frames'
      )
    }),

  'test reference relation': (assert) =>
    Task.spawn(function* () {
      const type = DB.variable()
      const q = DB.variable()
      const fixtures = [
        'hello',
        $(1),
        3,
        2n ** 60n,
        5.2,
        true,
        false,
        new Uint8Array([1, 2, 3]),
      ]

      for (const data of fixtures) {
        assert.deepEqual(
          yield* DB.query(db, {
            select: { q },
            where: [
              {
                Match: [data, '@', q],
              },
            ],
          }),
          [{ q: Link.of(data) }]
        )
      }
    }),

  'test == relation': (assert) =>
    Task.spawn(function* () {
      const type = DB.variable()
      const q = DB.variable()

      const expert = {
        text: 'hello',
        int: 3,
        bigint: 2n ** 60n,
        float: 5.2,
        true: true,
        false: false,
        bytes: new Uint8Array([1, 2, 3]),
        // null: 'null',
        id: $(1),
      }

      for (const [key, value] of Object.entries(expert)) {
        assert.deepEqual(
          yield* DB.query(db, {
            select: { q },
            where: [
              {
                Case: [$(1), key, q],
              },
              {
                Match: [q, '==', value],
              },
            ],
          }),
          [{ q: value }]
        )
      }

      assert.deepEqual(
        yield* DB.query(db, {
          select: { q },
          where: [
            {
              Match: [5, '==', q],
            },
          ],
        }),
        [{ q: 5 }],
        'will perform assignment'
      )
    }),

  'test string/concat': (assert) =>
    Task.spawn(function* () {
      const text = DB.variable()
      const out = DB.variable()
      assert.deepEqual(
        yield* DB.query(db, {
          select: { out },
          where: [
            {
              Match: ['hello', '==', text],
            },
            {
              Match: [[text, ' world'], 'string/concat', out],
            },
          ],
        }),
        [{ out: 'hello world' }]
      )

      assert.deepEqual(
        yield* DB.query(db, {
          select: { out },
          where: [
            {
              Match: ['hello', '==', text],
            },
            {
              Match: [[text, ' ', 'world'], 'string/concat', out],
            },
          ],
        }),
        [{ out: 'hello world' }]
      )
    }),

  'test string/words': (assert) =>
    Task.spawn(function* () {
      const text = DB.variable()
      const word = DB.variable()
      assert.deepEqual(
        yield* DB.query(db, {
          select: { word },
          where: [
            {
              Match: ['hello world', '==', text],
            },
            {
              Match: [text, 'string/words', word],
            },
          ],
        }),
        [{ word: 'hello' }, { word: 'world' }]
      )
    }),

  'test string/lines': (assert) =>
    Task.spawn(function* () {
      const text = DB.variable()
      const line = DB.variable()
      assert.deepEqual(
        yield* DB.query(db, {
          select: { line },
          where: [
            {
              Match: ['hello,\nhow are you\r\n', '==', text],
            },
            {
              Match: [text, 'string/lines', line],
            },
          ],
        }),
        [{ line: 'hello,' }, { line: 'how are you' }, { line: '' }]
      )
    }),

  'test string/case/upper': (assert) =>
    Task.spawn(function* () {
      const text = DB.variable()
      const word = DB.variable()
      assert.deepEqual(
        yield* DB.query(db, {
          select: { word },
          where: [
            {
              Match: ['hello', '==', text],
            },
            {
              Match: [text, 'string/case/upper', word],
            },
          ],
        }),
        [{ word: 'HELLO' }]
      )
    }),

  'test string/case/lower': (assert) =>
    Task.spawn(function* () {
      const text = DB.variable()
      const word = DB.variable()
      assert.deepEqual(
        yield* DB.query(db, {
          select: { word },
          where: [
            {
              Match: ['Hello', '==', text],
            },
            {
              Match: [text, 'string/case/lower', word],
            },
          ],
        }),
        [{ word: 'hello' }]
      )
    }),

  'test string/trim': (assert) =>
    Task.spawn(function* () {
      const text = DB.variable()
      const out = DB.variable()
      assert.deepEqual(
        yield* DB.query(db, {
          select: { out },
          where: [
            {
              Match: ['   Hello world!   ', '==', text],
            },
            {
              Match: [text, 'string/trim', out],
            },
          ],
        }),
        [{ out: 'Hello world!' }]
      )
    }),

  'test string/trim/start': (assert) =>
    Task.spawn(function* () {
      const text = DB.variable()
      const out = DB.variable()
      assert.deepEqual(
        yield* DB.query(db, {
          select: { out },
          where: [
            {
              Match: ['   Hello world!   ', '==', text],
            },
            {
              Match: [text, 'string/trim/start', out],
            },
          ],
        }),
        [{ out: 'Hello world!   ' }]
      )
    }),
  'test string/trim/end': (assert) =>
    Task.spawn(function* () {
      const text = DB.variable()
      const out = DB.variable()
      assert.deepEqual(
        yield* DB.query(db, {
          select: { out },
          where: [
            {
              Match: ['   Hello world!   ', '==', text],
            },
            {
              Match: [text, 'string/trim/end', out],
            },
          ],
        }),
        [{ out: '   Hello world!' }]
      )
    }),
  'test string/from/utf8': (assert) =>
    Task.spawn(function* () {
      const bytes = DB.variable()
      const out = DB.variable()
      assert.deepEqual(
        yield* DB.query(db, {
          select: { out },
          where: [
            {
              Match: [new TextEncoder().encode('Hello world!'), '==', bytes],
            },
            {
              Match: [bytes, 'string/from/utf8', out],
            },
          ],
        }),
        [{ out: 'Hello world!' }]
      )
    }),

  'test string/to/utf8': (assert) =>
    Task.spawn(function* () {
      const text = 'Hello world!'
      const out = DB.variable()
      assert.deepEqual(
        yield* DB.query(db, {
          select: { out },
          where: [
            {
              Match: ['Hello world!', '==', text],
            },
            {
              Match: [text, 'string/to/utf8', out],
            },
          ],
        }),
        [{ out: new TextEncoder().encode('Hello world!') }]
      )
    }),

  'test string/length': (assert) =>
    Task.spawn(function* () {
      const text = DB.variable()
      const out = DB.variable()
      assert.deepEqual(
        yield* DB.query(db, {
          select: { out },
          where: [
            {
              Match: ['Hello world!', '==', text],
            },
            {
              Match: [text, 'string/length', out],
            },
          ],
        }),
        [{ out: 12 }]
      )
    }),

  'test + relation': (assert) =>
    Task.spawn(function* () {
      const a = DB.variable()
      const b = DB.variable()
      const c = DB.variable()
      assert.deepEqual(
        yield* DB.query(db, {
          select: { c },
          where: [
            { Match: [1, '==', a] },
            { Match: [2, '==', b] },
            { Match: [[a, b], '+', c] },
          ],
        }),
        [{ c: 3 }]
      )

      assert.deepEqual(
        yield* DB.query(db, {
          select: { c },
          where: [
            { Match: [1, '==', a] },
            { Match: [2, '==', b] },
            { Match: [[a, b, 10, b], '+', c] },
          ],
        }),
        [{ c: 15 }]
      )

      assert.deepEqual(
        yield* DB.query(db, {
          select: { c },
          where: [{ Match: [[5], '+', c] }],
        }),
        [{ c: 5 }]
      )

      assert.deepEqual(
        yield* DB.query(db, {
          select: { c },
          where: [{ Match: [[], '+', c] }],
        }),
        [{ c: 0 }]
      )
    }),

  'test - relation': (assert) =>
    Task.spawn(function* () {
      const a = DB.variable()
      const b = DB.variable()
      const c = DB.variable()
      assert.deepEqual(
        yield* DB.query(db, {
          select: { c },
          where: [
            { Match: [10, '==', a] },
            { Match: [2, '==', b] },
            { Match: [[a, b], '-', c] },
          ],
        }),
        [{ c: 8 }]
      )

      assert.deepEqual(
        yield* DB.query(db, {
          select: { c },
          where: [
            { Match: [10, '==', a] },
            { Match: [2, '==', b] },
            { Match: [[a, b, 1, b], '-', c] },
          ],
        }),
        [{ c: 5 }]
      )

      assert.deepEqual(
        yield* DB.query(db, {
          select: { c },
          where: [{ Match: [[], '-', c] }],
        }),
        [{ c: 0 }]
      )

      assert.deepEqual(
        yield* DB.query(db, {
          select: { c },
          where: [{ Match: [[6], '-', c] }],
        }),
        [{ c: -6 }]
      )
    }),

  'test * relation': (assert) =>
    Task.spawn(function* () {
      const a = DB.variable()
      const b = DB.variable()
      const c = DB.variable()
      assert.deepEqual(
        yield* DB.query(db, {
          select: { c },
          where: [
            { Match: [10, '==', a] },
            { Match: [2, '==', b] },
            { Match: [[a, b], '*', c] },
          ],
        }),
        [{ c: 20 }]
      )

      assert.deepEqual(
        yield* DB.query(db, {
          select: { c },
          where: [
            { Match: [10, '==', a] },
            { Match: [2, '==', b] },
            { Match: [[a, b, 3, b], '*', c] },
          ],
        }),
        [{ c: 120 }]
      )

      assert.deepEqual(
        yield* DB.query(db, {
          select: { c },
          where: [{ Match: [[], '*', c] }],
        }),
        [{ c: 1 }]
      )

      assert.deepEqual(
        yield* DB.query(db, {
          select: { c },
          where: [{ Match: [10, '==', a] }, { Match: [[a], '*', c] }],
        }),
        [{ c: 10 }]
      )
    }),

  'test / relation': (assert) =>
    Task.spawn(function* () {
      const a = DB.variable()
      const b = DB.variable()
      const c = DB.variable()
      assert.deepEqual(
        yield* DB.query(db, {
          select: { c },
          where: [
            { Match: [10, '==', a] },
            { Match: [2, '==', b] },
            { Match: [[a, b], '/', c] },
          ],
        }),
        [{ c: 5 }]
      )

      assert.deepEqual(
        yield* DB.query(db, {
          select: { c },
          where: [
            { Match: [48, '==', a] },
            { Match: [2, '==', b] },
            { Match: [[a, b, 3, b], '/', c] },
          ],
        }),
        [{ c: 4 }]
      )

      assert.deepEqual(
        yield* DB.query(db, {
          select: { c },
          where: [{ Match: [[], '/', c] }],
        }),
        [{ c: 1 }]
      )

      assert.deepEqual(
        yield* DB.query(db, {
          select: { c },
          where: [{ Match: [5, '==', a] }, { Match: [[a], '/', c] }],
        }),
        [{ c: 0.2 }]
      )

      assert.deepEqual(
        yield* DB.query(db, {
          select: { c },
          where: [{ Match: [5, '==', a] }, { Match: [[a, 2, 0], '/', c] }],
        }),
        [],
        'division by zero not allowed'
      )
    }),
}
