import { ByteView, Link as IPLDLink } from 'multiformats'
import { Task } from './task.js'

export type { ByteView, Task }

/**
 * Generic reader interface that can be used to read `O` value form the
 * input `I` value. Reader may fail and error is denoted by `X` type.
 *
 * @template O - The output type of this reader
 * @template I - The input type of this reader.
 * @template X - The error type denotes failure reader may produce.
 */
export interface TryFrom<
  Type extends {
    Self: unknown
    Input: unknown
  },
> {
  tryFrom: (input: Type['Input']) => Result<Type['Self'], Error>
}

/**
 * Defines result type as per invocation spec
 *
 * @see https://github.com/ucan-wg/invocation/#6-result
 */

export type Result<T = unknown, X extends {} = {}> = Variant<{
  ok: T
  error: X
}>

/**
 * Utility type for defining a [keyed union] type as in IPLD Schema. In practice
 * this just works around typescript limitation that requires discriminant field
 * on all variants.
 *
 * ```ts
 * type Result<T, X> =
 *   | { ok: T }
 *   | { error: X }
 *
 * const demo = (result: Result<string, Error>) => {
 *   if (result.ok) {
 *   //  ^^^^^^^^^ Property 'ok' does not exist on type '{ error: Error; }`
 *   }
 * }
 * ```
 *
 * Using `Variant` type we can define same union type that works as expected:
 *
 * ```ts
 * type Result<T, X> = Variant<{
 *   ok: T
 *   error: X
 * }>
 *
 * const demo = (result: Result<string, Error>) => {
 *   if (result.ok) {
 *     result.ok.toUpperCase()
 *   }
 * }
 * ```
 *
 * [keyed union]:https://ipld.io/docs/schemas/features/representation-strategies/#union-keyed-representation
 */
export type Variant<U extends Record<string, unknown>> = {
  [Key in keyof U]: { [K in Exclude<keyof U, Key>]?: never } & {
    [K in Key]: U[Key]
  }
}[keyof U]

export type Tagged<T> = {
  [Case in keyof T]: Exclude<keyof T, Case> extends never
    ? T
    : InferenceError<'It may only contain one key'>
}[keyof T]

/**
 * Utility type for including type errors in the typescript checking. It
 * defines impossible type (object with non-existent unique symbol field).
 * This type can be used in cases where typically `never` is used, but
 * where some error message would be useful.
 */
interface InferenceError<message> {
  [Marker]: never & message
}

export declare const Marker: unique symbol

/**
 * A utility type to retain an unused type parameter `T`.
 * Similar to [phantom type parameters in Rust](https://doc.rust-lang.org/rust-by-example/generics/phantom.html).
 *
 * Capturing unused type parameters allows us to define "nominal types," which
 * TypeScript does not natively support. Nominal types in turn allow us to capture
 * semantics not represented in the actual type structure, without requiring us to define
 * new classes or pay additional runtime costs.
 *
 * For a concrete example, see {@link ByteView}, which extends the `Uint8Array` type to capture
 * type information about the structure of the data encoded into the array.
 */
export interface Phantom<T> {
  // This field can not be represented because field name is non-existent
  // unique symbol. But given that field is optional any object will valid
  // type constraint.
  [Marker]?: T
}

export type New<T, Type = Tagged<T>> = Tagged<T>[keyof Tagged<T>] &
  Phantom<Type>

/**
 * Type representing a unit value.
 */
export interface Unit {}

/**
 * Signed 32-bit integer type.
 */
export type Int32 = New<{ Int32: number }>
/**
 * Signed 64-bit integer type.
 */
export type Int64 = New<{ Int64: bigint }>
/**
 * 32-bit floating point number type.
 */
export type Float32 = New<{ Float32: number }>

/**
 * Type representing a raw bytes.
 */
export type Bytes = Uint8Array

/**
 * Type representing an IPLD link.
 */
export interface Link<
  Data extends {} | null = {} | null,
  Format extends number = number,
  Alg extends number = number,
> {
  ['/']: ByteView<this>
}

/**
 * All the constants in the system represented as a union of the following types.
 *
 * We are likely to introduce uint32, int8, uint8 and etc but for now we have
 * chosen to keep things simple.
 */
export type Constant = boolean | Int32 | Float32 | Int64 | string | Bytes | Link

/**
 * Supported primitive types. Definition utilizes `Phantom` type to describe
 * the type for compile type inference and `Variant` type to describe it for
 * the runtime inference.
 */
export type Type<T extends Constant = Constant> = Phantom<T> &
  Variant<{
    Boolean: Unit
    Int32: Unit
    Int64: Unit
    Float32: Unit
    String: Unit
    Bytes: Unit
    Link: Unit
  }>

