import * as DB from 'datalogia'
import db from './microshaft.db.js'
import { rule } from '../src/rule.js'

/**
 * @type {import('entail').Suite}
 */
export const testRules = {
  'test wheel rule': async (assert) => {
    const person = DB.link()
    const manager = DB.link()
    const employee = DB.link()
    const wheel = rule({
      select: { person },
      where: [
        { Case: [manager, 'supervisor', person] },
        { Case: [employee, 'supervisor', manager] },
      ],
    })

    const who = DB.link()
    const name = DB.string()

    const matches = await DB.query(db, {
      select: {
        name: name,
      },
      where: [wheel.match({ person: who }), DB.match([who, 'name', name])],
    })

    assert.deepEqual(
      [...matches],
      [{ name: 'Bitdiddle Ben' }, { name: 'Warbucks Oliver' }]
    )
  },

  'leaves near': async (assert) => {
    const employee = {
      id: DB.link(),
      name: DB.string(),
      address: DB.string(),
    }

    const coworker = {
      id: DB.link(),
      name: DB.string(),
      address: DB.string(),
    }

    const operand = DB.link()
    const same = rule({
      select: {
        operand,
        modifier: operand,
      },
    })

    const livesNear = rule({
      select: {
        employee: employee.id,
        coworker: coworker.id,
      },
      where: [
        DB.match([employee.id, 'address', employee.address]),
        DB.match([coworker.id, 'address', coworker.address]),
        DB.select({
          employee: employee.address,
          coworker: coworker.address,
        }).where(
          ({ employee, coworker }) =>
            employee.split(' ')[0] === coworker.split(' ')[0]
        ),
        DB.not(same.match({ operand: employee.id, modifier: coworker.id })),
      ],
    })

    const matches = await DB.query(db, {
      select: {
        employee: employee.name,
        coworker: coworker.name,
      },
      where: [
        livesNear.match({
          employee: employee.id,
          coworker: coworker.id,
        }),
        DB.match([employee.id, 'name', employee.name]),
        DB.match([coworker.id, 'name', coworker.name]),
      ],
    })

    assert.deepEqual(
      [...matches],
      [
        { employee: 'Bitdiddle Ben', coworker: 'Aull DeWitt' },
        { employee: 'Hacker Alyssa P', coworker: 'Fect Cy D' },
        { employee: 'Fect Cy D', coworker: 'Hacker Alyssa P' },
        { employee: 'Aull DeWitt', coworker: 'Bitdiddle Ben' },
      ]
    )
  },
}
