import * as DB from 'datalogia'
import * as testDB from './microshaft-facts.js'

/**
 * @type {import('entail').Suite}
 */
export const testMore = {
  'test facts': (assert) => {
    const employee = DB.entity({
      name: DB.Schema.string(),
      job: DB.Schema.string(),
    })

    const result = DB.query(testDB, {
      select: {
        x: employee.name,
      },
      where: [employee.match({ job: 'Computer programmer' })],
    })

    assert.deepEqual(result, [{ x: 'Hacker Alyssa P' }, { x: 'Fect Cy D' }])
  },

  'test supervisor': (assert) => {
    const supervisor = DB.entity({
      name: DB.Schema.string(),
      salary: DB.Schema.number(),
    })

    const employee = DB.entity({
      name: DB.Schema.string(),
      salary: DB.Schema.number(),
      supervisor: supervisor,
    })

    const result = DB.query(testDB, {
      select: {
        employee: employee.name,
        supervisor: employee.supervisor.name,
      },
      where: [employee.match({ supervisor: supervisor })],
    })

    assert.deepEqual(result, [
      { employee: 'Reasoner Louis', supervisor: 'Fect Cy D' },
      { employee: 'Scrooge Eben', supervisor: 'Warbucks Oliver' },
      { employee: 'Cratchet Robert', supervisor: 'Scrooge Eben' },
      { employee: 'Aull DeWitt', supervisor: 'Warbucks Oliver' },
    ])
  },

  'test salary': (assert) => {
    const employee = DB.entity({
      name: DB.Schema.string(),
      salary: DB.Schema.number(),
    })

    const result = DB.query(testDB, {
      select: {
        employee: employee.name,
        salary: employee.salary,
      },
      where: [employee.match({ salary: employee.salary.greaterThan(30_000) })],
    })

    assert.deepEqual(result, [
      { employee: 'Hacker Alyssa P', salary: 40000 },
      { employee: 'Fect Cy D', salary: 35000 },
      { employee: 'Warbucks Oliver', salary: 150000 },
      { employee: 'Scrooge Eben', salary: 75000 },
    ])
  },
}
