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

## Testing Checklist

Before deploying changes:
- [ ] Test with small data set (10 rows)
- [ ] Test with medium data set (1000 rows)
- [ ] Verify Refresh log entries
- [ ] Check sidebar still loads
- [ ] Confirm no console errors in browser
- [ ] Test on one fleet file before push:all
