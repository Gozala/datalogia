import { query, Memory, API, variable } from '../src/lib.js'
import * as Archive from './archive.js'
import { assertEquals } from 'jsr:@std/assert'

const imdb = await Archive.open({
  json: new URL('./imdb.top1k.json', import.meta.url),
})

const moviesWithArnold = async () => {
  const $ = {
    movie: variable(),
    title: variable(),
    actor: variable(),
  }

  const result = await query(imdb, {
    select: {
      title: $.title,
      actor: $.actor,
    },
    where: [
      { Case: [$.movie, 'movie/title', $.title] },
      { Case: [$.movie, 'movie/cast', $.actor] },
      { Case: [$.actor, 'actor/name', 'Arnold Schwarzenegger'] },
    ],
  })

  assertEquals(result.length, 3)
}

Deno.bench('Run query with a join', moviesWithArnold)
