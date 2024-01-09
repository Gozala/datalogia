import { PROPERTY_KEY } from './variable.js'
import { ByteView, Link as IPLDLink, Version } from 'multiformats'

export interface Link<
  Data extends {} | null = {} | null,
  Format extends number = number,
  Alg extends number = number,
> extends IPLDLink<Data, Format, Alg, 1> {
  ['/']: ByteView<this>
}

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

declare const Marker: unique symbol

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

export type Int32 = New<{ Int32: number }>
export type Float32 = New<{ Float32: number }>
export type Int64 = New<{ Int64: bigint }>

export type Bytes = Uint8Array
export type Constant = boolean | Int32 | Float32 | Int64 | string | Bytes | Link

/**
 * Variable is placeholder for a value that will be matched against by the
 * query engine. It is represented as an abstract `Reader` that will attempt
 * to read arbitrary {@type Data} and return result with either `ok` of the
 * `Type` or an `error`.
 *
 * Variables will be assigned unique `bindingKey` by a query engine that will
 * be used as unique identifier for the variable.
 */
export interface Variable<T extends Constant = Constant>
  extends TryFrom<{ Self: T; Input: Constant }> {
  [PROPERTY_KEY]?: PropertyKey
}

/**
 * Term is either a constant or a {@link Variable}. Terms are used to describe
 * predicates of the query.
 */
export type Term<T extends Constant = Constant> = T | Variable<T>

/**
 * Describes association between `entity`, `attribute`, `value` of the
 * {@link Fact}. Each component of the {@link Relation} is a {@link Term}
 * that is either a constant or a {@link Variable}.
 *
 * Query engine during execution will attempt to match {@link Relation} against
 * all facts in the database and unify {@link Variable}s across them to identify
 * all possible solutions.
 */
export type Pattern = [
  entity: Term<Entity>,
  attribute: Term<Attribute>,
  value: Term<Constant>,
]

export type Query = Variant<{
  // and clause
  and: Query[]
  // or clause
  or: Query[]
  // negation
  not: Query
  // expression clause
  // pattern match
  match: Pattern
  // predicate
  when: Predicate
  // rule application
  apply: ApplyRule
  // ignore
  ok: []
}>

export type Condition = Variant<{
  is: Pattern
  not: Pattern
}>

export type Clause = Variant<{
  and: Condition[]
  or: Condition[]
}>

export type Frame = Record<PropertyKey, Term>

export type Entity = string | Float32 | Int32 | Int64 | Bytes
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

export interface FactsSelector {
  entity?: Entity
  attribute?: Attribute
  value?: Constant
}

type Operation = Variant<{
  assert: Fact
}>

export interface Transaction extends Iterable<Operation> {}

export interface Transactor {
  transact(transaction: Transaction): Promise<Result<{}, Error>>
}

export interface Querier {
  facts(selector?: FactsSelector): Iterable<Fact>
}

export type Constraint = Variant<{
  '==': [Term, Term]
  '!=': [Term, Term]
  '<': [Term, Term]
  '<=': [Term, Term]
  '>': [Term, Term]
  '>=': [Term, Term]
}>

export type Rule = DeductiveRule | InductiveRule

export interface ApplyRule {
  input: Frame
  rule: Rule
}

export interface DeductiveRule {
  match: Bindings
  // where: RulePredicate[]
  where: Query
}

export interface InductiveRule {
  match: Bindings
  // where: RulePredicate[]
  where: Query
}

export interface Bindings extends Record<PropertyKey, Variable> {}

export type InferBindings<T extends Bindings> = {
  [K in keyof T]: T[K] extends Variable<infer U> ? U : never
}

/**
 * Selection describes set of (named) variables that query engine will attempt
 * to find values for that satisfy the query.
 */
export interface Selector extends Record<PropertyKey, Term> {}

export type Selection = Selector | Variable<Link<Record<PropertyKey, Constant>>>

export interface Match {
  match: Bindings
  rule: Rule
}

export type RulePredicate = Variant<{
  select: Selection

  match: Match
  or: RulePredicate[]
  not: RulePredicate
}>

export interface Not {
  not: Selector
  match?: void
  rule?: void
}

export type Combinator = Variant<{}>

export interface Predicate<Input = Frame> {
  match(input: Input): Result<{}, Error>
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

export interface Declaration {
  id: RelationID
  schema: Table

  source: Source
}

export type Source = Variant<{
  Edb: {}
  Idb: {}
}>

export interface Relation {
  length: number
  isEmpty(): boolean
  contains(bindings: Record<PropertyKey, Constant>): boolean
  search(bindings: Record<PropertyKey, Constant>): Iterable<Instance>

  purge(): void
  insert(bindings: Record<PropertyKey, Constant>, instance: Instance): void
  merge(relation: Relation): void
}

export interface Instance {
  id: RelationID
  rows: Record<RowID, Row>
  link: Link
}

export interface Table<Rows extends Record<RowID, Row> = Record<RowID, Row>> {
  id: RelationID
  rows: Rows
}

export interface Row {
  id: RowID
  type: RowType
}

export type Type = Variant<{
  Boolean: TryFrom<{ Self: boolean; Input: Constant }>
  Int32: TryFrom<{ Self: Int32; Input: Constant }>
  Int64: TryFrom<{ Self: Int64; Input: Constant }>
  Float32: TryFrom<{ Self: Float32; Input: Constant }>
  String: TryFrom<{ Self: string; Input: Constant }>
  Bytes: TryFrom<{ Self: Uint8Array; Input: Constant }>
  Link: TryFrom<{ Self: Link; Input: Constant }>
}>

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

export type InferFrame<Selection extends Selector> = {
  [Key in keyof Selection]: Selection[Key] extends Term<infer T> ? T : never
}
