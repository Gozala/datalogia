import * as DB from 'datalogia'
import * as proofsDB from './proof-facts.js'
import * as moviesDB from './movie-facts.js'
import * as employeeDB from './microshaft-facts.js'

/**
 * @type {import('entail').Suite}
 */
export const testDB = {
  'test memory db': async (assert) => {
    const db = DB.Memory.create(proofsDB)

    const uploadLink = DB.Schema.string()
    const storeLink = DB.Schema.string()

    const space = DB.Schema.string()
    const uploadID = DB.Schema.string()
    const storeID = DB.Schema.string()

    const matches = DB.evaluate(db, {
      and: [
        { match: [uploadLink, 'capabilities', uploadID] },
        { match: [uploadID, 'can', 'upload/add'] },
        { match: [uploadID, 'with', space] },
        { match: [storeLink, 'capabilities', storeID] },
        { match: [storeID, 'can', 'store/add'] },
        { match: [storeID, 'with', space] },
      ],
    })

    assert.deepEqual(
      [...matches],
      [
        {
          [uploadLink.$]: 'bafy...upload',
          [storeLink.$]: 'bafy...store',
          [space.$]: 'did:key:zAlice',
          [storeID.$]: 'bafy...store/capabilities/0',
          [uploadID.$]: 'bafy...upload/capabilities/0',
        },
      ]
    )
  },

  'test basics': async (assert) => {
    const db = DB.Memory.create({
      facts: [
        ['sally', 'age', 21],
        ['fred', 'age', 42],
        ['ethel', 'age', 42],
        ['fred', 'likes', 'pizza'],
        ['sally', 'likes', 'opera'],
        ['ethel', 'likes', 'sushi'],
      ],
    })

    const e = DB.Schema.string()

    const matches = DB.evaluate(db, {
      match: [e, 'age', 42],
    })

    assert.deepEqual(
      [...matches],
      [
        {
          [e.$]: 'fred',
        },
        {
          [e.$]: 'ethel',
        },
      ]
    )
  },

  'is predicate': async (assert) => {
    const db = DB.Memory.create(moviesDB)

    const arnold = DB.Schema.integer()
    const director = DB.Schema.integer()
    const movie = DB.Schema.integer()
    const directorName = DB.Schema.string()
    const movieTitle = DB.Schema.string()

    const matches = DB.evaluate(db, {
      and: [
        { match: [arnold, 'person/name', 'Arnold Schwarzenegger'] },
        { match: [movie, 'movie/cast', arnold] },
        { match: [movie, 'movie/director', director] },
        { match: [director, 'person/name', directorName] },
        { match: [movie, 'movie/title', movieTitle] },
      ],
    })

    assert.deepEqual(
      [...matches].map((result) => ({
        director: result[directorName.$],
        movie: result[movieTitle.$],
      })),
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

  'test facts': async (assert) => {
    const db = DB.Memory.create(employeeDB)

    const id = DB.Schema.integer()
    const name = DB.Schema.string()
    const matches = DB.evaluate(db, {
      and: [
        { match: [id, 'job', 'Computer programmer'] },
        { match: [id, 'name', name] },
      ],
    })

    assert.deepEqual(
      [...matches].map((e) => ({ name: e[name.$] })),
      [{ name: 'Hacker Alyssa P' }, { name: 'Fect Cy D' }]
    )
  },

  'test supervisor': async (assert) => {
    const db = DB.Memory.create(employeeDB)

    const supervisor = DB.Schema.integer()
    const supervisorName = DB.Schema.string()
    const employee = DB.Schema.integer()
    const employeeName = DB.Schema.string()
    const matches = DB.evaluate(db, {
      and: [
        { match: [employee, 'supervisor', supervisor] },
        { match: [supervisor, 'name', supervisorName] },
        { match: [employee, 'name', employeeName] },
      ],
    })

    assert.deepEqual(
      [...matches].map((e) => ({
        employee: e[employeeName.$],
        supervisor: e[supervisorName.$],
      })),
      [
        { employee: 'Hacker Alyssa P', supervisor: 'Bitdiddle Ben' },
        { employee: 'Fect Cy D', supervisor: 'Bitdiddle Ben' },
        { employee: 'Tweakit Lem E', supervisor: 'Bitdiddle Ben' },
        { employee: 'Reasoner Louis', supervisor: 'Hacker Alyssa P' },
        { employee: 'Bitdiddle Ben', supervisor: 'Warbucks Oliver' },
        { employee: 'Scrooge Eben', supervisor: 'Warbucks Oliver' },
        { employee: 'Cratchet Robert', supervisor: 'Scrooge Eben' },
        { employee: 'Aull DeWitt', supervisor: 'Warbucks Oliver' },
      ]
    )
  },

  'test salary': async (assert) => {
    const db = DB.Memory.create(employeeDB)

    const employee = {
      id: DB.Schema.integer(),
      name: DB.Schema.string(),
      salary: DB.Schema.integer(),
    }

    const matches = DB.evaluate(db, {
      and: [
        { match: [employee.id, 'salary', employee.salary] },
        {
          when: DB.when(
            { salary: employee.salary },
            {
              tryFrom: (employee) =>
                employee.salary > 30_000
                  ? { ok: {} }
                  : { error: new RangeError(`${employee.salary} < 30_000`) },
            }
          ),
        },
        { match: [employee.id, 'name', employee.name] },
      ],
    })

    assert.deepEqual(
      [...matches].map(($) => ({
        name: $[employee.name.$],
        salary: $[employee.salary.$],
      })),
      [
        { name: 'Bitdiddle Ben', salary: 60_000 },
        { name: 'Hacker Alyssa P', salary: 40_000 },
        { name: 'Fect Cy D', salary: 35_000 },
        { name: 'Warbucks Oliver', salary: 150_000 },
        { name: 'Scrooge Eben', salary: 75_000 },
      ]
    )

    const matches2 = DB.evaluate(db, {
      and: [
        { match: [employee.id, 'salary', employee.salary] },
        {
          when: DB.when(
            { salary: employee.salary },
            {
              tryFrom: (employee) =>
                employee.salary > 30_000
                  ? { ok: {} }
                  : { error: new RangeError(`${employee.salary} < 30_000`) },
            }
          ),
        },
        {
          when: DB.when(
            { salary: employee.salary },
            {
              tryFrom: (employee) =>
                employee.salary < 100_000
                  ? { ok: {} }
                  : { error: new RangeError(`${employee.salary} > 100_000`) },
            }
          ),
        },
        { match: [employee.id, 'name', employee.name] },
      ],
    })

    assert.deepEqual(
      [...matches2].map(($) => ({
        name: $[employee.name.$],
        salary: $[employee.salary.$],
      })),
      [
        { name: 'Bitdiddle Ben', salary: 60_000 },
        { name: 'Hacker Alyssa P', salary: 40_000 },
        { name: 'Fect Cy D', salary: 35_000 },
        { name: 'Scrooge Eben', salary: 75_000 },
      ]
    )
  },

  'test or': async (assert) => {
    const db = DB.Memory.create(employeeDB)

    const ben = DB.Schema.integer()
    const alyssa = DB.Schema.integer()
    const employee = {
      id: DB.Schema.integer(),
      name: DB.Schema.string(),
    }
    const supervisor = {
      id: DB.Schema.integer(),
      name: DB.Schema.string(),
    }

    const matches = DB.evaluate(db, {
      and: [
        { match: [ben, 'name', 'Bitdiddle Ben'] },
        { match: [alyssa, 'name', 'Hacker Alyssa P'] },
        {
          or: [
            { match: [employee.id, 'supervisor', ben] },
            { match: [employee.id, 'supervisor', alyssa] },
          ],
        },
        { match: [employee.id, 'name', employee.name] },
        { match: [employee.id, 'supervisor', supervisor.id] },
        { match: [supervisor.id, 'name', supervisor.name] },
      ],
    })

    assert.deepEqual(
      [...matches].map((e) => ({
        name: e[employee.name.$],
        supervisor: e[supervisor.name.$],
      })),
      [
        { name: 'Hacker Alyssa P', supervisor: 'Bitdiddle Ben' },
        { name: 'Fect Cy D', supervisor: 'Bitdiddle Ben' },
        { name: 'Tweakit Lem E', supervisor: 'Bitdiddle Ben' },
        { name: 'Reasoner Louis', supervisor: 'Hacker Alyssa P' },
      ]
    )
  },

  'test not': async (assert) => {
    const db = DB.Memory.create(employeeDB)

    const ben = {
      id: DB.Schema.integer(),
      name: 'Bitdiddle Ben',
    }

    const job = {
      title: 'Computer programmer',
    }

    const employee = {
      id: DB.Schema.integer(),
      name: DB.Schema.string(),
      job: DB.Schema.string(),
    }

    // finds all people supervised by Ben Bitdiddle who are not computer programmers
    const matches = DB.evaluate(db, {
      and: [
        { match: [ben.id, 'name', ben.name] },
        { match: [employee.id, 'supervisor', ben.id] },
        { match: [employee.id, 'name', employee.name] },
        {
          not: {
            match: [employee.id, 'job', 'Computer programmer'],
          },
        },
      ],
    })

    assert.deepEqual(
      [...matches].map((e) => ({ name: e[employee.name.$] })),
      [{ name: 'Tweakit Lem E' }]
    )
  },
}

// select books that are either red or printed before year 2000
