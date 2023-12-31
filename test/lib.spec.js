import * as DB from 'datalogia'
import * as proofsDB from './proof-facts.js'
import * as moviesDB from './movie-facts.js'

/**
 * @type {import('entail').Suite}
 */
export const testDB = {
  'test capabilities across ucans': async (assert) => {
    const uploadLink = DB.Schema.string()
    const storeLink = DB.Schema.string()

    const space = DB.Schema.string()
    const uploadID = DB.Schema.string()
    const storeID = DB.Schema.string()

    const result = DB.query(proofsDB, {
      select: {
        uploadLink,
        storeLink,
        space,
      },
      where: [
        [uploadLink, 'capabilities', uploadID],
        [uploadID, 'can', 'upload/add'],
        [uploadID, 'with', space],
        [storeLink, 'capabilities', storeID],
        [storeID, 'can', 'store/add'],
        [storeID, 'with', space],
      ],
    })

    assert.deepEqual(result, [
      {
        uploadLink: 'bafy...upload',
        storeLink: 'bafy...store',
        space: 'did:key:zAlice',
      },
    ])
  },
  'test query builder': async (assert) => {
    const query = DB.select({
      uploadLink: DB.Schema.string(),
      storeLink: DB.Schema.string(),
    }).where(({ uploadLink, storeLink }) => {
      const space = DB.Schema.string()
      const uploadID = DB.Schema.string()
      const storeID = DB.Schema.string()

      return [
        [uploadLink, 'capabilities', uploadID],
        [uploadID, 'can', 'upload/add'],
        [uploadID, 'with', space],
        [storeLink, 'capabilities', storeID],
        [storeID, 'can', 'store/add'],
        [storeID, 'with', space],
      ]
    })

    assert.deepEqual(query.execute(proofsDB), [
      {
        uploadLink: 'bafy...upload',
        storeLink: 'bafy...store',
      },
    ])
  },

  'test baisc': async (assert) => {
    const facts = [
      DB.assert('sally', 'age', 21),
      DB.assert('fred', 'age', 42),
      DB.assert('ethel', 'age', 42),
      DB.assert('fred', 'likes', 'pizza'),
      DB.assert('sally', 'likes', 'opera'),
      DB.assert('ethel', 'likes', 'sushi'),
    ]

    const e = DB.Schema.string()

    assert.deepEqual(
      DB.query(
        { facts },
        {
          select: { e },
          where: [[e, 'age', 42]],
        }
      ),
      [{ e: 'fred' }, { e: 'ethel' }]
    )

    const x = DB.Schema.string()
    assert.deepEqual(
      DB.query(
        { facts },
        {
          select: { x },
          where: [[DB.Schema._, 'likes', x]],
        }
      ),
      [{ x: 'pizza' }, { x: 'opera' }, { x: 'sushi' }]
    )
  },

  'sketch pull pattern': (assert) => {
    const director = DB.entity({
      'person/name': DB.Schema.string(),
    })

    const actor = DB.entity({
      'person/name': DB.Schema.string(),
    })

    const movie = DB.entity({
      'movie/title': DB.Schema.string(),
      'movie/director': director,
      'movie/cast': actor,
    })

    assert.deepEqual(
      DB.query(moviesDB, {
        select: {
          director: director['person/name'],
          movie: movie['movie/title'],
        },
        where: [
          actor.match({ 'person/name': 'Arnold Schwarzenegger' }),
          movie.match({ 'movie/cast': actor }),
        ],
      }),
      [
        { director: 'James Cameron', movie: 'The Terminator' },
        { director: 'John McTiernan', movie: 'Predator' },
        { director: 'Mark L. Lester', movie: 'Commando' },
        { director: 'James Cameron', movie: 'Terminator 2: Judgment Day' },
        {
          director: 'Jonathan Mostow',
          movie: 'Terminator 3: Rise of the Machines',
        },
      ]
    )
  },
}
