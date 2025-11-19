# Contributor Onboarding Guide

## Contributor Journey

### Phase 1: Getting Started (Week 1)
1. **Setup Development Environment**
   - Clone the repository: `git clone https://github.com/brockhager/neuro-infra.git`
   - Install dependencies: `pnpm install`
   - Verify setup: `pnpm lint && pnpm typecheck && pnpm build`

2. **Explore the Codebase**
   - Read `/docs/README.md` for project overview
   - Review `/docs/architecture.md` for system design
   - Check `/docs/swarm-algorithms.md` for AI coordination details
   - Run tests: `pnpm test` to understand current functionality

3. **Make Your First Contribution**
   - Check GitHub Project Board for "Ready" tasks
   - Pick a small documentation or test improvement
   - Follow the contribution workflow below

### Phase 2: Active Development (Weeks 2-4)
1. **Understand Swarm Intelligence**
   - Study agent protocols in `/src/agent-protocol.ts`
   - Review consensus mechanisms in `/src/consensus/`
   - Run simulations in `/scripts/simulate-swarm.ps1`

2. **Contribute to Core Features**
   - Implement agent coordination algorithms
   - Add consensus voting mechanisms
   - Improve evaluation metrics and monitoring

3. **Participate in Governance**
   - Join consensus decisions on major changes
   - Review pull requests from other contributors
   - Help maintain code quality standards

### Phase 3: Advanced Contributions (Month 2+)
1. **Lead Initiatives**
   - Propose new swarm algorithms
   - Design tokenomics improvements
   - Architect scaling solutions

2. **Mentor New Contributors**
   - Review onboarding documentation
   - Help with complex technical decisions
   - Maintain contributor experience

3. **Shape Project Direction**
   - Participate in strategic planning
   - Influence governance policies
   - Drive economic model development

## Emergency Freeze Protocol

### When to Use Emergency Freeze
- **Security vulnerabilities** discovered in production
- **Critical consensus failures** affecting system integrity
- **Economic exploits** threatening token value
- **Infrastructure attacks** requiring immediate shutdown

### Freeze Protocol Steps

#### 1. Initiate Freeze (Immediate Action)
```bash
# Navigate to emergency scripts
cd neuroswarm/scripts

# Run emergency freeze
.\emergency-freeze.ps1 -Action freeze -Reason "Security vulnerability detected"
```

#### 2. Assess Situation
- **Gather evidence**: Document the issue with logs and screenshots
- **Assess impact**: Determine affected systems and data
- **Notify stakeholders**: Alert core team and affected contributors

#### 3. Coordinate Response
- **Form incident response team**: Assign roles (lead, comms, technical)
- **Establish communication**: Use dedicated Slack channel or GitHub issue
- **Set timeline**: Define investigation and recovery phases

#### 4. Execute Recovery
- **Deploy fixes**: Apply security patches and system updates
- **Validate fixes**: Run comprehensive tests and simulations
- **Monitor recovery**: Watch for side effects and performance issues

#### 5. Unfreeze System
```bash
# Run emergency unfreeze
.\emergency-freeze.ps1 -Action unfreeze -Reason "Security patches deployed and validated"
```

### Freeze Protocol Responsibilities

#### Core Team Members
- **Initiate freeze** when criteria are met
- **Lead investigation** and coordinate response
- **Communicate status** to all stakeholders
- **Authorize unfreeze** after validation

#### Contributors
- **Stop all deployments** immediately upon freeze notification
- **Assist investigation** if requested by core team
- **Monitor communications** for updates
- **Resume normal activity** after unfreeze confirmation

#### External Stakeholders
- **Monitor status** through official channels
- **Avoid system interactions** during freeze
- **Provide feedback** on impact and recovery

### Post-Freeze Review
- **Document incident**: Create detailed incident report
- **Review protocol**: Identify improvements to freeze procedures
- **Update training**: Ensure all contributors understand their roles
- **Prevent recurrence**: Implement additional safeguards

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