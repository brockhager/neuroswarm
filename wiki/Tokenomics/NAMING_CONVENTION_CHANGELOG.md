# Token Naming Convention Update - Changelog

## Date: November 30, 2025

### Change Summary

NeuroSwarm has officially adopted a new token naming convention for improved clarity and consistency across all documentation and code references.

### Old vs New Naming

| Old Name | New Name | Purpose |
|:---------|:---------|:--------|
| **NSM** (NeuroSwarm Main Token) | **NST** (NeuroSwarm Token) | Primary utility and governance token |
| **NSC** (NeuroSwarm Credit) | **NSD** (NeuroSwarm Data) | Data credits for services and orchestration |

### Rationale

- **NST (NeuroSwarm Token)**: Simplified naming that clearly identifies it as the primary token
- **NSD (NeuroSwarm Data)**: Better represents its purpose as data credits for computational services

### Files Updated

✅ [`wiki/Tokenomics/TOKENOMICS.md`](file:///c:/JS/ns/neuroswarm/wiki/Tokenomics/TOKENOMICS.md) - Created with NST/NSD naming  
✅ [`wiki/Consensus/CONSENSUS_DESIGN.md`](file:///c:/JS/ns/neuroswarm/wiki/Consensus/CONSENSUS_DESIGN.md) - Created with naming convention notice  
✅ [`wiki/Tokenomics/Dual-Token Model for NeuroSwarm.md`](file:///c:/JS/ns/neuroswarm/wiki/Tokenomics/Dual-Token%20Model%20for%20NeuroSwarm.md) - Updated NSM→NST, NSC→NSD  
✅ [`wiki/project-docs/stories.md`](file:///c:/JS/ns/neuroswarm/wiki/project-docs/stories.md) - Updated tokenomics references

### Action Items for Contributors

**For Documentation:**
- Use **NST** and **NSD** in all new documentation
- Update any remaining legacy references to NSM/NSC when encountered

**For Code:**
- Update environment variables and configuration files (if applicable)
- Search codebase for hardcoded NSM/NSC references

**For Communication:**
- Use NST and NSD in all governance discussions
- Update community materials and onboarding guides

### Migration Notes

- The naming change is **documentation-only** at this stage
- No breaking changes to existing code or smart contracts
- Contributors should be aware of the new terminology when contributing

---

**Contributors:** Please use NST and NSD exclusively in all future work. If you encounter legacy NSM/NSC references, feel free to update them as part of your contributions.
