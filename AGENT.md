# Agent Guidelines & Reminders

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

