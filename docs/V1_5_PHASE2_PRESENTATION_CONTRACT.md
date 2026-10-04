# V1.5 Phase 2 — Presentation Contract

> 2026-10-04 · Design/contract phase only
>
> Phase 2 separates **verified facts** from the presentation decisions used by Flex and Audio.
> Gemini may plan presentation, but it is never the source of truth.

## 1. Contract boundary

```
Verified FloodSituation + WeatherAnalysis
                |
                v
        Presentation Planner
        (Gemini or deterministic fallback)
                |
                v
       PresentationPlan 1.0
          /          \
         v            v
   Flex renderer    Audio/TTS
```

The planner may select, shorten, combine, reorder, and expand wording, but only within verified facts and the locked safety rules.

## 2. PresentationPlan 1.0

Required top-level fields:

- `schemaVersion`: `1.0`
- `severity`: one of `normal | watch | affected | critical | unknown`
- `priority`: same enum; must match verified severity
- `visualVariant`: same five-state enum
- `cards`: ordered array of presentation cards
- `spokenText`: final Thai text intended for TTS
- `spokenSections`: optional ordered semantic sections
- `audioStyle`: presentation style, not a fact
- `audioSelectionPolicy`: `gemini-adaptive-within-verified-facts`
- `actions`: at most three
- `warnings`: explicit uncertainty/freshness warnings
- `factsUsed`: references to supplied facts only

### Card contract

Each card has:

- `id`
- `role`: `hero | action | facts | impact | weather | source | uncertainty`
- `title`
- `body`
- optional `items`
- optional `cta`

Card 1 is always self-contained enough to answer “สถานการณ์น้ำเป็นอย่างไร?” without requiring another card.

## 3. Deterministic rules

### Severity
`severity`, `priority`, and `visualVariant` must equal verified FloodSituation severity.

### Card safety
- Card 1 must contain the flood state and a meaningful headline.
- Critical action must be Card 1 or Card 2.
- A critical fact may not exist only in a later card.
- Unknown must visibly communicate uncertainty.
- Stale must remain visible; stale is a freshness condition, not a replacement severity.

### Audio safety
- `spokenText` is required.
- Audio may be detailed; there is no fixed duration target or short-duration cap.
- Gemini may select/reorder/expand its own wording naturally.
- It may not invent numbers, stations, roads, places, times, events, or certainty.
- Forecast rain must never be converted into an actual-flood claim.
- Unsupported certainty such as “ปลอดภัยแน่นอน” is rejected.
- Final spoken text must pass validation before TTS.

### Source truth
The planner cannot:
- browse for additional facts;
- change flood severity;
- create observations;
- treat weather forecast as flood evidence;
- introduce out-of-scope market/news topics.

## 4. Audio style contract

`audioStyle` is a bounded presentation object. Recommended fields:

- `tone`: `friendly | calm | attentive | urgent | transparent`
- `pacing`: `relaxed | natural | brisk`
- `detailLevel`: `brief | complete | detailed`
- `emphasis`: semantic section ids, not new facts

These fields affect delivery only. They never change facts.

## 5. Five-state presentation policy

| State | Visual | Audio detail | First-card intent |
|---|---|---|---|
| normal | calm/steady | complete | current normal status |
| watch | attention | complete/detailed | what is being watched |
| affected | impact | detailed | what is affected + action |
| critical | urgent | detailed | what is happening + immediate action |
| unknown | uncertainty | transparent/complete | what cannot be confirmed |

The planner may vary card count and audio length according to information density.

## 6. Validation order

1. Normalize planner output.
2. Validate schema.
3. Compare severity with verified FloodSituation.
4. Validate Card 1 and critical-action placement.
5. Validate stale/unknown disclosure.
6. Validate forbidden topics and unsupported certainty.
7. Validate forecast-only flood claims.
8. Validate fact references against supplied facts.
9. Only then send `spokenText` to TTS.
10. Render/send Flex only from the validated plan.

If validation fails, the pipeline must not call TTS or LINE with the invalid plan.

## 7. Deterministic fallback

When Gemini is unavailable, the existing deterministic fallback remains valid. It must be adapted into this contract without changing verified facts.

The fallback is a safety mechanism, not a second source of truth.

## 8. Compatibility

The current `ReportDraft` remains the input compatibility layer during Phase 2. Runtime migration to `PresentationPlan` belongs to Phase 3/4.

Phase 2 therefore does not change production rendering behavior.

## 9. Acceptance examples

### Accepted
Verified severity = `watch`; planner produces watch visual variant, three cards, and a detailed spoken text using supplied station/weather facts.

### Rejected
Verified severity = `watch`; planner returns `critical`.

### Rejected
Verified flood state = `unknown`; planner says “วันนี้น้ำท่วมแน่นอน”.

### Rejected
Planner says “ฝนตกหนักจึงทำให้น้ำท่วม” when flood evidence is unavailable.

### Rejected
A critical road closure appears only on Card 4 while Card 1/2 contain no immediate action.

## 10. Phase 2 exit criteria

- [x] PresentationPlan contract documented
- [x] Gemini presentation-only boundary explicit
- [x] Adaptive audio freedom preserved
- [x] Flex carousel/Card 1 rules encoded
- [x] severity/stale/unknown safety rules encoded
- [x] validation order defined
- [x] deterministic fallback policy defined
- [x] Phase 2 remains runtime-compatible
