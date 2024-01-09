import * as DB from 'datalogia'
import * as microshaft from './microshaft-facts.js'

const testDB = DB.Memory.create(microshaft)

/**
 * @type {import('entail').Suite}
 */
export const testMore = {
  'test facts': (assert) => {
    const Employee = DB.entity({
      name: DB.Schema.string(),
      job: DB.Schema.string(),
    })

    const employee = new Employee()
    const result = DB.query(testDB, {
      select: {
        name: employee.name,
      },
      where: [employee.job.is('Computer programmer')],
    })
    assert.deepEqual(result, [
      { name: 'Hacker Alyssa P' },
      { name: 'Fect Cy D' },
    ])

    assert.deepEqual(
      DB.query(testDB, {
        select: {
          name: employee.name,
          job: employee.job,
        },
        where: [employee.job.startsWith('Computer')],
      }),
      [
        { name: 'Bitdiddle Ben', job: 'Computer wizard' },
        { name: 'Hacker Alyssa P', job: 'Computer programmer' },
        { name: 'Fect Cy D', job: 'Computer programmer' },
        { name: 'Tweakit Lem E', job: 'Computer technician' },
        { name: 'Reasoner Louis', job: 'Computer programmer trainee' },
      ]
    )
  },
  'test supervisor': (assert) => {
    const Supervisor = DB.entity({
      name: DB.Schema.string(),
      salary: DB.Schema.integer(),
    })

    const Employee = DB.entity({
      name: DB.Schema.string(),
      salary: DB.Schema.integer(),
      supervisor: new Supervisor(),
    })

    const employee = new Employee()
    const supervisor = new Supervisor()

    const result = DB.query(testDB, {
      select: {
        employee: employee.name,
        supervisor: supervisor.name,
      },
      where: [employee.supervisor.is(supervisor)],
    })

    assert.deepEqual(result, [
      { employee: 'Hacker Alyssa P', supervisor: 'Bitdiddle Ben' },
      { employee: 'Fect Cy D', supervisor: 'Bitdiddle Ben' },
      { employee: 'Tweakit Lem E', supervisor: 'Bitdiddle Ben' },
      { employee: 'Reasoner Louis', supervisor: 'Hacker Alyssa P' },
      { employee: 'Bitdiddle Ben', supervisor: 'Warbucks Oliver' },
      { employee: 'Scrooge Eben', supervisor: 'Warbucks Oliver' },
      { employee: 'Cratchet Robert', supervisor: 'Scrooge Eben' },
      { employee: 'Aull DeWitt', supervisor: 'Warbucks Oliver' },
    ])
  },
  'test salary': (assert) => {
    const Employee = DB.entity({
      name: DB.Schema.string(),
      salary: DB.Schema.integer(),
    })

    const employee = new Employee()
    const query = {
      select: {
        // employee,
        name: employee.name,
        salary: employee.salary,
      },
      where: [employee.salary.greaterThan(30_000)],
    }

    const result = DB.query(testDB, query)

    assert.deepEqual(result, [
      { name: 'Bitdiddle Ben', salary: 60_000 },
      { name: 'Hacker Alyssa P', salary: 40_000 },
      { name: 'Fect Cy D', salary: 35_000 },
      { name: 'Warbucks Oliver', salary: 150_000 },
      { name: 'Scrooge Eben', salary: 75_000 },
    ])
    assert.deepEqual(
      DB.query(testDB, {
        select: {
          name: employee.name,
          salary: employee.salary,
        },
        where: [
          employee.salary.greaterThan(30_000),
          employee.salary.lessThan(100_000),
        ],
      }),
      [
        { name: 'Bitdiddle Ben', salary: 60_000 },
        { name: 'Hacker Alyssa P', salary: 40_000 },
        { name: 'Fect Cy D', salary: 35_000 },
        { name: 'Scrooge Eben', salary: 75_000 },
      ]
    )
  },
  'test address': (assert) => {
    const Employee = DB.entity({
      name: DB.Schema.string(),
      address: DB.Schema.string(),
    })

    const employee = new Employee()

    const whoLivesInCambridge = {
      select: {
        name: employee.name,
        address: employee.address,
      },
      where: [employee.address.toLowerCase().includes('campridge')],
    }

    assert.deepEqual(DB.query(testDB, whoLivesInCambridge), [
      { name: 'Hacker Alyssa P', address: 'Campridge, Mass Ave 78' },
      { name: 'Fect Cy D', address: 'Campridge, Ames Street 3' },
    ])
  },
  'test employee with non comp supervisor ': (assert) => {
    const Employee = DB.entity({
      name: DB.Schema.string(),
      supervisor: DB.Schema.string(),
      job: DB.Schema.string(),
    })

    const employee = new Employee()
    const supervisor = new Employee()

    assert.deepEqual(
      DB.query(testDB, {
        select: {
          employee: employee.name,
          supervisor: supervisor.name,
        },
        where: [
          employee.job.startsWith('Computer'),
          employee.supervisor.is(supervisor),
          supervisor.job.doesNotStartsWith('Computer'),
        ],
      }),
      [
        {
          employee: 'Bitdiddle Ben',
          supervisor: 'Warbucks Oliver',
        },
      ]
    )
  },
}
