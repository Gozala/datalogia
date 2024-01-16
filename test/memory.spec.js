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

    const uploadLink = DB.string()
    const storeLink = DB.string()

    const space = DB.string()
    const uploadID = DB.string()
    const storeID = DB.string()

    const matches = DB.query(db, {
      select: {
        uploadLink,
        storeLink,
        space,
        uploadID,
        storeID,
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

    assert.deepEqual(
      [...matches],
      [
        {
          uploadLink: 'bafy...upload',
          storeLink: 'bafy...store',
          space: 'did:key:zAlice',
          storeID: 'bafy...store/capabilities/0',
          uploadID: 'bafy...upload/capabilities/0',
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

    const e = DB.string()

    const matches = DB.query(db, {
      select: { e },
      where: [DB.match([e, 'age', 42])],
    })

    assert.deepEqual(
      [...matches],
      [
        {
          e: 'fred',
        },
        {
          e: 'ethel',
        },
      ]
    )
  },

  'is predicate': async (assert) => {
    const db = DB.Memory.create(moviesDB)

    const arnold = DB.integer()
    const director = DB.integer()
    const movie = DB.integer()
    const directorName = DB.string()
    const movieTitle = DB.string()

    const matches = DB.query(db, {
      select: {
        director: directorName,
        movie: movieTitle,
      },
      where: [
        DB.match([arnold, 'person/name', 'Arnold Schwarzenegger']),
        DB.match([movie, 'movie/cast', arnold]),
        DB.match([movie, 'movie/director', director]),
        DB.match([director, 'person/name', directorName]),
        DB.match([movie, 'movie/title', movieTitle]),
      ],
    })

    assert.deepEqual(
      [...matches],
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

    const id = DB.integer()
    const name = DB.string()
    const matches = DB.query(db, {
      select: {
        name,
      },
      where: [
        DB.match([id, 'job', 'Computer programmer']),
        DB.match([id, 'name', name]),
      ],
    })

    assert.deepEqual(
      [...matches],
      [{ name: 'Hacker Alyssa P' }, { name: 'Fect Cy D' }]
    )
  },

  'test supervisor': async (assert) => {
    const db = DB.Memory.create(employeeDB)

    const supervisor = DB.integer()
    const supervisorName = DB.string()
    const employee = DB.integer()
    const employeeName = DB.string()
    const matches = DB.query(db, {
      select: {
        employee: employeeName,
        supervisor: supervisorName,
      },
      where: [
        DB.match([employee, 'supervisor', supervisor]),
        DB.match([supervisor, 'name', supervisorName]),
        DB.match([employee, 'name', employeeName]),
      ],
    })

    assert.deepEqual(
      [...matches],
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
      id: DB.integer(),
      name: DB.string(),
      salary: DB.integer(),
    }

    const matches = DB.query(db, {
      select: {
        name: employee.name,
        salary: employee.salary,
      },
      where: [
        DB.match([employee.id, 'salary', employee.salary]),
        DB.Constraint.greater(employee.salary, 30_000),
        DB.match([employee.id, 'name', employee.name]),
      ],
    })

    assert.deepEqual(
      [...matches],
      [
        { name: 'Bitdiddle Ben', salary: 60_000 },
        { name: 'Hacker Alyssa P', salary: 40_000 },
        { name: 'Fect Cy D', salary: 35_000 },
        { name: 'Warbucks Oliver', salary: 150_000 },
        { name: 'Scrooge Eben', salary: 75_000 },
      ]
    )

    const matches2 = DB.query(db, {
      select: {
        name: employee.name,
        salary: employee.salary,
      },
      where: [
        DB.match([employee.id, 'salary', employee.salary]),
        employee.salary.confirm((salary) => salary > 30_000),
        employee.salary.confirm((salary) => salary < 100_000),
        DB.match([employee.id, 'name', employee.name]),
      ],
    })

    assert.deepEqual(
      [...matches2],
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

    const ben = DB.integer()
    const alyssa = DB.integer()
    const employee = {
      id: DB.integer(),
      name: DB.string(),
    }
    const supervisor = {
      id: DB.integer(),
      name: DB.string(),
    }

    const matches = DB.query(db, {
      select: {
        name: employee.name,
        supervisor: supervisor.name,
      },
      where: [
        DB.match([ben, 'name', 'Bitdiddle Ben']),
        DB.match([alyssa, 'name', 'Hacker Alyssa P']),
        DB.or(
          DB.match([employee.id, 'supervisor', ben]),
          DB.match([employee.id, 'supervisor', alyssa])
        ),
        DB.match([employee.id, 'name', employee.name]),
        DB.match([employee.id, 'supervisor', supervisor.id]),
        DB.match([supervisor.id, 'name', supervisor.name]),
      ],
    })

    assert.deepEqual(
      [...matches],
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
      id: DB.integer(),
      name: 'Bitdiddle Ben',
    }

    const job = {
      title: 'Computer programmer',
    }

    const employee = {
      id: DB.integer(),
      name: DB.string(),
      job: DB.string(),
    }

    // finds all people supervised by Ben Bitdiddle who are not computer programmers
    const matches = DB.query(db, {
      select: {
        name: employee.name,
      },
      where: [
        DB.match([ben.id, 'name', ben.name]),
        DB.match([employee.id, 'supervisor', ben.id]),
        DB.match([employee.id, 'name', employee.name]),
        DB.not(DB.match([employee.id, 'job', job.title])),
      ],
    })

    assert.deepEqual([...matches], [{ name: 'Tweakit Lem E' }])
  },
}

// select books that are either red or printed before year 2000
