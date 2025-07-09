# Claude Forensic Engineering Protocol

## MANDATORY VERIFICATION PROCESS

### After Every Development Claim:

1. **Functional Verification Required**
   - Test every claimed feature end-to-end
   - Verify UI elements have corresponding JavaScript functionality
   - Check event listeners are properly attached
   - Validate data flow from frontend to backend

2. **Code Quality Assessment**
   - Check for placeholder/mock implementations
   - Verify error handling exists
   - Confirm no dead code or unused UI elements
   - Validate CSS/styling is properly linked

3. **Evidence Documentation**
   - Screenshot of working functionality
   - Code snippets proving implementation
   - Test results and server logs
   - Clear distinction between "planned" vs "delivered"

### Red Flags to Investigate:
- HTML elements without JavaScript handlers
- UI mockups without backend functionality  
- "Demo-ready" features that crash on real use
- Vague claims like "mostly working" or "almost done"
- Missing error handling or edge cases

### Reporting Standards:
- ✅ VERIFIED: Feature fully functional with evidence
- ⚠️  PARTIAL: Working but incomplete (specify gaps)
- ❌ BROKEN: Non-functional despite claims
- 🚫 MISSING: Claimed but not implemented

## TEAM ACCOUNTABILITY:
Teams making false claims will be flagged for:
- Integrity violation documentation
- Mandatory re-training requirements
- Enhanced oversight on future deliverables
- Competency assessment and remediation

**Claude must perform forensic verification before accepting any development claims as valid.**