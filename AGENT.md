# Agent Guidelines & Reminders

## Documentation Standards

### Code Documentation Philosophy

**Write documentation like a professional developer leaving clear notes for the team.**

#### Core Principles

1. **Professional Tone**: Document objectively, factually, and clearly
2. **Developer-First**: Write for engineers who will maintain this code
3. **Long-Term Thinking**: Assume this code will be in production for years
4. **No Patronizing Language**: Never use phrases like "you're all set!", "congratulations!", or treat the reader like they need hand-holding
5. **Developer Humor is OK**: Dry wit and technical humor are fine, but stay professional

#### What to Include

- **Purpose**: Why this code exists
- **Architecture**: How components fit together
- **Usage**: Clear examples of how to use the code
- **Gotchas**: Edge cases, performance considerations, security notes
- **Dependencies**: What this code relies on
- **Testing**: How to test the functionality

#### What to Avoid

- ❌ Congratulatory language ("You did it!", "Success!")
- ❌ Marketing speak ("Amazing feature!", "Revolutionary!")
- ❌ Patronizing tone ("Don't worry", "It's easy!")
- ❌ Excessive emojis (one or two for visual hierarchy is fine)
- ❌ Acting like you did the reader a favor
- ❌ Documenting the obvious

#### Good Examples

```markdown
# Version Control System

## Overview

Provides snapshot-based version control for financial reports using PostgreSQL 
and Supabase Storage. Snapshots include complete report state, metadata, and 
optional screenshots.

## Architecture

- `snapshot_service.py`: CRUD operations, validates user access
- `snapshots.py`: REST API endpoints with Pydantic validation
- PostgreSQL table with Row Level Security for user isolation
```

#### Bad Examples

```markdown
# 🎉 Version Control System - You're Going to Love This!

## What You Get

You now have an AMAZING version control system that will blow your mind! 
We've built something truly special here. Let me tell you all about it...

Congratulations on getting this far! You're all set! 🎊
```

#### README Structure

For implementation documentation:

1. **What This Is**: Brief, factual description
2. **Architecture**: Components and how they interact
3. **Setup**: Required steps to deploy
4. **Usage**: Code examples
5. **API Reference**: Endpoints, parameters, responses
6. **Security**: Authentication, authorization, data protection
7. **Testing**: How to verify functionality
8. **Troubleshooting**: Common issues and solutions

#### Comments in Code

```python
# Good: Explains why, not what
def calculate_mrr(subscriptions):
    # Filter out subscriptions in grace period - they're still counted as active
    # but shouldn't contribute to MRR until grace period ends
    active_subs = [s for s in subscriptions if not s.get('in_grace_period')]
    
    return sum(s['amount'] for s in active_subs)
```

```python
# Bad: States the obvious or over-explains
def calculate_mrr(subscriptions):
    # This function calculates MRR! It's super important!
    # First, we create an empty list to store our subscriptions
    active_subs = []
    # Then we loop through each subscription (isn't that cool?)
    for s in subscriptions:
        # We check if it's active (wow!)
        if s.get('status') == 'active':
            # And add it to our list! Amazing!
            active_subs.append(s)
```

## Stripe MCP Pagination Limits

### ⚠️ CRITICAL: Stripe MCP Pagination

**ALWAYS REMEMBER:** Stripe MCP calls have a default `limit: 100` parameter. This means:

1. **You may not get all data** - If there are more than 100 subscriptions, customers, prices, etc., you will only see the first 100
2. **MRR calculations may be incomplete** - Missing subscriptions = incorrect MRR totals
3. **Always check for pagination** - Look for `has_more` flags or total counts in responses
4. **Use multiple calls if needed** - If you need all data, make multiple calls with different offsets or use pagination parameters

### When Fetching Stripe Data:

- ✅ **DO**: Check the total count vs. returned count
- ✅ **DO**: Use pagination if available (offset, starting_after, etc.)
- ✅ **DO**: Verify MRR calculations match expected totals
- ✅ **DO**: Consider using backend API endpoints that handle pagination automatically
- ❌ **DON'T**: Assume `limit: 100` returns all data
- ❌ **DON'T**: Calculate MRR from partial subscription lists
- ❌ **DON'T**: Trust totals without verifying completeness

### Example Pattern:

```javascript
// BAD - May miss data
const subscriptions = await mcp_stripe_list_subscriptions({ limit: 100 });

// BETTER - Check if more data exists
const subscriptions = await mcp_stripe_list_subscriptions({ limit: 100 });
if (subscriptions.length === 100) {
  // Likely more data exists - need pagination
}

// BEST - Use backend API that handles pagination
const response = await fetch('/api/v1/stripe/churn-and-arpu');
// Backend handles all pagination internally
```

### For MRR Calculations:

- Always verify the subscription count matches expected totals
- If calculating manually, ensure you have ALL active subscriptions
- Prefer using backend-calculated MRR values over manual calculations
- When in doubt, use the backend API endpoints that aggregate all data

