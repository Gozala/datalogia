import * as DB from 'datalogia'
import * as Link from '../src/link.js'
import { assert } from 'entail'

const db = DB.Memory.create([
  {
    word: ['pizza', 'store/*', 'store/add', '*', '[a-z]'],
  },
])

/**
 * @type {import('entail').Suite}
 */
export const testConstraints = {
  like: (assert) => {
    const word = DB.string()

    assert.deepEqual(
      DB.query(db, {
        select: {
          word,
        },
        where: [DB.match([DB._, 'word', word]), DB.like('piz%', word)],
      }),
      [{ word: 'pizza' }]
    )

    assert.deepEqual(
      DB.query(db, {
        select: {
          word,
        },
        where: [DB.match([DB._, 'word', word]), DB.like('Piz%', word)],
      }),
      [{ word: 'pizza' }]
    )

    assert.deepEqual(
      DB.query(db, {
        select: {
          word,
        },
        where: [DB.match([DB._, 'word', word]), DB.like('Piz.*', word)],
      }),
      []
    )

    assert.deepEqual(
      DB.query(db, {
        select: {
          word,
        },
        where: [DB.match([DB._, 'word', word]), DB.like('Piz_a', word)],
      }),
      [{ word: 'pizza' }]
    )
  },

  glob: (assert) => {
    const word = DB.string()

    assert.deepEqual(
      DB.query(db, {
        select: {
          word,
        },
        where: [DB.match([DB._, 'word', word]), DB.glob('piz%', word)],
      }),
      [],
      'like pattern does not apply to glob'
    )

    assert.deepEqual(
      DB.query(db, {
        select: {
          word,
        },
        where: [DB.match([DB._, 'word', word]), DB.glob('piz*', word)],
      }),
      [{ word: 'pizza' }],
      '* matches anything'
    )

    assert.deepEqual(
      DB.query(db, {
        select: {
          word,
        },
        where: [DB.match([DB._, 'word', word]), DB.glob('Piz*', word)],
      }),
      [],
      'glob is case sensitive'
    )

    assert.deepEqual(
      DB.query(db, {
        select: {
          word,
        },
        where: [DB.match([DB._, 'word', word]), DB.like('piz.*', word)],
      }),
      [],
      'does not care about regexp patterns'
    )

    assert.deepEqual(
      DB.query(db, {
        select: {
          word,
        },
        where: [DB.match([DB._, 'word', word]), DB.glob('piz?a', word)],
      }),
      [{ word: 'pizza' }],
      'can match single character'
    )

    assert.deepEqual(
      DB.query(db, {
        select: {
          word,
        },
        where: [DB.match([DB._, 'word', word]), DB.glob('store/*', word)],
      }),
      [{ word: 'store/*' }, { word: 'store/add' }]
    )

    assert.deepEqual(
      DB.query(db, {
        select: {
          word,
        },
        where: [DB.match([DB._, 'word', word]), DB.glob('*', word)],
      }),
      [
        { word: 'pizza' },
        { word: 'store/*' },
        { word: 'store/add' },
        { word: '*' },
        { word: '[a-z]' },
      ]
    )

    assert.deepEqual(
      DB.query(db, {
        select: {
          word,
        },
        where: [DB.match([DB._, 'word', word]), DB.glob(word, 'store/list')],
      }),
      [{ word: 'store/*' }, { word: '*' }],
      'can use term as pattern'
    )

    assert.deepEqual(
      DB.query(db, {
        select: {
          word,
        },
        where: [DB.match([DB._, 'word', word]), DB.glob('\\*', word)],
      }),
      [{ word: '*' }],
      'can escape'
    )
  },
}
