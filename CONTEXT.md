# InTouch Project Architecture Context

## Data Flow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     NIGHTLY PIPELINE                            │
│  runMasterPipeline() @ 1am                                      │
│     │                                                           │
│     ├─► updateSTATCORE()     → Pulls from external sheet        │
│     │      │                                                    │
│     │      └─► runSYSCOREUpdates() → Adds SYSCORE columns       │
│     │             │                                             │
│     │             └─► runDAGCOREUpdates() → Populates DISTRO    │
│     │                                                           │
│     └─► updateAccountNotes() → Generates sticky notes           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Sheet Architecture

| Sheet | Purpose | Key Columns |
|-------|---------|-------------|
| `STATCORE` | Master account data | A=RID, E=Name, F=Parent, G=Metro, N=AM |
| `DISTRO` | Distribution metrics | A=RID, Revenue, CVR data |
| `SETUP` | Configuration | B3:B16=AM names, H3=Slides ID, H5=Sheets ID |
| `NOTE_CONFIG` | Note rules | A=Expression, B=Format, C=Template, D=Break |
| `Refresh` | Pipeline logs | Process, Timestamp, Count, Duration, Status |
| `Focus20` | Priority accounts | Tagged from Smart Select |
| `[AM Name]` | Per-AM views | Filtered copies of STATCORE |

## External Data Sources

| ID | Name | Purpose |
|----|------|---------|
| `1bh4XfKM8l5Mo...` | Statcore Source | Raw account data |
| `1V4C9mIL4ISP4...` | SYSCORE | System status data |
| `1Rp42PivUzqnm...` | DAGCORE | Distribution analytics |
| `1FhLSSmCb4bEa...` | Benchmarks | Metro/neighborhood benchmarks |

## Sidebar Communication Pattern

```
┌──────────────────┐          ┌──────────────────┐
│   BI_Sidebar     │          │  AiOpsFunctions  │
│   (Browser)      │          │  (Server)        │
├──────────────────┤          ├──────────────────┤
│ onload:          │          │                  │
│  getSidebarData()├─────────►│ getSidebarData() │
│                  │◄─────────┤  returns {ams,   │
│                  │          │   accounts}      │
│                  │          │                  │
│ AM picker change:│          │                  │
│  generateAM      ├─────────►│ generateAM       │
│   Summary(name)  │◄─────────┤  Summary(name)   │
│                  │          │  returns stats   │
│                  │          │                  │
│ AI Brief click:  │          │                  │
│  buildPromptFor  ├─────────►│ buildPromptFor   │
│   RID(rid)       │◄─────────┤  RID(rid)        │
│                  │          │  returns text    │
└──────────────────┘          └──────────────────┘
```

## Key Configuration Cells

| Cell | Value | Used By |
|------|-------|---------|
| `SETUP!B3:B16` | AM Names | updateSTATCORE filter |
| `SETUP!C3:C23` | Sheet names to update | updateAccountNotes |
| `SETUP!H3` | Slides Template ID | BizInsights |
| `SETUP!H5` | Sheets Template ID | BizInsights |
| `NOTE_CONFIG!F2` | Test RID | previewSingleNote |

## Function Call Graph

```
onOpen()
  └─► Creates menus
  
onEdit(e)
  └─► handleIntouchEdits(e)
        ├─► Timestamp updates (col B edits)
        ├─► Default sets logic (F1 = "Default")
        └─► Smart Select → moveTrueAccountsToFocus20()

runMasterPipeline()
  ├─► updateSTATCORE()
  │     ├─► runSYSCOREUpdates()
  │     │     └─► runDAGCOREUpdates()
  │     └─► ensureSTATCORE_Formulas()
  └─► updateAccountNotes()
        └─► processDynamicSheet() (per AM tab)
              └─► buildDynamicNote() (per row)

createBizInsightsDeck()
  ├─► Copy sheet template
  ├─► _populateBenchmarks_()
  ├─► Copy slides template
  └─► _replaceChartsInSlides_V2_Batch_()

askInTouchGuide(query, history, shouldLog, prefetchedData)
  ├─► classifyQueryComplexity()
  │     └─► Returns "flash" | "pro"
  ├─► Check scripted responses (fast-path)
  ├─► Check response cache
  ├─► Inject account/ranking data if needed
  └─► Call Gemini API with context caching
        ├─► Flash: Simple queries
        └─► Pro: Complex analysis (with context cache)

getFreeGoogleCohortData(amName)
  ├─► Read "Free Google" sheet
  ├─► Filter by AM
  ├─► Group by cohort (PI Reinvestment, etc.)
  └─► Sort by priority + Google RPR

executeFreeGoogleStrategy(rid, strategyType)
  ├─► "quick" → generateQuickFreeGoogleStrategy()
  ├─► "full" → askInTouchGuide() with strategy prompt
  └─► "glean" → generateFreeGoogleGleanPrompt()
              └─► Opens Glean with pre-filled search
```

