# Fix: Budget notifications only warn once per event, also notify officer

## Current Behavior

`checkBudgetThreshold` in `src/lib/actions.ts:478` only notifies the **adviser** (`event.adviser_id`) when budget thresholds (80%, 90%, 100%) are hit. The **officer** who manages the event receives no warnings.

The deduplication check at line 513-515 prevents the same threshold from re-firing for the same user.

## Desired Behavior

1. Each threshold (80%, 90%, 100%) still fires **only once** per event (current behavior — correct)
2. **Both the adviser AND the officer** receive budget threshold notifications

## Changes

### File: `src/lib/actions.ts` — `checkBudgetThreshold` function (line 478)

1. **Add `officer_id`** to the event select query (line 483)
2. **Build a list of recipients** `[event.adviser_id, event.officer_id]`, filtering out any null/undefined
3. **For each recipient**, check deduplication and insert notification separately (per-user deduplication)

**Diff:**
```typescript
// Before (lines 481-534):
  const { data: event } = await supabase
    .from('events')
    .select('id, name, budget, adviser_id, department_id')
    .eq('id', eventId)
    .single();

  if (!event || !event.adviser_id || event.budget <= 0) return;

  // ... receipts/forms calculation ...

  for (const threshold of thresholds) {
    if (ratio >= threshold.at) {
      const notifType = `${threshold.type}_${eventId}`;
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', event.adviser_id)
        .eq('type', notifType)
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabase.from('notifications').insert({
          user_id: event.adviser_id,
          title: threshold.title,
          message: threshold.message,
          type: notifType,
          event_id: eventId,
        });
        await createAuditLog(event.department_id, threshold.title, {
          event_id: eventId,
          event_name: event.name,
          budget: event.budget,
          total_expenses: totalExpenses,
          ratio: Math.round(ratio * 100) + '%',
        });
      }
    }
  }

// After:
  const { data: event } = await supabase
    .from('events')
    .select('id, name, budget, adviser_id, officer_id, department_id')
    .eq('id', eventId)
    .single();

  if (!event || !event.adviser_id || event.budget <= 0) return;

  // ... receipts/forms calculation ... (unchanged)

  const recipients = [event.adviser_id, event.officer_id].filter(Boolean);

  for (const threshold of thresholds) {
    if (ratio >= threshold.at) {
      const notifType = `${threshold.type}_${eventId}`;

      for (const userId of recipients) {
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('type', notifType)
          .limit(1);

        if (!existing || existing.length === 0) {
          await supabase.from('notifications').insert({
            user_id: userId,
            title: threshold.title,
            message: threshold.message,
            type: notifType,
            event_id: eventId,
          });
        }
      }

      await createAuditLog(event.department_id, threshold.title, {
        event_id: eventId,
        event_name: event.name,
        budget: event.budget,
        total_expenses: totalExpenses,
        ratio: Math.round(ratio * 100) + '%',
      });
    }
  }
```

## Verification

- Approve a receipt that pushes budget past 80% → both adviser and officer should see the "80% Used" notification
- Approve more receipts past 90% → both should see the "90% Used" notification
- Each notification type should only appear once per user, per event
