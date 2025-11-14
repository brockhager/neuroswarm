# Contributor Onboarding Guide

## Locating and Resolving Problems

### Viewing Problems in VS Code
- Open the bottom panel → "Problems" tab (next to Output/Terminal).
- Shortcut: `Ctrl+Shift+M` (Windows/Linux) or `Cmd+Shift+M` (Mac).
- This tab shows all ESLint and TypeScript errors with file paths, line numbers, and descriptions.

### Viewing Problems in Terminal
- Run `pnpm lint` or `npm run lint` to see ESLint issues.
- Run `pnpm typecheck` or `npx tsc --noEmit` to see TypeScript compilation errors.
- Errors appear as: `file path → line:column → rule/message`.

### Common Issue Types and Fixes
- **Unused imports/variables**: Remove them or prefix with `_` if needed for side effects.
- **JSX entities**: Escape `&` to `&amp;`, `<` to `&lt;`, `>` to `&gt;`, `"` to `&quot;`, `'` to `&apos;`.
- **Missing types**: Add explicit type annotations or use `unknown` instead of `any`.
- **React keys**: Add unique `key` props to mapped elements.
- **useEffect dependencies**: Include all dependencies in the dependency array.
- **Client/Server boundaries**: Use `'use client'` directive in Next.js for client-side code.

### Validation Steps
After fixing issues:
1. Run `pnpm lint` → expect 0 problems.
2. Run `pnpm typecheck` → expect 0 errors.
3. Run `pnpm build` → confirm successful compilation.