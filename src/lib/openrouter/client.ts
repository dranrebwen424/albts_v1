const BASE_PROMPT = `Extract the following information from this receipt image and return ONLY valid JSON (no markdown, no code fences). Use this exact structure:
{
  "vendor": "store name",
  "si_or_number": "receipt number",
  "date": "MM/DD/YYYY",
  "time": "HH:MM",
  "items": [{"name": "item name", "qty": 1, "unit_price": 0, "total": 0}],
  "subtotal": 0,
  "discount": 0,
  "total": 0,
  "category": "string",
  "category_reasoning": "string",
  "confidence": 0-100
}

Rules:
- If unit price is not listed, calculate it from the total
- subtotal is the sum of all line item totals BEFORE any discount
- If the receipt shows a discount, extract the discount amount into the "discount" field (0 if no discount)
- total must be the FINAL AMOUNT DUE after subtracting any discount
- Determine the category by analyzing ALL line items on the receipt. Be specific — do NOT limit yourself to a fixed list. For example: "Hardware", "Office Supplies", "Groceries", "Construction Materials", "Transportation", "Electrical Supplies", "Food", "Tools", "Medical Supplies", "School Supplies", "Labor", "Services", etc.
- category_reasoning should be a brief 1-sentence explanation of why you chose that category based on the items (e.g., "Items include nails, hammer, and plywood — construction materials")
- confidence reflects how sure you are of the extraction (0-100)
- Include ALL line items
- Return ONLY the JSON object, no other text`;

async function callOpenRouter(
  imageBase64: string,
  mimeType: string,
  extraInstructions?: string
) {
  const text = extraInstructions
    ? `${BASE_PROMPT}\n\n${extraInstructions}`
    : BASE_PROMPT;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content returned from OpenRouter');
  }

  const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned);
}

export async function parseReceipt(imageBase64: string, mimeType: string) {
  // Step 1 — Primary attempt
  let result = await callOpenRouter(imageBase64, mimeType);

  // Step 2 — Retry with focus instructions if confidence is low
  if (result.confidence < 60) {
    const retry = await callOpenRouter(
      imageBase64,
      mimeType,
      'The previous attempt had low confidence. Focus carefully on every character on the receipt. ' +
      'If text is blurry, smudged, or hard to read, do your best to extract it accurately. ' +
      'Set confidence to reflect how much of the text you are certain about.'
    ).catch(() => null);

    if (retry && retry.confidence > result.confidence) {
      result = retry;
    }
  }

  return result;
}
