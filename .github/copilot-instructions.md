# COPILOT EDITS OPERATIONAL GUIDELINES

## PRIME DIRECTIVE

  Avoid working on more than one file at a time.
  Multiple simultaneous edits to a file will cause corruption.
  Be chatting and teach about what you are doing while coding.

## LARGE FILE & COMPLEX CHANGE PROTOCOL

### MANDATORY PLANNING PHASE

  When working with large files (>300 lines) or complex changes:
    1. ALWAYS start by creating a detailed plan BEFORE making any edits
          2. Your plan MUST include:
                  - All functions/sections that need modification
                  - The order in which changes should be applied
                  - Dependencies between changes
                  - Estimated number of separate edits required

          3. Format your plan as:

  ## PROPOSED EDIT PLAN

      Working with: [filename]
      Total planned edits: [number]

  ### MAKING EDITS

      - Focus on one conceptual change at a time
      - Show clear "before" and "after" snippets when proposing changes
      - Include concise explanations of what changed and why
      - Always check if the edit maintains the project's coding style

  ### Edit sequence:

      1. [First specific change] - Purpose: [why]
      2. [Second specific change] - Purpose: [why]
      3. Do you approve this plan? I'll proceed with Edit [number] after your confirmation.
      4. WAIT for explicit user confirmation before making ANY edits when user ok edit [number]

  ### EXECUTION PHASE

      - After each individual edit, clearly indicate progress:
        "✅ Completed edit [#] of [total]. Ready for next edit?"
      - If you discover additional needed changes during editing:
      - STOP and update the plan
      - Get approval before continuing


### REFACTORING GUIDANCE

    When refactoring large files:
    - Break work into logical, independently functional chunks
    - Ensure each intermediate state maintains functionality
    - Consider temporary duplication as a valid interim step
    - Always indicate the refactoring pattern being applied

### RATE LIMIT AVOIDANCE

    - For very large files, suggest splitting changes across multiple sessions
    - Prioritize changes that are logically complete units
    - Always provide clear stopping points

## General Requirements

  - Use modern technologies as described below for all code suggestions. 
  - Prioritize clean, maintainable code with appropriate comments.
  - Different parts of the codebase should be modular and reusable, use dependency injection where applicable.
  - Singular responsibility principle should be followed as possible.
  - Write the code that is easy to delete.

## Documentation Requirements

  - Include JSDoc comments for JavaScript/TypeScript.
  - Document complex functions with clear examples.
  - Maintain concise Markdown documentation.
  - Minimum docblock info: `param`, `return`, `throws`

## Security Considerations

  - Sanitize all user inputs thoroughly.
  - Enforce strong Content Security Policies (CSP).
  - Use CSRF protection where applicable.
  - Ensure secure cookies (`HttpOnly`, `Secure`, `SameSite=Strict`).
  - Limit privileges and enforce role-based access control.
  - Implement detailed internal logging and monitoring.

## Context

- **Project Type**: Next.js (15+) application with a Node.js backend
- **Language**: TypeScript
- **Framework / Libraries**:   
  - Next.js (15+) / React / Vite / TailwindCSS / Vitest
- **Architecture**: Modular / Clean Architecture / Layered Services / Component-Based for client

## 🔧 General Guidelines

- Use idiomatic TypeScript with strict type checking enabled, do not use `any`.
- Use named `async` functions and avoid long inline callbacks.
- Validate input using Zod schemas and return structured error responses.
- Organize code with clear separation of concerns (routes → controller → service → repository).
- Use centralized error handling middleware.
- Format code with Prettier and enforce standards with ESLint.

## Specific React Guidelines
- When creating a React Context, separate the context definition, provider, and hooks into distinct files.
- Use functional components with hooks, avoid class components.

## 📁 File Structure

Use kebab-style naming for files and directories, e.g. `user.service.ts`, `auth.controller.ts`, `user-feedback.service.ts`.

Use latest Next.js (15+) style file structure for both server and client:
- [Next.js Project Structure](https://nextjs.org/docs/app/getting-started/project-structure)
 

## 🧶 Patterns

### ✅ Patterns to Follow

- Use `express.Router()` for grouping route handlers by domain.
- Validate request bodies and query params with Zod inside middleware or controllers.
- Create OpenAPI documentation for all endpoints using `swagger-jsdoc`.
- Return consistent JSON responses with `status`, `message`, and `data`.
- Use dependency injection for service and repository layers.
- Store config and secrets in `.env` and load with `dotenv`.
- Use a logging library (e.g. `tslog`) for structured logging, inject logger everywhere using ILogger interface.
- Code must be loosely coupled: do not use direct imports between features/services/modules, use interfaces and dependency injection instead.
- Follow SOLID pricinples where appicable.

### 🚫 Patterns to Avoid

- Don’t put business logic directly in route handlers.
- Avoid using `any`.
- Don’t use `console.log` directly — use a logger.
- Don’t hardcode values — pull from config or env vars.
- Avoid monolithic controllers — break down logic into services and helpers.

## 🧪 Testing Guidelines

- Use `Vitest` for unit and integration tests.
- Use `supertest` for HTTP layer testing.
- Mock services and DB calls to isolate controller behavior.
- Use test doubles or stubs for external APIs.
- Test Zod schemas for valid/invalid cases where applicable.

## 📚 References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [tslog Logging](https://github.com/fullstack-build/tslog)
- [dotenv Config Docs](https://github.com/motdotla/dotenv)
- [Express.js Documentation](https://expressjs.com/)
- [Zod Documentation](https://zod.dev/)
- [Jest Documentation](https://jestjs.io/)
- [Supertest for Express](https://github.com/visionmedia/supertest)
- [ESLint Rules for TypeScript](https://typescript-eslint.io/rules/)
- [Prettier Formatter](https://prettier.io/)