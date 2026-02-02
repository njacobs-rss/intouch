# InTouch AI - User Guide

> **📘 Developer Documentation**: For technical architecture, data pipelines, and system internals, see the **[Interactive Developer Docs](https://njacobs.github.io/Intouch/)**.

Welcome to **InTouch AI**, your all-in-one tool for account management, meeting preparation, and portfolio insights. This guide will walk you through everything you can do with this tool.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Your Personal AM Tab](#your-personal-am-tab)
   - [Smart Select Column](#smart-select-column)
   - [The Reset Button](#the-reset-button)
   - [Focus 20](#focus-20)
3. [The InTouch AI Panel](#the-intouch-ai-panel)
   - [Meeting Prep](#meeting-prep)
   - [Pricing Simulator](#pricing-simulator)
   - [Bucket Summary](#bucket-summary)
   - [InTouch Chat (AI Assistant)](#intouch-chat-ai-assistant)
4. [Menu Options](#menu-options)
5. [Fleet Commander (Managers & Admins)](#fleet-commander-admin-panel)
   - [Local Tab](#local-tab-manager-functions)
   - [Global Ops Tab](#global-ops-tab-system-administrators-only)
   - [Range Replicator](#range-replicator-system-administrators-only)
6. [Understanding Your Data](#understanding-your-data)
7. [Technical Reference](#technical-reference)
   - [Data Pipeline Architecture](#data-pipeline-architecture)
   - [Central Logging System](#central-logging-system)
   - [Performance Optimizations](#performance-optimizations)
8. [Troubleshooting](#troubleshooting)
9. [Frequently Asked Questions](#frequently-asked-questions)

---

## Getting Started

When you open your InTouch spreadsheet, you'll see two special menus in the menu bar:

- **InTouch✔ai** - Your main tools for day-to-day work
- **Admin Functions** - Advanced options and system maintenance

To access most features, click **InTouch✔ai** → **Open InTouch AI Panel**. This opens a sidebar on the right side of your screen where you'll spend most of your time.

---

## Your Personal AM Tab

Each Account Manager has their own personal tab in the spreadsheet. These tabs are named after you (your first name) and contain all the accounts assigned to you. The list of AM tabs is managed in the **Setup** sheet (column C).

Your personal tab is your home base for managing your accounts day-to-day.

### Smart Select Column

The **Smart Select** column is the **first visible column** on your AM tab. It contains checkboxes that you can use for several important tasks:

**What Smart Select Does:**
- It's a multi-purpose selection tool
- Check the box next to any account(s) you want to take action on
- Different features use these checkboxes for different purposes

**Common Uses for Smart Select:**

| Task | How It Works |
|------|--------------|
| **Add to Focus 20** | Check the boxes, and the system automatically tags those accounts with today's date, then unchecks the boxes |
| **Bulk Selection** | Select multiple accounts at once for any action that reads from Smart Select |
| **Quick Flagging** | Temporarily mark accounts you're working with |

> **Tip:** After you check boxes and the system processes them (like adding to Focus 20), the checkboxes automatically uncheck themselves so you know the action completed.

---

### The Reset Button

If your filters get tangled up or you want to start fresh with your account view, use the **Reset Filters** function.

**What It Does:**
- Clears any existing filters on your current tab
- Reapplies a fresh filter to the data starting from row 2
- Gives you a clean slate to work with

**How to Use It:**
This function is typically available through your spreadsheet's custom functions or can be run directly. It resets the filter on whatever sheet you're currently viewing.

---

### Focus 20

**Focus 20** is a way to tag your priority accounts - the restaurants you're actively working with or want to keep top of mind.

#### Adding Accounts to Focus 20

**Automatic Method (Recommended):**
1. Go to your personal AM tab
2. Check the **Smart Select** checkbox next to the accounts you want to prioritize
3. The system automatically:
   - Tags those accounts as Focus 20 with today's date
   - Unchecks the Smart Select boxes to confirm it worked

**Manual Menu Method:**
- **Admin Functions** → **Focus20** → **Add RIDs from Smart Select**
- Use this if the automatic trigger didn't fire

#### Removing Accounts from Focus 20

1. Check the **Smart Select** boxes next to accounts you want to remove from Focus 20
2. Go to **Admin Functions** → **Focus20** → **Remove RIDs from Smart Select**
3. The Focus 20 tag will be cleared from those accounts
4. The Smart Select boxes will uncheck to confirm

#### Why Use Focus 20?

- **Track Priority Accounts** - Flag restaurants you're actively working with
- **Measure Engagement** - The date stamp shows when you prioritized each account
- **Manager Visibility** - Leadership can see which accounts AMs are actively working
- **Reporting** - Focus 20 data feeds into reports and dashboards

---

## The InTouch AI Panel

The InTouch AI Panel has three tabs across the top: **Meeting Prep**, **Pricing Simulator**, and **Bucket Summary**.

### Meeting Prep

This is your go-to tool for preparing before a restaurant meeting.

#### How to Use It:

1. **Select an Account** - Start typing a restaurant name in the search box. As you type, matching accounts will appear. Click one to select it.

2. **View Account Details** - Once selected, you'll see basic information about the account including:
   - RID (Restaurant ID)
   - Metro (market area)
   - Macro (neighborhood/area)

3. **Launch AI Brief** - Click this button to gather all the important data about this account and prepare it for AI analysis. This will:
   - Collect revenue, cover, and subscription data
   - Gather system information and product adoption details
   - Copy everything to your clipboard
   - Open Google Gemini where you can paste the data for intelligent insights

4. **Create Presentation** - Click this button to automatically generate a presentation deck with:
   - Benchmark data for the account's market
   - Charts and visualizations
   - A linked worksheet with supporting data

   After clicking, wait a moment and your new presentation will open in a new browser tab.

---

### Pricing Simulator

Use this tool to model different pricing scenarios for accounts before having pricing conversations.

#### How to Use It:

1. **Choose Your Scope**
   - **Individual** - Analyze a single restaurant
   - **Group** - Analyze an entire restaurant group (parent account)

2. **Select the Account or Group**
   - For individuals: Search and select from the dropdown
   - For groups: Choose from the group list

3. **Configure the Simulation**
   - **System Type**: Choose Core ($299) or Pro ($499)
   - **Pricing Model**: 
     - *Free Direct Plan (Freemium)* - Covers from your network are free, discovery covers have a per-cover fee
     - *Free Google Plan* - Free covers with Google credit applied
     - *AYCE (All You Can Eat)* - Flat subscription fee only

4. **Set Your Numbers**
   - **Sub Fee** - The monthly subscription amount
   - **Disco Price** - Per-cover fee for discovery (only for Freemium model)

5. **Run Simulation** - Click to see results showing:
   - Current pricing breakdown
   - Simulated new pricing
   - Monthly difference (savings in green, increase in red)
   - Percentage change

---

### Bucket Summary

Get a quick snapshot of any Account Manager's entire portfolio.

#### How to Use It:

1. **Select an Account Manager** from the dropdown
2. The system will calculate and display:

**Portfolio Overview:**
- Total account count (Bucket)
- Number of restaurant groups
- Average yield and subscription fees

**Contract Status:**
- Term Pending (needs immediate action)
- Expired contracts
- Canceling accounts
- Contracts expiring within 45 days (Warning)

**Product Adoption:**
- Active PI (Premium Inventory)
- Private Dining participation
- XP (Experiences) active

**Performance Metrics:**
- Discovery share percentage
- PI revenue share

**Breakdown Lists:**
- Top metros in portfolio
- System mix (POS types)
- Quality tiers
- Special programs
- Reasons for no bookings

> **Note:** This feature shows a "Work in Progress" banner because some data points are still being refined.

---

### InTouch Chat (AI Assistant)

The InTouch Chat is a conversational AI assistant powered by Google Gemini that can answer questions about your portfolio, filter accounts, provide strategic guidance, and help you navigate InTouch. Access it through the InTouch AI Panel.

#### How It Works Behind the Scenes

InTouch Chat uses intelligent routing to give you the fastest, most accurate answers:

| Query Type | How It's Handled | Speed |
|------------|------------------|-------|
| **Definitions** (e.g., "What is PI?") | Scripted responses - no AI call needed | Instant |
| **Simple questions** (e.g., "How many Pro?") | Gemini Flash model - optimized for speed | Fast |
| **Complex analysis** (e.g., "Analyze my renewals strategy") | Gemini Pro model - deeper reasoning | Thorough |

The system also uses **context caching** to remember your portfolio data, reducing response times and API costs by up to 50%.

#### What Can InTouch Chat Do?

| Capability | Example Prompts |
|------------|-----------------|
| **Portfolio Analysis** | "Summarize my bucket", "Breakdown my system mix", "Which accounts need attention?" |
| **Filter & Isolate** | "Isolate my Pro accounts", "Filter accounts with expired contracts", "Find 0-Fullbook accounts" |
| **Stacked Filtering** | "Isolate Core accounts that are term pending", "Filter Freemium accounts with 0-Fullbook" |
| **Column Changes** | "Show me Metro instead of Macro", "Add Customer Since column", "Where is POS Type?" |
| **Count & List** | "How many on Pro?", "Which accounts are Freemium?", "List my term pending accounts" |
| **Team Comparisons** | "How do I rank against the team?", "Compare my metrics to other AMs" |
| **Explanations** | "What is Discovery %?", "What does 0-Fullbook mean?", "Metro vs Macro?" |
| **Strategic Guidance** | "How should I approach this renewal?", "What's the best pricing play?", "Prioritize my term pending accounts" |

#### Strategic Playbook

InTouch Chat includes built-in strategic knowledge to help with common scenarios:

- **Renewal Strategies** - Guidance on approaching different contract situations
- **System Type Recommendations** - When to suggest Core vs Pro upgrades
- **Pricing Plays** - Tactics for Freemium, AYCE, and other pricing models
- **Account Prioritization** - How to identify and focus on high-impact accounts

#### Starter Prompts

The chat offers quick-start prompts for common tasks:

1. **"Summarize my bucket"** - Full portfolio snapshot with system mix, contract status, and alerts
2. **"Which accounts need attention?"** - Shows all accounts with alert flags
3. **"Breakdown my system mix"** - Core/Pro/Basic distribution with avg yield per tier
4. **"Show my most important accounts"** - Icons, Elites, special programs
5. **"Find accounts that need PI"** - PI opportunity candidates
6. **"How do I rank against the team?"** - Your metrics compared to other AMs

#### Filtering & Isolation

One of the most powerful features is account filtering. When you ask InTouch Chat to "isolate" or "filter" accounts:

1. The chat finds matching accounts in your bucket
2. Those accounts are automatically checked in **Smart Select** (Column D)
3. Your view filters to show only those accounts
4. You can then add them to Focus20 or take other bulk actions

**Single criteria filtering:**
- "Isolate my Pro accounts"
- "Filter accounts with 0-Fullbook"
- "Show me expired contracts"

**Stacked filtering (multiple conditions):**
- "Isolate Core accounts that are term pending"
- "Filter Pro accounts with Freemium pricing"
- "Find accounts on Basic with 0-Network"

#### Asking About Other AMs

You can ask about any AM's portfolio by name:
- "What about Erin's bucket?"
- "Show me Kevin's system mix"
- "How many Pro accounts does Sarah have?"

#### Providing Feedback

After receiving a response, you can rate it using the thumbs up/down buttons. This feedback helps improve the system over time. All feedback is logged for review by administrators.

#### Tips for Best Results

| Tip | Why It Helps |
|-----|--------------|
| Ask naturally | The chat understands conversational language - no special syntax needed |
| Use "isolate" or "filter" | These trigger automatic account selection and filtering |
| Ask follow-up questions | After getting a count, ask "which ones?" to see the list |
| Specify the metric | "How many Pro?" is clearer than "How many types?" |
| Check Smart Select after filtering | Filtered accounts are checked for bulk actions |
| Ask for strategy advice | The chat can suggest approaches for renewals, pricing, and prioritization |

#### What InTouch Chat Cannot Do

- Edit account data directly (use SFDC for data changes)
- Change account assignments
- Access external systems or APIs
- Delete or create accounts

The chat helps you **identify and select** accounts - then you take action using InTouch's tools.

---

## Menu Options

### InTouch✔ai Menu

| Option | What It Does |
|--------|--------------|
| **Open InTouch AI Panel** | Opens the main sidebar with Meeting Prep, Simulator, and Summary tools |
| **Export AM Summaries** | Creates a new spreadsheet with portfolio data for every Account Manager - useful for leadership reporting |

### Admin Functions Menu

> **Note:** Most options in this menu are intended for team managers and system administrators. Regular users primarily use the **Focus20** options.

| Option | What It Does | Who Uses It |
|--------|--------------|-------------|
| **Open Fleet Commander** | Opens the admin panel for system maintenance | Managers & Admins |
| **AM Tabs → Create All From Setup** | Creates personal tabs for each AM listed in the Setup sheet | Managers |
| **AM Tabs → Delete All From Setup** | Removes all AM personal tabs | Managers |
| **AM Tabs → Create Single Tab** | Creates a tab for the name entered in cell F2 of Setup | Managers |
| **Focus20 → Add RIDs from Smart Select** | Manually trigger Focus 20 tagging | All Users |
| **Focus20 → Remove RIDs from Smart Select** | Clear Focus 20 tags from selected accounts | All Users |
| **Global Functions → Test Gemini API (Fleet)** | Tests AI API connectivity across all fleet files | System Admins |
| **Update Notes Only** | Refreshes the sticky notes on accounts based on current rules | Managers |
| **Force Master Pipeline** | Manually runs the full data refresh (normally runs nightly) | Managers & Admins |
| **Reset Nightly Trigger** | Resets the automatic nightly refresh schedule | System Admins |

---

## Fleet Commander (Admin Panel)

> ⚠️ **For Team Managers & System Administrators Only**
> 
> Fleet Commander is a powerful administration tool designed for team managers and system administrators. If you're a regular user (Account Manager), you won't need to use this panel for your day-to-day work. The features described below can affect multiple spreadsheets and should only be used by authorized personnel.

To open Fleet Commander: **Admin Functions** → **Open Fleet Commander**

---

### Local Tab (Manager Functions)

These actions affect **only the current spreadsheet** and are intended for team managers maintaining their team's file:

| Button | What It Does | When to Use |
|--------|--------------|-------------|
| **Refresh AM Tabs** | Recreates all Account Manager tabs based on the Setup sheet | When adding/removing team members |
| **Update Notes Only** | Refreshes sticky notes on all accounts | When notes appear stale or after rule changes |
| **Force Local Refresh** | Runs the complete data pipeline: updates account data, system info, and notes | When data seems outdated or after system issues |
| **Delete AM Tabs** | Removes all Account Manager personal tabs | Before recreating tabs or during cleanup |

---

### Global Ops Tab (System Administrators Only)

> 🔒 **Restricted Access** - This tab is only visible to authorized system administrators. These actions affect **all spreadsheets across the entire fleet** and should be used with caution.

| Button | What It Does | Impact |
|--------|--------------|--------|
| **Deploy Update** | Pushes an updated version of a sheet to all fleet files | Overwrites existing sheets in all files |
| **Deploy New** | Copies a new sheet to all fleet files | Adds new tabs to all files |
| **Mass Delete** | Removes a specific sheet from all fleet files | Permanently deletes tabs from all files |
| **Data Refresh** | Refreshes account data across all fleet files (with scope options) | Updates data in all files - can take several minutes |
| **Update IDs** | Syncs template IDs across all files | Updates configuration in all files |
| **AM Tabs** | Recreates AM tabs in all fleet files | Rebuilds employee tabs in all files |
| **Export AI Feedback** | Downloads user feedback on AI chat responses | Creates export file for analysis |
| **Test API** | Tests Gemini API connectivity across the fleet | Verifies AI features are working |
| **Check Queue Status** | Shows progress of queued fleet operations | Monitoring only - no changes made |

#### API Testing

The **Test API** button pings the Gemini API to verify connectivity:

- Tests API key configuration
- Reports latency in milliseconds
- Identifies configuration issues (missing keys, invalid permissions)

Use this when:
- InTouch Chat isn't responding
- You've recently updated API credentials
- Troubleshooting AI feature issues

#### Data Refresh Options

When running a fleet-wide data refresh, administrators can choose the scope:

| Option | What It Refreshes | Speed |
|--------|-------------------|-------|
| **Full Pipeline** | All data sources (complete refresh) | Slowest |
| **SYSCORE + DAGCORE** | Supplemental and performance data only | Medium |
| **SYSCORE Only** | Supplemental data only | Faster |
| **DAGCORE Only** | Performance data only | Fastest |

**Optional:** Check "Also update dynamic notes after refresh" to regenerate sticky notes as part of the refresh.

#### Queue-Based Processing

Fleet data refreshes use an intelligent **queue system** that handles large fleets reliably:

**How It Works:**
1. When you start a refresh, all fleet files are added to a processing queue
2. Files are processed in batches of 3 (to avoid timeouts)
3. The system automatically schedules continuation after each batch
4. You can monitor progress, continue manually, or reset the queue

**Queue Controls:**
- **Check Queue Status** - See how many files are completed, remaining, and failed
- **Continue Now** - Manually trigger the next batch (useful if auto-continuation didn't fire)
- **Reset Queue** - Clear the queue and stop processing (useful if something went wrong)

**Benefits:**
- **Reliability**: Processing continues even if one file fails
- **Timeout Protection**: 4.5-minute safety margin prevents execution limits
- **Preloaded Data**: Source data is read once per batch for efficiency
- **Progress Tracking**: Real-time visibility into processing status

**Toast Notifications:**
All operations now show real-time toast notifications instead of the old spinner/log format:
- Working indicator with spinner during operations
- Success/error/warning toasts with clear messages
- Progress bars for multi-file operations

---

### Range Replicator (System Administrators Only)

A precision tool for pushing specific cell ranges (formulas, values, formatting) across the entire fleet:

**How to Use:**
1. Select a range of cells in your spreadsheet
2. Click **Capture Selection** to lock in your selection
3. Optionally specify a header row for verification
4. Use **Verify Headers** to check if target files have matching column structure
5. Use **Push to Fleet** to copy that exact range to all fleet files

**Capture Display:**
After capturing, you'll see:
- Sheet name and range (e.g., "STATCORE!A1:F10")
- Size (rows × columns)
- Badges indicating if the range contains formulas or rich text
- Preview of first row headers

**Advanced Options:**

| Option | Purpose |
|--------|---------|
| **Header Row** | Specify which row contains column headers for verification |
| **Target Sheet** | Push to a different sheet name than the source |
| **Different Target Range** | Push to a different cell location than the source |

#### Test Mode (Recommended)

**Always test before a full fleet push!** Test Mode lets you push to a single file first to verify the results:

1. Check the **Test Mode (Single File)** checkbox
2. Select a target fleet file from the dropdown
3. Click **Test Push** (instead of "Push to Fleet")
4. Review the results in that file
5. If successful, uncheck Test Mode and push to the full fleet

**Test Mode Benefits:**
- Catch errors before they affect all files
- Verify formulas resolve correctly in the target context
- Confirm formatting transfers as expected
- Option to open the test file directly to inspect results

**Header Verification:**
- If headers don't match between source and target, you'll see a warning
- Mismatched files are listed so you can investigate
- Use **Force Push** to override warnings (use with caution)

---

## Understanding Your Data

### Where Does the Data Come From?

Your personal AM tab displays data pulled from several backend sources. You don't need to access these directly - everything flows to your tab automatically:

- **Account Information** - Names, status, AM assignments, contract dates
- **System Data** - Engagement metrics and system information
- **Performance Data** - Revenue, covers, and channel mix

All of this data is combined and presented on your personal tab so you have one place to see everything about your accounts.

### How Often Is Data Updated?

- **Nightly** - The system automatically refreshes all data between 1-2 AM
- **On-Demand** - Administrators can force a refresh using the Admin Functions menu

### What Are the Sticky Notes?

The notes that appear when you hover over cells are generated automatically based on rules in the NOTE_CONFIG sheet. They provide at-a-glance information about each account like:
- Contract status and dates
- Revenue and cover metrics
- System information
- Special flags or alerts

---

## Technical Reference

> **Note:** This section is intended for system administrators and developers who need to understand the underlying architecture.

### Data Pipeline Architecture

InTouch uses a multi-step data pipeline that runs nightly (1-2 AM) and can be triggered manually:

```
┌─────────────────────────────────────────────────────────────────┐
│                     NIGHTLY PIPELINE                            │
│  runMasterPipeline() @ 1am                                      │
│     │                                                           │
│     ├─► updateSTATCORE()     → Pulls from external data source  │
│     │      │                                                    │
│     │      └─► runSYSCOREUpdates() → Adds system/engagement data│
│     │             │                                             │
│     │             └─► runDAGCOREUpdates() → Populates DISTRO    │
│     │                                                           │
│     └─► updateAccountNotes() → Generates sticky notes           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Data Sheets:**

| Sheet | Purpose | Key Information |
|-------|---------|-----------------|
| `STATCORE` | Master account data | RID, Account Name, Parent, Metro, AM, Contract Dates |
| `DISTRO` | Performance metrics | Revenue, Covers, Channel Mix, PI Status |
| `SYSCORE` | System engagement | Salesforce activity, Last Engagement, Task/Event links |
| `NOTE_CONFIG` | Note rules | Expressions, Formatting, Templates |

### Central Logging System

All operations are logged to a central master spreadsheet for fleet-wide monitoring:

| Log Type | Sheet Name | What It Tracks |
|----------|------------|----------------|
| **User Sessions** | `Log` | When users open spreadsheets and what operations they perform |
| **Pipeline Execution** | `Refresh` | Data refresh results, duration, record counts, errors |
| **API Usage** | `API_Usage` | Gemini API token consumption per user and query type |
| **User Prompts** | `Prompt_Log` | Chat queries and how they were routed (scripted vs AI) |
| **Fleet Operations** | `Fleet_Ops` | Global deployments, mass updates, and their results |

**Viewing Logs:**
- Administrators can access the central logging spreadsheet to monitor system health
- The local `Refresh` sheet in each file also shows recent pipeline activity
- API usage helps track costs and identify heavy users

### Performance Optimizations

The system is optimized for handling 30,000+ rows:

| Technique | Purpose |
|-----------|---------|
| **Batch Processing** | Data is written in batches of 3,000-4,000 rows to prevent timeouts |
| **Memory Flushing** | `SpreadsheetApp.flush()` clears memory after large operations |
| **True Last Row Detection** | Scans column A to find actual data depth, avoiding empty formatted rows |
| **Sidebar Caching** | Account lists are cached for 6 hours to speed up sidebar loading |
| **Context Caching** | AI system instructions are cached for 24 hours to reduce API costs |

---

## Troubleshooting

### Common Issues and Solutions

#### Sidebar Won't Load

1. **Refresh the page** and try opening the sidebar again
2. **Check for browser extensions** that might block popups or scripts
3. **Clear browser cache** if the sidebar appears broken or outdated
4. **Try a different browser** (Chrome works best with Google Apps Script)

#### Data Appears Stale or Missing

1. **Check the Refresh sheet** - Look for recent pipeline runs and any errors
2. **Force a local refresh** - Admin Functions → Force Master Pipeline
3. **Verify the nightly trigger** - Admin Functions → Reset Nightly Trigger
4. **Check SETUP sheet** - Ensure your name is in column B (rows 3-22)

#### InTouch Chat Not Responding

1. **Test the API** - Fleet Commander → Test API button
2. **Check for rate limits** - Heavy usage may trigger temporary throttling
3. **Verify API key** - Script Properties must contain `GEMINI_API_KEY`
4. **Try a simple query first** - "What is PI?" to test basic functionality

#### Presentations Not Generating

1. **Verify template IDs** - Check SETUP!H3 (Slides) and SETUP!H5 (Sheets)
2. **Ensure account is selected** - The button should only be active when an account is chosen
3. **Check Drive permissions** - You need access to the template files
4. **Look for popup blockers** - The new presentation opens in a new tab

### Diagnostic Functions

> **For Administrators/Developers Only** - These functions are run from the Apps Script editor.

| Function | Purpose | How to Run |
|----------|---------|------------|
| `debugSTATCOREHeaders()` | Inspects column detection in STATCORE | Apps Script Editor → Run |
| `testMetroMacroDataFlow()` | Tests end-to-end data flow for Metro/Macro fields | Apps Script Editor → Run |
| `runFullSystemDiagnostic()` | Checks library connections and trigger status | Apps Script Editor → Run |
| `TEST_InTouchGuideLoaded()` | Verifies AI chat components are loaded correctly | Apps Script Editor → Run |
| `getCacheStatus()` | Shows context cache status and expiry | Apps Script Editor → Run |

**Viewing Results:**
- After running a diagnostic function, check **View → Logs** (or Ctrl+Enter) for output
- For trigger issues, check **View → Executions** for error details

### Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "STATCORE sheet not found" | Missing required sheet | Check sheet exists and is named exactly "STATCORE" |
| "Service Timed Out" | Operation took too long | Data will continue in batches; wait and check again |
| "Cannot read property of undefined" | Missing data or column | Run `debugSTATCOREHeaders()` to check column mapping |
| "API Key not found" | Missing Gemini configuration | Add GEMINI_API_KEY to Script Properties |
| "Access Denied" | Unauthorized for fleet operations | Contact system administrator |

---

## Frequently Asked Questions

### Q: The sidebar won't open. What do I do?

Try refreshing the page, then go to **InTouch✔ai** → **Open InTouch AI Panel** again. If it still doesn't work, check for popup blockers in your browser.

### Q: My account list is empty in the sidebar.

The account list loads from your spreadsheet's data. If you just opened the spreadsheet, wait a few seconds and try again. The data caches after the first load for faster access.

### Q: The presentation button isn't working.

Make sure you've selected a valid account first. The button will be disabled until you select an account from the dropdown. Also check that your template IDs are properly configured in the Setup sheet (cells H3 and H5).

### Q: How do I add a new Account Manager?

> **Note:** This is typically done by an administrator.

1. Add their full name to the **Setup** sheet in column B (rows 3-22)
2. Their name will automatically appear in column C (the list that controls AM tabs)
3. Use **Admin Functions** → **AM Tabs** → **Create All From Setup** to regenerate all tabs
4. Or use **Create Single Tab** after entering the name in cell F2 for a quick single addition

The new tab will be named after their first name and will automatically show all accounts assigned to them.

### Q: The Bucket Summary shows "WIP" - is the data wrong?

Some metrics in the Bucket Summary are still being validated. The core numbers (account count, groups, contract status) are accurate. Penetration metrics are under review.

### Q: I made changes but my notes didn't update.

Notes only refresh during the nightly pipeline or when you manually trigger **Update Notes Only** from the Admin Functions menu.

### Q: What's the difference between Metro and Macro?

- **Metro** = The major market area (e.g., "Los Angeles", "New York")
- **Macro** = A sub-area or neighborhood within that metro (e.g., "Santa Monica", "Manhattan")

### Q: I checked Smart Select but nothing happened to Focus 20.

The automatic Focus 20 tagging triggers when you check a Smart Select box. If it didn't work:
1. Try using the manual method: **Admin Functions** → **Focus20** → **Add RIDs from Smart Select**
2. Make sure the accounts you selected have valid RIDs
3. Contact your administrator if the issue persists

### Q: How do I know if an account is in my Focus 20?

When you successfully add an account to Focus 20:
- The Smart Select checkbox will automatically uncheck (confirming the action completed)
- The account is tagged with today's date in the system
- Your administrator or manager can pull Focus 20 reports to see your priority accounts

### Q: My filters are messed up. How do I fix them?

Use the **Reset Filters** function to clear all filters and start fresh. This removes any existing filter on your current tab and reapplies a clean filter to the data.

### Q: Where is the list of AM tabs managed?

The list of Account Managers (and their tabs) is managed in the **Setup** sheet:
- **Column B** (rows 3-22): AM names
- **Column C**: The active list that determines which tabs exist
- The "Manager Lens" tab is a special view and won't be deleted when refreshing AM tabs

---

## Need Help?

If you encounter issues not covered in this guide, check the **Refresh** sheet in your spreadsheet for recent activity logs, or reach out to your system administrator.

---

*Last Updated: January 30, 2026*