// /**
//  * Variable is placeholder for a value that will be matched against by the
//  * query engine. It is represented as an abstract `Reader` that will attempt
//  * to read arbitrary {@type Data} and return result with either `ok` of the
//  * `Type` or an `error`.
//  *
//  * Variables will be assigned unique `bindingKey` by a query engine that will
//  * be used as unique identifier for the variable.
//  */
// export interface Variable<T extends Constant = Constant>
//   extends TryFrom<{ Self: T; Input: Constant }> {
//   type: RowType
//   [VARIABLE_ID]?: VariableID
// }

/**
 * Variable is placeholder for a value that will be matched against by the
 * query engine.
 */
export interface Variable<T extends Constant = Constant> {
  ['?']: {
    type?: Type<T>
    id: VariableID
  }
}

export type VariableID = number

/**
 * Term is either a constant or a {@link Variable}. Terms are used to describe
 * predicates of the query.
 */
export type Term<T extends Constant = Constant> = T | Variable<T>

export type ExtendedTerm = Constant | VariableVariant

export type VariableVariant = Variant<{
  Row: { id: RelationID; alias?: AliasID; row: RowID }
  Link: { id: RelationID; alias?: AliasID }
  Aggregate: { id: RelationID; alias?: AliasID; variable: Variable }
}>

/**
 * Describes association between `entity`, `attribute`, `value` of the
 * {@link Fact}. Each component of the {@link Relation} is a {@link Term}
 * that is either a constant or a {@link Variable}.
 *
 * Query engine during execution will attempt to match {@link Relation} against
 * all facts in the database and unify {@link Variable}s across them to identify
 * all possible solutions.
 */
export type Pattern = readonly [
  entity: Term<Entity>,
  attribute: Term<Attribute>,
  value: Term<Constant>,
]

export type Is = readonly [binding: Term<Constant>, value: Term<Constant>]

export type Clause = Variant<{
  // and clause
  And: Clause[]
  // or clause
  Or: Clause[]
  // negation
  Not: Clause
  // pattern match a fact
  Case: Pattern
  // match aggregated bindings
  Form: MatchForm
  // rule application
  Rule: MatchRule
  // assign bindings
  Is: Is
}>

export type Frame = Record<PropertyKey, Term>

export type Entity = Link
export type Attribute = string | Float32 | Int32 | Int64 | Bytes

/**
 * An atomic fact in the database, associating an `entity` , `attribute` ,
 * `value`.
 *
 * - `entity` - The first component is `entity` that specifies who or what the fact is about.
 * - `attribute` - Something that can be said about an `entity` . An attribute has a name,
 *    e.g. "firstName" and a value type, e.g. string, and a cardinality.
 * - `value` - Something that does not change e.g. 42, "John", true. Fact relates
 *    an `entity` to a particular `value` through an `attribute`.ich
 */
export type Fact = readonly [
  entity: Entity,
  attribute: Attribute,
  value: Constant,
]

/**
 * An atomic {@link Fact} with a `cause` field providing a causal relationship
 * that acts like timestamp.
 */
export type Datum = readonly [
  entity: Entity,
  attribute: Attribute,
  value: Constant,
  cause: Entity,
]

/**
 * Set of {@link Fact}s associating several attributes with the same new entity.
 * Each key represents an `attribute` and corresponding value represents it's
 * `value`.
 *
 * If value is an array of {@link Constant}s then entity is associated each
 * value with a same attribute.
 *
 * If value is an `Instantiation` then entity is associated with a new entity
 * that is described by that `Instantiation`.
 *
 * If value is an array of `Instantiation`s then entity is associated with a
 * each `Instantiation` in the array with an attribute corresponding to the
 * key.
 */
export interface Instantiation {
  [Key: string]: Constant | Constant[] | Instantiation | Instantiation[]
}

export interface FactsSelector {
  entity?: Entity
  attribute?: Attribute
  value?: Constant
}

export type Instruction = Variant<{
  Assert: Fact
  Retract: Fact
  Import: Instantiation
}>

export interface Transaction extends Iterable<Instruction> {}

export interface Transactor<Ok extends {} = {}> {
  transact(transaction: Transaction): Task<Ok, Error>
}

export interface Querier {
  scan(selector?: FactsSelector): Task<Datum[], Error>
}

export type Constraint = Variant<{
  '==': [Term, Term]
  '!=': [Term, Term]
  '<': [Term, Term]
  '<=': [Term, Term]
  '>': [Term, Term]
  '>=': [Term, Term]
}>

export type Operation = Variant<{
  // a.k.a Projection in PomoRA
  Select: Select
  Search: Search
  // a.k.a Aggregation
  Accumulate: Accumulate
}>

/**
 * Describes Projection unary operation in the PomoRA which is parameterized
 * over a set of attribute names, and restricts propositions in its input
 * relation to the attributes given by these names.
 *
 * @see https://github.com/RhizomeDB/PomoRA?tab=readme-ov-file#211-projection
 */
