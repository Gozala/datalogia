import { PROPERTY_KEY } from './lib.js'

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

export type Int32 = New<{ Integer: number }>
export type Float32 = New<{ Float: number }>
export type Uint64 = New<{ Uint64: bigint }>
export type Link<T extends {} | null = {} | null> = New<{ Link: Uint8Array }, T>

export type Bytes = Uint8Array
export type Constant =
  | boolean
  | Int32
  | Float32
  | Uint64
  | string
  | Bytes
  | Link

export interface Variable<T extends Constant = Constant>
  extends TryFrom<{ Self: T; Input: Constant }> {
  [PROPERTY_KEY]?: PropertyKey
}

export type Term<T extends Constant = Constant> = T | Variable<T>

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

export type Entity = string | Float32 | Int32 | Uint64 | Bytes
export type Attribute = string | Float32 | Int32 | Uint64 | Bytes
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

export interface Atom extends Record<PropertyKey, Term> {}

export type Selection = Atom | Variable<Link<Record<PropertyKey, Constant>>>

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
  not: Atom
  match?: void
  rule?: void
}

export type Combinator = Variant<{}>

export interface Predicate<Input = Frame> {
  match(input: Input): Result<{}, Error>
}
