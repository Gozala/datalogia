import { variables } from './clause.js'
import { VARIABLE_ID } from './variable.js'
import { ByteView, Link as IPLDLink } from 'multiformats'

export type { ByteView }

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
  type: RowType
  [VARIABLE_ID]?: VariableID
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
export type Pattern = [
  entity: Term<Entity>,
  attribute: Term<Attribute>,
  value: Term<Constant>,
]

export type Clause = Variant<{
  // and clause
  and: Clause[]
  // or clause
  or: Clause[]
  // negation
  not: Clause
  // expression clause
  // pattern match
  match: Pattern
  // predicate
  when: When
  // rule application
  apply: ApplyRule
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

export type Instruction = Variant<{
  assert: Fact
}>

export interface Transaction extends Iterable<Instruction> {}

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
  Variables extends Selector = Selector,
> {
  variables: Variables
  aggregator: Aggregate<{
    Self: {} | null
    In: InferBindings<Variables>
    Out: T
  }>

  groupByRows: Selector
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

export interface NotIn<Rows extends Selector = Selector> {
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

export type Rule = DeductiveRule | InductiveRule

export interface ApplyRule {
  input: Frame
  rule: Rule
}

export interface DeductiveRule {
  match: Variables
  // where: RulePredicate[]
  where: Clause
}

export interface InductiveRule {
  match: Variables
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

export interface VariablePredicate<Variables extends Selector = Selector> {
  variables: Variables
  predicate: TryFrom<{ Self: {}; Input: InferBindings<Variables> }>
}

export interface RelationPredicate<Variables extends Selector = Selector> {
  variables: Variables
  relation: Declaration
  link?: Term<Link>
}

export interface Negation<Variables extends Selector = Selector> {
  variables: Variables
  relation: Declaration
}

export interface Aggregation<
  T extends Constant = Constant,
  Variables extends Selector = Selector,
> {
  target: Variable<T>
  variables: Variables
  relation: Declaration
  groupByRows: Selector
  aggregator: Aggregate<{
    Self: {} | null
    In: InferBindings<Variables>
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
export interface Selector extends Record<PropertyKey, Term> {}

export type Selection = Selector | Variable<Link<Bindings>>

export interface Not {
  not: Selector
  match?: void
  rule?: void
}

export type Combinator = Variant<{}>

export interface When<Input extends Variables = Variables> {
  match(input: InferBindings<Input>): Result<{}, Error>
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

export type InferBindings<Selection extends Selector> = {
  [Key in keyof Selection]: Selection[Key] extends Term<infer T> ? T : never
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
