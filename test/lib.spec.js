import * as DB from 'datalogia'
import * as proofs from './proof-facts.js'
import * as movies from './movie-facts.js'

const proofsDB = DB.Memory.create(proofs)
const moviesDB = DB.Memory.create(movies)

/**
 * @type {import('entail').Suite}
 */
export const testDB = {
  'test capabilities across ucans': async (assert) => {
    const uploadLink = DB.string()
    const storeLink = DB.string()

    const space = DB.string()
    const uploadID = DB.string()
    const storeID = DB.string()

    const result = DB.query(proofsDB, {
      select: {
        uploadLink,
        storeLink,
        space,
      },
      where: [
        DB.match([uploadLink, 'capabilities', uploadID]),
        DB.match([uploadID, 'can', 'upload/add']),
        DB.match([uploadID, 'with', space]),
        DB.match([storeLink, 'capabilities', storeID]),
        DB.match([storeID, 'can', 'store/add']),
        DB.match([storeID, 'with', space]),
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

  'test baisc': async (assert) => {
    /** @type {DB.Fact[]} */
    const facts = [
      ['sally', 'age', 21],
      ['fred', 'age', 42],
      ['ethel', 'age', 42],
      ['fred', 'likes', 'pizza'],
      ['sally', 'likes', 'opera'],
      ['ethel', 'likes', 'sushi'],
    ]
    const db = DB.Memory.create({ facts })

    const e = DB.string()

    assert.deepEqual(
      DB.query(db, {
        select: { e },
        where: [DB.match([e, 'age', 42])],
      }),
      [{ e: 'fred' }, { e: 'ethel' }]
    )

    const x = DB.string()
    assert.deepEqual(
      DB.query(db, {
        select: { x },
        where: [DB.match([DB._, 'likes', x])],
      }),
      [{ x: 'pizza' }, { x: 'opera' }, { x: 'sushi' }]
    )
  },

  'sketch pull pattern': (assert) => {
    const Person = DB.entity({
      'person/name': DB.string(),
    })

    const director = new Person()

    const actor = new Person()

    const Movie = DB.entity({
      'movie/title': DB.string(),
      'movie/director': director,
      'movie/cast': actor,
    })

    const movie = new Movie()

    assert.deepEqual(
      DB.query(moviesDB, {
        select: {
          director: director['person/name'],
          movie: movie['movie/title'],
        },
        where: [
          actor['person/name'].is('Arnold Schwarzenegger'),
          movie['movie/cast'].is(actor),
          movie['movie/director'].is(director),
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

    assert.deepEqual(
      DB.query(moviesDB, {
        select: {
          director: director['person/name'],
          movie: movie['movie/title'],
        },
        where: [
          actor['person/name'].is('Arnold Schwarzenegger'),
          director['person/name'].not('James Cameron'),
          movie['movie/cast'].is(actor),
          movie['movie/director'].is(director),
        ],
      }),
      [
        { director: 'John McTiernan', movie: 'Predator' },
        { director: 'Mark L. Lester', movie: 'Commando' },
        {
          director: 'Jonathan Mostow',
          movie: 'Terminator 3: Rise of the Machines',
        },
      ]
    )
  },
}