## Free Google Cohort Configuration

```javascript
const FREE_GOOGLE_COHORT_CONFIG = {
  "PI Reinvestment":       { priority: 1, play: "PI Booster" },
  "Unsecured Contracts":   { priority: 2, play: "Save At-Risk" },
  "Low Hanging Fruit":     { priority: 3, play: "Discount Swap" },
  "Partial Sub Reinvestment": { priority: 4, play: "Hybrid" },
  "Other":                 { priority: 5, play: "Standard Evaluation" }
};
```

## Feedback System Data Flow

```
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│   Bucket IQ      │          │  InTouchGuide    │          │  Central Master  │
│   (Browser)      │          │  (Server)        │          │  Spreadsheet     │
├──────────────────┤          ├──────────────────┤          ├──────────────────┤
│ User rates       │          │                  │          │                  │
│ response:        │          │                  │          │                  │
│  thumbs up/down  ├─────────►│ logKnowledge    │─────────►│ Feedback sheet   │
│  correction text │          │  HubFeedback()   │          │ (central log)    │
│                  │          │                  │          │                  │
│ Admin export:    │          │                  │          │                  │
│  export button   ├─────────►│ exportFeedback  │◄─────────┤ Read all rows    │
│                  │◄─────────┤  ForAI()        │          │                  │
│  Downloads JSON  │          │                  │          │                  │
└──────────────────┘          └──────────────────┘          └──────────────────┘
```

## Query Classification Logic

```
┌─────────────────────────────────────────────────────────────────┐
│                  classifyQueryComplexity(query, hasData)        │
│                                                                 │
│  FLASH (Simple) triggers:                                       │
│   - "what is", "define", "meaning of"                          │
│   - "how do I", "how to"                                       │
│   - "show", "list", "find" (without analysis)                  │
│   - Short queries without account data                          │
│                                                                 │
│  PRO (Complex) triggers:                                        │
│   - "analyze", "compare", "summarize my"                       │
│   - "strategy", "recommend", "should I"                        │
│   - Portfolio-level questions with hasData=true                 │
│   - Multi-step reasoning requests                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Error Handling Conventions

```javascript
// Standard try-catch with logging
function pipelineStep() {
  const functionName = 'pipelineStep';
  try {
    // ... work ...
  } catch (error) {
    Logger.log(`[${functionName}] Error: ${error.message}`);
    // Log to Refresh sheet
    logToRefresh(functionName, 0, "Fail", error.message);
    throw error; // Re-throw to stop pipeline
  }
}
```

## Performance Thresholds

| Operation | Safe Limit | Mitigation |
|-----------|------------|------------|
| Single setValues() | ~5000 rows | Use batch pattern |
| API calls/min | 100 | Add Utilities.sleep(100) |
| Execution time | 6 min (trigger) | Break into chained calls |
| Cache duration | 6 hours | CACHE_DURATION constant |

## New Server Functions (Feb 2026)

### Free Google Functions (AiOpsFunctions.js)

| Function | Purpose | Returns |
|----------|---------|---------|
| `getFreeGoogleCohortData(amName)` | Load cohort-grouped accounts for sidebar | `{cohorts: {...}, meta: {...}}` |
| `getFreeGoogleAccountData(rid)` | Get detailed account for strategy | Account object |
| `generateFreeGoogleGleanPrompt(rid)` | Create Glean research prompt | Prompt string |

### AI Chat Functions (InTouchGuide.js)

| Function | Purpose | Returns |
|----------|---------|---------|
| `askInTouchGuide(query, history, log, data)` | Main chat orchestration | Response string |
| `classifyQueryComplexity(query, hasData)` | Route to Flash/Pro | "flash" or "pro" |

### Feedback Functions (InTouchGuide.js)

| Function | Purpose | Returns |
|----------|---------|---------|
| `logKnowledgeHubFeedback(feedback)` | Log rating to central master | Success boolean |
| `getKHFeedbackForReview()` | Get items needing review | Array of feedback |
| `exportFeedbackForAI()` | Export for Cursor training | JSON string |
| `generateFeedbackMarkdown_()` | Markdown with Cursor instructions | Markdown string |

## Testing Checklist

Before deploying changes:
- [ ] Test with small data set (10 rows)
- [ ] Test with medium data set (1000 rows)
- [ ] Verify Refresh log entries
- [ ] Check sidebar still loads
- [ ] Confirm no console errors in browser
- [ ] Test on one fleet file before push:all
- [ ] Test Free Google cohort loading
- [ ] Test feedback logging to central master