export interface Select<Rows extends Selector = Selector> {
  relationKey: RelationKey
  rows: Rows
  relation: Relation
  formulae: Formula[]
}

/**
 * A selection is a unary operation which is parameterized over a propositional
 * formula, and that returns instances in its input relation for which this
 * formula holds.
 *
 * @see https://github.com/RhizomeDB/PomoRA?tab=readme-ov-file#213-selection
 */

export interface Search {
  relationKey: RelationKey
  alias?: AliasID
  relation: Relation

  variables: Variables
  when: Formula[]
  operation: Operation
}

/**
 * a.k.a Aggregation
 */
export interface Accumulate<
  T extends Constant = Constant,
  Vars extends Variables = Variables,
> {
  variables: Vars
  aggregator: Aggregate<{
    Self: {} | null
    In: InferBindings<Vars>
    Out: T
  }>

  groupByRows: Variables
  target: Variable<T>

  id: RelationID
  alias?: AliasID
  relation: Relation
  when: Formula[]
  operation: Operation
}

export type Formula = Variant<{
  Equality: Equality
  NotIn: NotIn
  Predicate: Predicate
}>

export interface Equality {
  operand: Term
  modifier: Term
}

export interface NotIn<Rows extends Variables = Variables> {
  relationKey: RelationKey
  rows: Rows
  relation: Relation
}

export interface Predicate<Variables extends Selector = Selector> {
  variables: Variables
  schema: TryFrom<{ Self: {}; Input: InferBindings<Variables> }>
}

export type RelationKey = [RelationID, Version]
export type AliasID = string

export type Version = Variant<{
  Total: {}
  Delta: {}
  New: {}
}>

export type Rule<Match extends Selector = Selector> =
  | DeductiveRule<Match>
  | InductiveRule<Match>

export interface MatchRule<Match extends Selector = Selector> {
  input: Selector
  rule?: Rule<Match>
}

export interface DeductiveRule<Match extends Selector = Selector> {
  select: Match
  // where: RulePredicate[]
  where: Clause
}

export interface InductiveRule<Match extends Selector = Selector> {
  select: Match
  // where: RulePredicate[]
  where: Clause
}

export type RuleBodyTerm = Variant<{
  VariablePredicate: VariablePredicate
  RelationPredicate: RelationPredicate
  Negation: Negation
  Aggregation: Aggregation
}>

export interface RuleModel<Variables extends Selector = Selector> {
  head: RelationID
  variables: Variables
  body: RuleBodyTerm[]
}

export interface VariablePredicate<Vars extends Variables = Variables> {
  variables: Vars
  predicate: TryFrom<{ Self: {}; Input: InferBindings<Variables> }>
}

export interface RelationPredicate<Vars extends Variables = Variables> {
  variables: Vars
  relation: Declaration
  link?: Term<Link>
}

export interface Negation<Vars extends Variables = Variables> {
  variables: Vars
  relation: Declaration
}

export interface Aggregation<
  T extends Constant = Constant,
  Vars extends Variables = Variables,
> {
  target: Variable<T>
  variables: Vars
  relation: Declaration
  groupByRows: Vars
  aggregator: Aggregate<{
    Self: {} | null
    In: InferBindings<Vars>
    Out: T
  }>
}

export interface Variables extends Record<PropertyKey, Variable> {}
export interface Bindings extends Record<PropertyKey, Constant> {}

export type BindingKey = Variant<{
  Relation: { id: RelationID; alias?: AliasID; row: RowID }
  Link: { id: RelationID; alias?: AliasID }
  Aggregate: { id: RelationID; alias?: AliasID; variable: Variable }
}>

/**
 * Selection describes set of (named) variables that query engine will attempt
 * to find values for that satisfy the query.
 */
// export interface Selector
//   extends Record<PropertyKey, Term | Term[] | Selector | Selector[]> {}
export type Selector = PositionalSelector | NamedSelector

export interface PositionalSelector extends Array<Selector | Term> {}
export interface NamedSelector extends Record<PropertyKey, Selector | Term> {}

export interface Variables extends Record<PropertyKey, Term> {}

export type Selection = Selector | Variable<Link<Bindings>>

export interface Not {
  not: Selector
  match?: void
  rule?: void
}

export type Combinator = Variant<{}>

export type Confirmation = Variant<{
  ok: Unit
  error: Error
}>

export interface MatchForm<Variables extends Selector = Selector> {
  selector: Variables

  confirm(selector: Selector, bindings: Bindings): Confirmation
}

/**
 * Aggregate is a stateful operation that can be used to compute results of the
 * query.
 */
export interface Aggregate<
  Type extends {
    Self: {} | null
    In: unknown
    Out: unknown
  } = {
    Self: {} | null
    In: unknown
    Out: unknown
  },
