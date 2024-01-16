# Datalogia

Library for querying in-memory facts using [datalog].

## Example


```js
import * as DB from "datalogia"

export const demo = (db) => {
  // We will be trying to find movie titles and director names for movies
  // where Arnold Schwarzenegger casted. We do not need a database schema
  // for writes but we do need schema for queries meaning we want to define
  // relations between entities and attributes.

  // We well be looking for actors and directors that are entities with
  // "person/name" attribute.
  const Person = DB.entity({
    "person/name": DB.string,
  })

  // We also define `Moive` entity with attributes for the director, cast
  // and a title.
  const Movie = DB.entity({
    "movie/title": DB.string,
    "movie/director": Person,
    "movie/cast": Person,
  })

  // No we'll define set of variables used by our query
  const director = Person()
  const actor = Person()

  const results = DB.query(db, {
    // We want find movie titles and their directors that
    select: {
      director: director["person/name"],
      movie: movie["movie/title"],
    },
    where: [
      // Movie casted our actor
      movie['movie/cast'].is(actor),
      // Movie was directed by our director
      movie['movie/director'].is(director),
      // Actor is named 'Arnold Schwarzenegger
      actor['preson/name'].is("Arnold Schwarzenegger")
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
