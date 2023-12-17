# Deductive

Library for querying in-memory facts using [datalog]

## Example


```js
import { Schema, query } from "deductive"

export const demo = (db) => {

  // We will be trying to find movie titles and director names for movies
  // where Arnold Schwarzenegger casted. We do not a database schema for
  // writes but we do need schema for queries meaning we want to define
  // relations between entities and attributes.

  // Since we will look for directors we define an entity which will have
  // "person/name" attribute.
  const director = DB.entity({
    "person/name": Schema.string(),
  })

  // We also define entity actor that also has "person/name" attribute.
  const actor = DB.entity({
    "person/name": Schema.string(),
  })

  // Finally we define a movie entity that has relationship with actor and
  // director entities and a "movie/title" attribute.

  const movie = DB.entity({
    "movie/title": Schema.string(),
    "movie/director": director,
    "movie/cast": actor,
  })

  query(db, {
    // We want to select matched director name and matched movie titles from db
    select: {
      director: director["person/name"],
      movie: movie["movie/title"],
    },
    where: [
      // where actor is named "Arnold Schwarzenegger"
      actor.match({ "person/name": "Arnold Schwarzenegger" }),
      // and where movie had an actor in the cast
      movie.match({ "movie/cast": actor })
    ],
  })
  // [
  //   { director: 'James Cameron', movie: 'The Terminator' },
  //   { director: 'John McTiernan', movie: 'Predator' },
  //   { director: 'Mark L. Lester', movie: 'Commando' },
  //   { director: 'James Cameron', movie: 'Terminator 2: Judgment Day' },
  //   {
  //     director: 'Jonathan Mostow',
  //     movie: 'Terminator 3: Rise of the Machines',
  //   },
  // ]
}
```


[datalog]: https://en.wikipedia.org/wiki/Datalog