> {
  init(): Type['Self']
  /**
   * Takes the aggregator state and new input value and computes new state.
   */
  step(state: Type['Self'], input: Type['In']): Result<Type['Self'], Error>
  /**
   * Takes aggregator state and computes final result.
   */
  end(state: Type['Self']): Result<Type['Out'], Error>
}

export type RelationID = string
// ColId
export type RowID = string

export interface Declaration<Schema extends Rows = Rows> {
  id: RelationID
  schema: Table<Schema>

  source: Source

  relation: Relation
}

export type Source = Variant<{
  Edb: {}
  Idb: {}
}>

export interface Relation {
  length: number
  isEmpty(): boolean
  contains(bindings: Bindings): boolean
  search(bindings: Bindings): Iterable<Association>

  purge(): void
  insert(bindings: Bindings, instance: Association): void
  merge(relation: Relation): void
}

export interface Table<Schema extends Rows = Rows> {
  id: RelationID
  rows: Schema
}

export interface Rows extends Record<RowID, Row> {}

export interface Row<Type extends RowType = RowType> {
  id: RowID
  type: Type
}

export type RowTerm<T extends Constant = Constant> = T | Variable<T>

export type RowType = Variant<{
  Any: TryFrom<{ Self: Constant; Input: Constant }>
  Boolean: TryFrom<{ Self: boolean; Input: Constant }>
  Int32: TryFrom<{ Self: Int32; Input: Constant }>
  Int64: TryFrom<{ Self: Int64; Input: Constant }>
  Float32: TryFrom<{ Self: Float32; Input: Constant }>
  String: TryFrom<{ Self: string; Input: Constant }>
  Bytes: TryFrom<{ Self: Uint8Array; Input: Constant }>
  Link: TryFrom<{ Self: Link; Input: Constant }>
}>

export type InferType<T extends RowType> = T['Any'] extends TryFrom<any>
  ? Constant
  : T['Boolean'] extends TryFrom<any>
    ? boolean
    : T['Int32'] extends TryFrom<any>
      ? Int32
      : T['Int64'] extends TryFrom<any>
        ? Int64
        : T['Float32'] extends TryFrom<any>
          ? Float32
          : T['String'] extends TryFrom<any>
            ? string
            : T['Bytes'] extends TryFrom<any>
              ? Uint8Array
              : T['Link'] extends TryFrom<any>
                ? Link
                : never

export type InferBindings<Selection extends Selector> = {
  [Key in keyof Selection]: Selection[Key] extends Term<infer T>
    ? T
    : Selection[Key] extends Term<infer T>[]
      ? T[]
      : Selection[Key] extends Selector[]
        ? InferBindings<Selection[Key][0]>[]
        : Selection[Key] extends Selector
          ? InferBindings<Selection[Key]>
          : never
}

export type InferTerm<T extends Term> = T extends Term<infer U> ? U : never

export interface BlockStore {}

/**
 * Rhizome calls these a [`Fact`] in the AST context and a [`Tuple`] in the
 * execution context and both are confusing given that [PomoDB Fact]s are EAVT
 * quads (4-tuples), and tuples are very overloaded. PomoLogic call these a
 * [ground atom][]s.
 *
 * We call these an `Association` because they represent set of attributes for
 * the same entity.
 *
 * [`Fact`]:https://github.com/RhizomeDB/rs-rhizome/blob/1a3a027dea60a3083596f00f2a4d6d5982eed040/rhizomedb/src/logic/ast/fact.rs
 * [PomoDB Fact]:https://github.com/RhizomeDB/spec?tab=readme-ov-file#412-fact
 * [ground atom]:https://github.com/RhizomeDB/PomoLogic/tree/e0a2b383cd5f08d7b950cf79147f95fe2bd47c90#atoms
 */
export interface Association<Attributes extends Bindings = Bindings> {
  head: RelationID
  attributes: Attributes
  link?: Link
}

export type Expression = Variant<{
  Association: Association
  Rule: RuleModel
}>

export interface Program {
  declarations: Declaration[]
  expressions: Expression[]
}

export interface Stratum {
  relations: Set<RelationID>
  recursive: boolean
  expressions: Expression[]
}

// RAM

export type Statement = Variant<{
  Insert: Insert
  Merge: Merge
  Purge: Purge
  Loop: Loop
}>

export interface Insert {
  operation: Operation
  // Whether the insertion is for a ground atom with all constant columns.
  isGround: boolean
}

export interface Merge {
  fromKey: RelationKey
  intoKey: RelationKey

  from: Relation
  into: Relation
}

export interface Swap {
  fromKey: RelationKey
  intoKey: RelationKey

  from: Relation
  into: Relation
}

export interface Purge {
  relationKey: RelationKey
  relation: Relation
}

export interface Loop {
  body: Statement[]
}
