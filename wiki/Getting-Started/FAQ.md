# NeuroSwarm FAQ

## Getting Started

### Q: What are the system requirements for contributing?
**A:** NeuroSwarm development requires:
- Node.js 18+ and npm/yarn
- Rust 1.70+ for Solana programs
- Git for version control
- A GitHub account for collaboration

### Q: How do I set up my development environment?
**A:** Follow our [Getting Started Guide](Getting-Started.md) for step-by-step instructions. We also provide automated setup scripts in the `/scripts/` directory.

### Q: I'm getting build errors. What should I do?
**A:** Check these common solutions:
1. Ensure all prerequisites are installed
2. Run `npm install` in all package directories
3. Check for missing environment variables
4. Review the [troubleshooting section](Getting-Started.md#troubleshooting) in Getting Started

## Development

### Q: How does the Kanban workflow work?
**A:** Tasks move through three states:
- **Ready**: Backlog items ready for work
- **In Progress**: Currently being worked on
- **Done**: Completed and merged

Use our sync agent to automatically track progress in GitHub Projects.

### Q: What are the file placement rules?
**A:** Our monorepo enforces strict organization:
- Tests go in `/tests/`
- Documentation in `/docs/`
- Scripts in `/scripts/`
- Source code in appropriate subsystem directories

The hygiene checker will automatically enforce these rules.

### Q: How do I run tests?
**A:** Use the test runners in each package:
- `npm test` for JavaScript/TypeScript
- `cargo test` for Rust
- `Invoke-Pester` for PowerShell scripts
- Integration tests for cross-system validation

## Governance

### Q: How do I participate in governance?
**A:** Join our weekly rituals documented in [Governance/rituals.md](../Governance/rituals.md). All decisions are logged in our transparency record.

### Q: What's the difference between off-chain and on-chain governance?
**A:** Off-chain governance handles community decisions and development direction. On-chain governance manages protocol parameters and smart contract updates.

## Technical

### Q: What is a PDA in NeuroSwarm?
**A:** PDA stands for Program-Derived Address. These are deterministic addresses used by our Solana programs for secure, predictable account management.

### Q: How does the sync agent work?
**A:** The sync agent monitors `docs/todo.md` for changes and automatically synchronizes tasks with GitHub Projects. It also enforces structural hygiene and logs governance events.

### Q: What testing frameworks do you use?
**A:** We use:
- Jest for JavaScript/TypeScript
- Rust's built-in testing framework
- Pester for PowerShell scripts
- Integration tests for cross-system validation

## Troubleshooting

### Q: The sync agent isn't working. What do I check?
**A:** Verify:
1. `docs/todo.md` exists and is properly formatted
2. GitHub CLI (`gh`) is authenticated
3. The sync agent has proper permissions
4. Check logs in `governance/logs/wp_publish_log.jsonl`

### Q: CI/CD is failing. How do I fix it?
**A:** Common issues:
1. Code doesn't pass linting - run formatters
2. Tests are failing - check test output
3. File placement violations - run hygiene check
4. Missing dependencies - check lockfiles

### Q: I can't access certain documentation. What now?
**A:** Some docs may be work-in-progress. Check the [full KB index](../Index.md) or ask in our governance discussions.

## Getting Help

### Q: Where can I ask questions?
**A:** Use GitHub Discussions for community questions, or join our weekly governance rituals for structured discussions.

### Q: How do I report bugs or request features?
**A:** Create issues in the [GitHub repository](https://github.com/brockhager/neuro-infra/issues) with appropriate labels.

### Q: I want to contribute but don't know where to start.
**A:** Start with the [Getting Started Guide](Getting-Started.md), then look for "good first issue" labels in our repository.