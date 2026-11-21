---
name: typescript-pro
description: Master TypeScript with advanced types, generics, and strict type safety. Handles complex type systems, decorators, enterprise-grade patterns, and modern toolchains. Triggers on tasks involving TypeScript architectures, advanced typing, utility types, generics, React/Node TypeScript integration, or strict compiler configurations.
license: MIT
metadata:
  author: sickn33
  version: "1.0.0"
---

# TypeScript Pro

Expert guide and senior-level playbook for enterprise-grade TypeScript 5.0+ development, advanced type-system programming, strict type safety, and modern full-stack architectures.

## When to Apply

Activate this skill when:
- Designing TypeScript architectures, domain models, or shared cross-package type contracts
- Solving complex typing challenges, higher-order generics, or type-inference roadblocks
- Writing custom utility types, conditional types, mapped types, or template literal types
- Enforcing strict production-grade type safety and eliminating implicit/explicit `any`
- Configuring `tsconfig.json` for optimal strictness, monorepos, or compilation performance
- Integrating TypeScript with React, Next.js, Node.js, NestJS, tRPC, or Prisma

## Reference Subdocuments

For detailed patterns, syntax recipes, and deep dives, consult the subdocuments in `references/`:

- [Type System Reference](./references/type-system.md): Structural typing, interfaces vs types, unions, intersections, literal types, and narrowing.
- [Generics Guide](./references/generics.md): Type constraints, variance, recursive types, `infer` keyword, and conditional types.
- [Enterprise Patterns](./references/enterprise-patterns.md): Branded/nominal types, exhaustive switch checks, builder pattern, and domain-driven type design.
- [React Integration](./references/react-integration.md): Generic components, hook typing, polymorphic components (`as` prop), and forwardRef patterns.
- [NestJS & Backend Integration](./references/nestjs-integration.md): Decorators, DTOs with `class-validator`, metadata reflection, and dependency injection.
- [Toolchain & Configuration](./references/toolchain.md): Strict `tsconfig.json` flags, project references, incremental builds, and bundler configurations.

## Core Rules & Principles

### 1. Strict Configuration by Default
Always recommend and configure strict compiler flags in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "skipLibCheck": true
  }
}
```

### 2. Zero Unjustified `any`
- Never use `any` when `unknown` can be paired with type guards or assertion functions.
- If runtime boundary parsing is needed, use Zod, Valibot, or custom type predicates (`val is T`).

### 3. Advanced Type-System Patterns
- **Discriminated Unions**: Model states with distinct `kind` or `type` tags to guarantee exhaustive type narrowing.
- **The `satisfies` Operator**: Validate an expression against a type without widening or losing specific literal keys/types.
- **Branded Types**: Prevent primitive obsession (e.g. `type UserId = string & { readonly __brand: unique symbol }`).
- **Template Literal Types**: Build typesafe paths, event names, and string unions (e.g. `type Route = `/${string}``).
- **Conditional Types & `infer`**: Extract return types, unwrapped promises, or array element types ergonomically.

### 4. Type Ergonomics & Performance
- Favor type inference over excessive explicit typing on variable declarations when the type is obvious.
- Keep unions of string literals performant; avoid gigantic combinatorial template literal unions that stress `tsc`.
- Design public APIs with clear generic defaults and constraints (`<T extends Record<string, unknown> = DefaultConfig>`).
- Optimize build times with incremental compilation and project references.
