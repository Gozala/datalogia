import * as DB from 'datalogia'
import * as proofsDB from './proof-facts.js'
import * as moviesDB from './movie-facts.js'
import * as employeeDB from './microshaft-facts.js'
import { rule } from '../src/rule.js'

/**
 * @type {import('entail').Suite}
 */
export const testRules = {
  // 'test lives near': async (assert) => {
  //   const db = DB.Memory.create(employeeDB)
  //   const employee = {
  //     id: DB.Schema.number(),
  //     address: DB.Schema.string(),
  //   }
  //   const coworker = {
  //     id: DB.Schema.number(),
  //     address: DB.Schema.string(),
  //   }

  //   const id = DB.Schema.number()
  //   const same = rule({
  //     match: {
  //       left: id,
  //       right: id,
  //     },
  //     where: [],
  //   })

  //   const livesNear = rule({
  //     match: {
  //       employee: employee.id,
  //       coworker: coworker.id,
  //     },
  //     where: [
  //       { match: [employee.id, 'address', employee.address] },
  //       { match: [coworker.id, 'address', coworker.address] },
  //       { not: {
  //          'match'
  //           same({ left: employee.id, right: coworker.id }) },
  //     ],
  //   })
  // },

  'test wheel rule': async (assert) => {
    const db = DB.Memory.create(employeeDB)

    const person = DB.Schema.number()
    const manager = DB.Schema.number()
    const employee = DB.Schema.number()
    const wheel = rule({
      match: { person },
      where: [
        { match: [manager, 'supervisor', person] },
        { match: [employee, 'supervisor', manager] },
      ],
    })

    const who = DB.Schema.number()
    const name = DB.Schema.string()

    const matches = DB.evaluate(db, {
      and: [
        wheel.match({ person: who }),
        {
          match: [who, 'name', name],
        },
      ],
    })

    assert.deepEqual(
      [...matches].map(($) => ({
        name: $[name.$],
      })),
      [
        { name: 'Bitdiddle Ben' },
        { name: 'Warbucks Oliver' },
        { name: 'Warbucks Oliver' },
        { name: 'Warbucks Oliver' },
        { name: 'Warbucks Oliver' },
      ]
    )
  },

  'only leaves near': async (assert) => {
    const db = DB.Memory.create(employeeDB)
    const employee = {
      id: DB.Schema.number(),
      name: DB.Schema.string(),
      address: DB.Schema.string(),
    }

    const coworker = {
      id: DB.Schema.number(),
      name: DB.Schema.string(),
      address: DB.Schema.string(),
    }

    const operand = DB.Schema.number()
    const same = rule({
      match: {
        operand,
        modifier: operand,
      },
    })

    const livesNear = rule({
      match: {
        employee: employee.id,
        coworker: coworker.id,
      },
      where: [
        { match: [employee.id, 'address', employee.address] },
        { match: [coworker.id, 'address', coworker.address] },
        {
          when: DB.when(
            {
              employee: employee.address,
              coworker: coworker.address,
            },
            {
              tryFrom: ({ employee, coworker }) => {
                return employee.split(' ')[0] === coworker.split(' ')[0]
                  ? { ok: {} }
                  : { error: new Error() }
              },
            }
          ),
        },
        {
          not: same.match({
            operand: employee.id,
            modifier: coworker.id,
          }),
        },
      ],
    })

    const matches = DB.evaluate(db, {
      and: [
        livesNear.match({
          employee: employee.id,
          coworker: coworker.id,
        }),
        {
          match: [employee.id, 'name', employee.name],
        },
        {
          match: [coworker.id, 'name', coworker.name],
        },
      ],
    })

    assert.deepEqual(
      [...matches].map(($) => ({
        employee: $[employee.name.$],
        coworker: $[coworker.name.$],
      })),
      [
        { employee: 'Bitdiddle Ben', coworker: 'Aull DeWitt' },
        { employee: 'Hacker Alyssa P', coworker: 'Fect Cy D' },
        { employee: 'Fect Cy D', coworker: 'Hacker Alyssa P' },
        { employee: 'Aull DeWitt', coworker: 'Bitdiddle Ben' },
      ]
    )
  },
}
