# AI Integration Guide for Dynamic Financial Insights

## Current Implementation

The `DynamicFinancialInsights` component currently uses a local analysis engine (`generateFinancialInsights.js`) that performs intelligent analysis based on financial metrics.

## Integrating with AI APIs

To use OpenAI, Anthropic, or another AI service, update `src/lib/generateFinancialInsights.js`:

### Example: OpenAI Integration

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateFinancialInsights(financialData) {
  const prompt = `Analyze this financial model and provide:
1. Risk assessment (high/moderate/low)
2. Top 3 recommendations with priorities
3. Key risks to monitor
4. Growth opportunities

Financial Data:
- Baseline Revenue: $${financialData.baseline.revenue.toLocaleString()}
- CMGR Target: ${financialData.targets.cmgr}%
- Starting Cash: $${financialData.targets.startingCash.toLocaleString()}
- Breakeven: ${financialData.milestones.breakevenMonth || 'TBD'}
- 12-Month Projections: ${JSON.stringify(financialData.projections, null, 2)}

Provide structured JSON response.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a financial analyst expert at analyzing SaaS startup financial models.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content);
}
```

### Example: Anthropic Integration

```javascript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateFinancialInsights(financialData) {
  const message = await anthropic.messages.create({
    model: 'claude-3-opus-20240229',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Analyze this financial model... [same prompt as above]`
    }]
  });

  return JSON.parse(message.content[0].text);
}
```

## Environment Variables

Add to `.env`:
```
OPENAI_API_KEY=sk-...
# OR
ANTHROPIC_API_KEY=sk-ant-...
```

## Fallback Behavior

The component includes a fallback mechanism that uses local analysis if the AI call fails, ensuring the insights always display.

