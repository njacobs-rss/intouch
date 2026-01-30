# InTouch System Architecture

A comprehensive visual guide to the InTouch system architecture, data flows, and user experience.

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Data Pipeline Engine](#data-pipeline-engine)
3. [Local Spreadsheet Structure](#local-spreadsheet-structure)
4. [User Interface Layer](#user-interface-layer)
5. [AM Tab UX](#am-tab-ux)
6. [Client-Server Communication](#client-server-communication)
7. [Event Handlers](#event-handlers)
8. [File Responsibilities](#file-responsibilities)
9. [Presentation Generation Flow](#presentation-generation-flow)
10. [Sidebar Tabs Detail](#sidebar-tabs-detail)
11. [Central Logging Architecture](#central-logging-architecture)
12. [System Summary](#system-summary)

---

## System Architecture Overview

```
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                          ║
║                              INTOUCH SYSTEM ARCHITECTURE                                 ║
║                                                                                          ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  EXTERNAL DATA SOURCES                                                                   │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌───────────┐ │
│   │  STATCORE   │   │   SYSCORE   │   │   DAGCORE   │   │  BENCHMARKS │   │  CENTRAL  │ │
│   │   Source    │   │   (SFDC)    │   │   (DISTRO)  │   │  (External) │   │    LOG    │ │
│   │ ─────────── │   │ ─────────── │   │ ─────────── │   │ ─────────── │   │ ───────── │ │
│   │ StatcoreNA  │   │  SEND Tab   │   │  SEND Tab   │   │ metro/nbhd  │   │ Fleet-wide│ │
│   │  A-AG cols  │   │ A-P (16col) │   │ A-BB (54col)│   │   macro     │   │ monitoring│ │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └─────┬─────┘ │
│          │                 │                 │                 │                 │       │
└──────────┼─────────────────┼─────────────────┼─────────────────┼─────────────────┼───────┘
           │                 │                 │                 │                 │
           ▼                 ▼                 ▼                 ▼                 ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  DATA PIPELINE ENGINE  (runMasterPipeline @ 1am nightly)                                 │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   STEP 1                    STEP 2                    STEP 3                    STEP 4   │
│  ┌────────────────┐        ┌────────────────┐        ┌────────────────┐        ┌───────┐│
│  │ updateSTATCORE │───────▶│runSYSCOREUpdate│───────▶│runDAGCOREUpdate│───────▶│ Notes ││
│  │ ────────────── │        │ ────────────── │        │ ──────────────  │        │Engine ││
│  │ Filter by AM   │        │ Build Hyperlink│        │ Match RIDs     │        │───────││
│  │ Write A-AG     │        │ Write AH-AT    │        │ Write DISTRO   │        │Dynamic││
│  │ 4000 row batch │        │ 3000 row batch │        │ 4000 row batch │        │Sticky ││
│  └────────────────┘        └────────────────┘        └────────────────┘        └───────┘│
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  LOCAL SPREADSHEET (InTouch File)                                                        │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│   │STATCORE │ │ DISTRO  │ │  SETUP  │ │NOTE_CONFIG│ │Launcher │ │ Refresh │ │ Focus20 │ │
│   │ Master  │ │ Metrics │ │ Config  │ │  Rules    │ │Template │ │  Logs   │ │Priority │ │
│   │ (A-AW)  │ │ (A-BB)  │ │(AM List)│ │(Formulas) │ │ (Copy)  │ │(Pattern6)│ │Accounts │ │
│   └────┬────┘ └────┬────┘ └────┬────┘ └─────┬─────┘ └────┬────┘ └─────────┘ └─────────┘ │
│        │           │           │            │            │                               │
│        └───────────┴───────────┴────────────┴────────────┘                               │
│                                    │                                                     │
│                                    ▼                                                     │
│   ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│   │                         AM PERSONAL TABS                                          │  │
│   │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────┐                      │  │
│   │  │  Erin  │ │  Mike  │ │  Sara  │ │ Kevin  │ │Manager Lens│  <── USER WORKS HERE │  │
│   │  │   AM   │ │   AM   │ │   AM   │ │   AM   │ │  (Special) │                      │  │
│   │  └────────┘ └────────┘ └────────┘ └────────┘ └────────────┘                      │  │
│   └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  USER INTERFACE LAYER                                                                    │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   SPREADSHEET MENUS                          AI SIDEBAR (BI_Sidebar.html)                │
│  ┌────────────────────────┐                 ┌────────────────────────────────────────┐   │
│  │  InTouch ai            │                 │  ┌─────────┬─────────┬────────┬──────┐ │   │
│  │  ├─ Open AI Panel ─────┼────────────────▶│  │MEETING  │ PRICING │ BUCKET │CHAT  │ │   │
│  │  └─ Export Summaries   │                 │  │  PREP   │   SIM   │SUMMARY │  AI  │ │   │
│  ├────────────────────────┤                 │  └────┬────┴────┬────┴───┬────┴──┬───┘ │   │
│  │  Admin Functions       │                 │       │         │        │       │     │   │
│  │  ├─ Fleet Commander    │                 │       ▼         ▼        ▼       ▼     │   │
│  │  ├─ AM Tabs            │                 │  ┌─────────────────────────────────┐   │   │
│  │  │   ├─ Create All     │                 │  │ - Account Search & Selection    │   │   │
│  │  │   ├─ Delete All     │                 │  │ - AI Brief Generator            │   │   │
│  │  │   └─ Create Single  │                 │  │ - Presentation Creator          │   │   │
│  │  ├─ Focus20            │                 │  │ - Pricing Simulation Engine     │   │   │
│  │  │   ├─ Add RIDs       │                 │  │ - Portfolio Dashboard           │   │   │
│  │  │   └─ Remove RIDs    │                 │  │ - Gemini AI Chat Interface      │   │   │
│  │  ├─ Update Notes Only  │                 │  └─────────────────────────────────┘   │   │
│  │  ├─ Force Pipeline     │                 │                                        │   │
│  │  └─ Reset Trigger      │                 └────────────────────────────────────────┘   │
│  └────────────────────────┘                                                              │
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Pipeline Engine

The nightly data pipeline runs at 1am and consists of 4 sequential steps:

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                     NIGHTLY PIPELINE                                                     │
│  runMasterPipeline() @ 1am                                                               │
│     │                                                                                    │
│     ├─► updateSTATCORE()     → Pulls from external sheet, filters by AM                 │
│     │      │                                                                             │
│     │      └─► runSYSCOREUpdates() → Adds SYSCORE columns (Salesforce hyperlinks)       │
│     │             │                                                                      │
│     │             └─► runDAGCOREUpdates() → Populates DISTRO sheet                      │
│     │                                                                                    │
│     └─► updateAccountNotes() → Generates sticky notes from NOTE_CONFIG rules            │
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### Step Details

| Step | Function | Source | Target | Batch Size |
|------|----------|--------|--------|------------|
| 1 | `updateSTATCORE()` | External StatcoreNA (A-AG) | Local STATCORE | 4000 rows |
| 2 | `runSYSCOREUpdates()` | External SYSCORE/SEND (A-P) | STATCORE AH-AT | 3000 rows |
| 3 | `runDAGCOREUpdates()` | External DAGCORE/SEND (A-BB) | Local DISTRO | 4000 rows |
| 4 | `updateAccountNotes()` | NOTE_CONFIG rules | AM Tab sticky notes | Per sheet |

---

## Local Spreadsheet Structure

### Core Sheets

| Sheet | Purpose | Key Columns |
|-------|---------|-------------|
| `STATCORE` | Master account data | A=RID, E=Name, F=Parent, G=Metro, N=AM |
| `DISTRO` | Distribution metrics | A=RID, Revenue, CVR data |
| `SETUP` | Configuration | B3:B16=AM names, H3=Slides ID, H5=Sheets ID |
| `NOTE_CONFIG` | Note rules | A=Expression, B=Format, C=Template, D=Break |
| `Refresh` | Pipeline logs | Process, Timestamp, Count, Duration, Status |
| `Focus20` | Priority accounts | Tagged from Smart Select |
| `Launcher` | AM tab template | Copied to create new AM tabs |
| `[AM Name]` | Per-AM views | Filtered copies of STATCORE |

### Protected Sheets (Never Auto-Deleted)

```javascript
PROTECTED_SHEET_NAMES = [
  'Setup', 'STATCORE', 'SYSCORE', 'DAGCORE', 'DISTRO', 
  'Launcher', 'Sets', 'Refresh', 'Config', 'Benchmarks'
];
```

---

## User Interface Layer

### Menu Structure

```
InTouch ai
├── Open Intouch AI Panel    → BI_openSidebar()
└── Export AM Summaries      → Export portfolio data

Admin Functions
├── Open Fleet Commander     → openAdminPanel()
├── AM Tabs
│   ├── Create All From Setup    → createEmployeeTabs()
│   ├── Delete All From Setup    → deleteEmployeeTabs()
│   └── Create Single Tab        → createSingleEmployeeTab()
├── Focus20
│   ├── Add RIDs from Smart Select      → moveTrueAccountsToFocus20()
│   └── Remove RIDs from Smart Select   → removeTrueAccountsFromFocus20Optimized()
├── Global Functions
│   └── Test Gemini API (Fleet)         → testGeminiFleet()
├── Update Notes Only        → manualUpdateNotesOnly()
├── Force Master Pipeline    → runMasterPipeline()
├── Scan External Resources  → scanExternalResources()
└── Reset Nightly Trigger    → setupNightlyTrigger()
```

---

## AM Tab UX

### Sheet Tab Bar Layout

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  SHEET TAB BAR (Bottom of Spreadsheet)                                                   │
│  ┌───────┐┌───────┐┌───────┐┌───────┐┌─────────┐┌────────┐┌───────┐┌───────┐┌────────┐  │
│  │ Erin  ││ Mike  ││ Sara  ││Kevin  ││ Manager ││Focus20 ││STATCORE││DISTRO ││ SETUP  │  │
│  │  (AM) ││ (AM)  ││ (AM)  ││ (AM)  ││  Lens   ││        ││        ││       ││        │  │
│  └───────┘└───────┘└───────┘└───────┘└─────────┘└────────┘└───────┘└───────┘└────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### AM Personal Tab Layout

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  AM PERSONAL TAB LAYOUT (e.g. "Erin" tab)                                                │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  Row 1:  [ Title / Branding Row ]                                                        │
│  ─────────────────────────────────────────────────────────────────────────────────────   │
│  Row 2:  HEADERS with FILTERS                                                            │
│  ┌─────────┬───────────┬────────┬────────┬────────────┬──────────┬────────┬──────────┐  │
│  │ Hidden  │  Smart    │ Notes  │  RID   │  Account   │  Parent  │ Status │  Metro   │  │
│  │   (A)   │  Select   │  (C)   │  (D)   │   Name     │ Account  │  (G)   │   (H)    │  │
│  │         │  [ ] (B)  │        │        │    (E)     │   (F)    │        │          │  │
│  └─────────┴───────────┴────────┴────────┴────────────┴──────────┴────────┴──────────┘  │
│  ─────────────────────────────────────────────────────────────────────────────────────   │
│  Row 3+:  DATA ROWS                                                                      │
│  ┌─────────┬───────────┬────────┬────────┬────────────┬──────────┬────────┬──────────┐  │
│  │         │    [ ]    │   *    │ 12345  │ Joes Diner │ Joe Corp │ Active │ LA       │  │
│  │         │    [x]    │   *    │ 67890  │ Janes Cafe │ Jane LLC │ Active │ NYC      │  │
│  │         │    [ ]    │   *    │ 11223  │ Bobs BBQ   │ Bob Inc  │ Cancel │ Chicago  │  │
│  └─────────┴───────────┴────────┴────────┴────────────┴──────────┴────────┴──────────┘  │
│                                                                                          │
│  * = Hover for Sticky Note                                                               │
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### Sticky Note Example (Hover on Notes Column)

```
┌────────────────────────────────────┐
│  STICKY NOTE                       │
│  ┌──────────────────────────────┐  │
│  │  Account: Joes Diner         │  │
│  │  ─────────────────────────── │  │
│  │  Status: Active | Pro | AYCE │  │
│  │  Term End: 03/15/26 (45 days)│  │
│  │  Revenue: $1,234/mo          │  │
│  │  CVR: 450 | Discovery: 23%   │  │
│  │  PI Status: Active           │  │
│  │  ─────────────────────────── │  │
│  │  Last Engagement: 01/15/26   │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

### Smart Select Trigger Flow

```
Check Smart Select box
        │
        ▼
tagFocus20Status(true)
        │
        ├─► Find RID in source sheet
        ├─► Write date to STATCORE Focus20 column
        └─► Uncheck the box automatically
```

---

## Client-Server Communication

```
┌────────────────────────────────────┐         ┌────────────────────────────────────────────┐
│  CLIENT (BI_Sidebar.html)          │         │  SERVER (.gs files)                        │
│  Browser-side JavaScript           │         │  Google Apps Script Runtime                │
├────────────────────────────────────┤         ├────────────────────────────────────────────┤
│                                    │         │                                            │
│  ┌─────────────────────────────┐   │         │   ┌────────────────────────────────────┐   │
│  │ 1. Sidebar Loads            │   │ ──────▶ │   │ getSidebarData()                   │   │
│  │    (onload event)           │   │ ◀────── │   │ → CacheService lookup              │   │
│  │                             │   │         │   │ → Returns {ams, accounts}          │   │
│  └─────────────────────────────┘   │         │   └────────────────────────────────────┘   │
│                                    │         │                                            │
│  ┌─────────────────────────────┐   │         │   ┌────────────────────────────────────┐   │
│  │ 2. AM Picker Changed        │   │ ──────▶ │   │ generateAMSummary(amName)          │   │
│  │    (Bucket Summary tab)     │   │ ◀────── │   │ → Aggregates STATCORE/DISTRO       │   │
│  │                             │   │         │   │ → Returns portfolio stats          │   │
│  └─────────────────────────────┘   │         │   └────────────────────────────────────┘   │
│                                    │         │                                            │
│  ┌─────────────────────────────┐   │         │   ┌────────────────────────────────────┐   │
│  │ 3. "AI Brief" Clicked       │   │ ──────▶ │   │ buildPromptForRID(rid)             │   │
│  │    (Meeting Prep tab)       │   │ ◀────── │   │ → Extracts STATCORE + DISTRO cols  │   │
│  │                             │   │         │   │ → Returns formatted prompt text    │   │
│  └─────────────────────────────┘   │         │   └────────────────────────────────────┘   │
│                                    │         │                                            │
│  ┌─────────────────────────────┐   │         │   ┌────────────────────────────────────┐   │
│  │ 4. "Create Deck" Clicked    │   │ ──────▶ │   │ createBizInsightsDeck(config)      │   │
│  │    (Meeting Prep tab)       │   │ ◀────── │   │ → Clones Sheet & Slides templates  │   │
│  │                             │   │         │   │ → Populates benchmarks             │   │
│  │                             │   │         │   │ → Returns {sheetsUrl, slidesUrl}   │   │
│  └─────────────────────────────┘   │         │   └────────────────────────────────────┘   │
│                                    │         │                                            │
│  ┌─────────────────────────────┐   │         │   ┌────────────────────────────────────┐   │
│  │ 5. Chat Message Sent        │   │ ──────▶ │   │ processQuery(message)              │   │
│  │    (InTouch Chat tab)       │   │ ◀────── │   │ → ROUTING ENGINE:                  │   │
│  │                             │   │         │   │   ├▶ Scripted response?            │   │
│  │                             │   │         │   │   ├▶ Glossary match?               │   │
│  │                             │   │         │   │   ├▶ Cached response?              │   │
│  │                             │   │         │   │   └▶ Gemini API call               │   │
│  └─────────────────────────────┘   │         │   └────────────────────────────────────┘   │
│                                    │         │                                            │
└────────────────────────────────────┘         └────────────────────────────────────────────┘

                    ▲                                        │
                    │        google.script.run               │
                    │        .withSuccessHandler()           │
                    └────────.withFailureHandler()───────────┘
```

---

## Event Handlers

```
                        onEdit(e) ──▶ handleIntouchEdits(e)
                                              │
              ┌───────────────────────────────┼───────────────────────────────┐
              │                               │                               │
              ▼                               ▼                               ▼
┌─────────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐
│  COLUMN B EDIT          │   │  F1 = "Default"         │   │  SMART SELECT = TRUE    │
│  (Notes column)         │   │  (Load preset)          │   │  (Priority tagging)     │
├─────────────────────────┤   ├─────────────────────────┤   ├─────────────────────────┤
│                         │   │                         │   │                         │
│  IF row > 1:            │   │  Look up "Default" row  │   │  tagFocus20Status(true) │
│  → Auto-timestamp in    │   │  in Sets sheet          │   │  ├▶ Find RID in source  │
│    "Last Updated" col   │   │  → Copy H:AA values     │   │  ├▶ Write date to       │
│                         │   │    to current sheet     │   │  │  STATCORE Focus20    │
│                         │   │                         │   │  └▶ Uncheck the box     │
└─────────────────────────┘   └─────────────────────────┘   └─────────────────────────┘
```

---

## File Responsibilities

| File | Purpose | Key Functions |
|------|---------|---------------|
| `Main.js` | Entry point, menus, triggers, central logging | `onOpen()`, `onEdit()`, `BI_openSidebar()`, `logInteraction()`, `logRefreshToCentral()` |
| `Admin.js` | Pipeline orchestration, AM tab management, Focus20 | `runMasterPipeline()`, `handleIntouchEdits()`, `tagFocus20Status()`, `createEmployeeTabs()` |
| `STATCORE.js` | Data pipeline from external sources | `updateSTATCORE()`, `runSYSCOREUpdates()`, `runDAGCOREUpdates()`, `getTrueLastRow_()` |
| `DynamicNotes.js` | Rule-based sticky note generation engine | `updateAccountNotes()`, `buildDynamicNote()`, `processDynamicSheet()`, `evaluateMath()` |
| `AiOpsFunctions.js` | Sidebar data APIs, AI integration | `getSidebarData()`, `buildPromptForRID()`, `generateAMSummary()`, `processQuery()` |
| `BizInsights.js` | Presentation generation (Sheets + Slides) | `createBizInsightsDeck()`, `_populateBenchmarks_()` |
| `FleetCommander.js` | Multi-file deployment operations | `runUpdateSheetSafe()`, `runCopySheet()`, `runMassDeleteSheet()` |
| `BI_Sidebar.html` | Main user interface (browser-side) | Tab navigation, account search, chat interface, pricing simulator |
| `AdminSidebar.html` | Fleet management interface | Fleet operations, range replicator |

---

## Presentation Generation Flow

```
  createBizInsightsDeck(config)
  ─────────────────────────────
         │
         ▼
  ┌──────────────────────────────────────────────────────────────────────────────────────┐
  │  1. RESOLVE TEMPLATES                                                                │
  │     ├▶ Read SETUP!H3 (Slides Template ID)                                            │
  │     └▶ Read SETUP!H5 (Sheets Template ID)                                            │
  └──────────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
  ┌──────────────────────────────────────────────────────────────────────────────────────┐
  │  2. CREATE NEW WORKSHEET                                                             │
  │     ├▶ DriveApp.getFileById(sheetsTemplateId).makeCopy()                             │
  │     ├▶ Write RID, Metro, Macro, Neighborhood to "Start Here" tab                     │
  │     └▶ Remove protections from template                                              │
  └──────────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
  ┌──────────────────────────────────────────────────────────────────────────────────────┐
  │  3. POPULATE BENCHMARKS                                                              │
  │     ├▶ Connect to External Benchmark Sheet (1FhLSS...)                               │
  │     ├▶ Filter metro tab by Metro Name                                                │
  │     ├▶ Filter nbhd tab by Metro Name                                                 │
  │     └▶ Filter macro tab by Metro Name                                                │
  └──────────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
  ┌──────────────────────────────────────────────────────────────────────────────────────┐
  │  4. CREATE NEW SLIDES                                                                │
  │     ├▶ DriveApp.getFileById(slidesTemplateId).makeCopy()                             │
  │     └▶ Add hyperlink to Worksheet in Start Here tab                                  │
  └──────────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
  ┌──────────────────────────────────────────────────────────────────────────────────────┐
  │  5. LINK CHARTS                                                                      │
  │     └▶ _replaceChartsInSlides_V2_Batch_(newSlidesId, newSheetsId)                    │
  │        Replace embedded charts with linked charts from new Worksheet                 │
  └──────────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
  ┌──────────────────────────────────────────────────────────────────────────────────────┐
  │  OUTPUT: { newSheetsUrl, newSlidesUrl } ──▶ Opens in new browser tabs                │
  └──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Sidebar Tabs Detail

### Tab 1: Meeting Prep

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  MEETING PREP                                                                       │
│  ─────────────────────────────────────────────────────────────────────────────────  │
│  - Account Search (autocomplete from STATCORE)                                      │
│  - Display: RID, Metro, Macro                                                       │
│  - [AI Brief] → buildPromptForRID() → Copy to clipboard → Open Gemini               │
│  - [Create Deck] → createBizInsightsDeck() → Open Slides + Sheets                   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Tab 2: Pricing Simulator

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  PRICING SIMULATOR                                                                  │
│  ─────────────────────────────────────────────────────────────────────────────────  │
│  - Scope: Individual / Group                                                        │
│  - System Type: Core ($299) / Pro ($499)                                            │
│  - Pricing Model: Freemium / Free Google / AYCE                                     │
│  - Inputs: Sub Fee, Disco Price                                                     │
│  - Output: Current vs Simulated pricing comparison                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Tab 3: Bucket Summary

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  BUCKET SUMMARY                                                                     │
│  ─────────────────────────────────────────────────────────────────────────────────  │
│  - Select AM from dropdown                                                          │
│  - Portfolio Overview: Account count, Groups, Avg Yield                             │
│  - Contract Status: Term Pending, Expired, Canceling, 45-day Warning                │
│  - Product Adoption: PI Active, Private Dining, XP Active                           │
│  - System Mix: Core/Pro/Basic breakdown                                             │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Tab 4: InTouch Chat (AI Assistant)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  INTOUCH CHAT (AI Assistant)                                                        │
│  ─────────────────────────────────────────────────────────────────────────────────  │
│  - Quick Prompts: "Summarize bucket", "Which need attention?", etc.                 │
│  - Natural language queries about portfolio                                         │
│  - Filter/Isolate accounts via chat commands                                        │
│  - Routing: Scripted → Glossary → Cached → Gemini API                               │
│  - Feedback: Thumbs up/down → Central logging                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Central Logging Architecture

```
                    MASTER SPREADSHEET (Fleet-Wide Monitoring)
  ┌──────────────────────────────────────────────────────────────────────────────────────┐
  │                                                                                      │
  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
  │   │    Log      │    │   Refresh   │    │  API_Usage  │    │ Prompt_Log  │          │
  │   │ ─────────── │    │ ─────────── │    │ ─────────── │    │ ─────────── │          │
  │   │ User        │    │ Function    │    │ User        │    │ User        │          │
  │   │ Timestamp   │    │ Timestamp   │    │ Timestamp   │    │ Timestamp   │          │
  │   │ Operation   │    │ Worksheet   │    │ Worksheet   │    │ Worksheet   │          │
  │   │ Worksheet   │    │ Records     │    │ Prompt Tkns │    │ Prompt Text │          │
  │   │             │    │ Duration    │    │ Resp Tokens │    │ Query Type  │          │
  │   │             │    │ Result      │    │ Total Tkns  │    │ Routing Src │          │
  │   │             │    │ Error       │    │ Query Type  │    │             │          │
  │   └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘          │
  │                                                                                      │
  │   ┌─────────────────────────────────────────────────────────────────────┐            │
  │   │                         Fleet_Ops                                   │            │
  │   │ ────────────────────────────────────────────────────────────────── │            │
  │   │ User | Timestamp | Operation | Target | Success | Errors | Details │            │
  │   └─────────────────────────────────────────────────────────────────────┘            │
  │                                                                                      │
  └──────────────────────────────────────────────────────────────────────────────────────┘
                              │
                              │  logInteraction()
                              │  logRefreshToCentral()
                              │  logApiUsage()
                              │  logUserPrompt()
                              │  logFleetOperation()
                              │
    ┌─────────────────────────┼─────────────────────────┐
    │                         │                         │
    ▼                         ▼                         ▼
┌─────────┐             ┌─────────┐             ┌─────────┐
│ InTouch │             │ InTouch │             │ InTouch │
│ File #1 │             │ File #2 │             │ File #N │
│ (LA)    │             │ (NYC)   │             │ (CHI)   │
└─────────┘             └─────────┘             └─────────┘
```

### Logging Functions

| Function | Target Sheet | Purpose |
|----------|--------------|---------|
| `logInteraction(operation)` | Log | User sessions, sidebar opens, deck creations |
| `logRefreshToCentral(...)` | Refresh | Pipeline execution results |
| `logApiUsage(usageData, type)` | API_Usage | Gemini API token consumption |
| `logUserPrompt(prompt, ...)` | Prompt_Log | Chat queries and routing |
| `logFleetOperation(...)` | Fleet_Ops | Global deployments, mass updates |

---

## System Summary

InTouch is a **thick-client Google Apps Script system** that:

| Capability | Description |
|------------|-------------|
| **Data Sync** | Pulls 30k+ rows from external spreadsheets nightly. Uses batch processing (3-4k rows) with `flush()` for stability. |
| **User Views** | Creates personalized AM tabs filtered from master STATCORE. Dynamic sticky notes generated from NOTE_CONFIG rules. |
| **AI Integration** | Sidebar with Gemini-powered chat for portfolio insights. Smart routing: Scripted → Glossary → Cached → API. |
| **Presentations** | Auto-generates Slides + Sheets with benchmark data. Template cloning with chart linking. |
| **Fleet Ops** | Manages multiple InTouch files across regions. Central logging for monitoring and analytics. |

### Key Performance Characteristics

| Metric | Value |
|--------|-------|
| Scale | 30,000+ rows |
| Memory Management | Batch + Flush pattern |
| Logging | Pattern 6 (Refresh sheet) |
| Cache Duration | 6 hours |
| Nightly Trigger | 1am local time |
| Max Execution | 6 minutes (GAS limit) |

---

## External Data Sources

| ID | Name | Purpose |
|----|------|---------|
| `1Qa3S3USt-TOd...` | Statcore Source | Raw account data (StatcoreNA) |
| `1V4C9mIL4ISP4...` | SYSCORE | System status data (Salesforce) |
| `1atxJQcNKTJyE...` | DAGCORE | Distribution analytics |
| `1FhLSSmCb4bEa...` | Benchmarks | Metro/neighborhood benchmarks |
| `1yiqY-5XJY2k8...` | Central Log | Fleet-wide operation logs |

---

*Last Updated: January 30, 2026*
