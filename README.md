# InTouch AI - User Guide

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
4. [Menu Options](#menu-options)
5. [Fleet Commander (Admin Panel)](#fleet-commander-admin-panel)
6. [Understanding Your Data](#understanding-your-data)
7. [Frequently Asked Questions](#frequently-asked-questions)

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

## Menu Options

### InTouch✔ai Menu

| Option | What It Does |
|--------|--------------|
| **Open InTouch AI Panel** | Opens the main sidebar with Meeting Prep, Simulator, and Summary tools |
| **Export AM Summaries** | Creates a new spreadsheet with portfolio data for every Account Manager - useful for leadership reporting |

### Admin Functions Menu

| Option | What It Does |
|--------|--------------|
| **Open Fleet Commander** | Opens the admin panel for system maintenance (see below) |
| **AM Tabs → Create All From Setup** | Creates personal tabs for each AM listed in the Setup sheet |
| **AM Tabs → Delete All From Setup** | Removes all AM personal tabs |
| **AM Tabs → Create Single Tab** | Creates a tab for the name entered in cell F2 of Setup |
| **Focus20 → Add RIDs from Smart Select** | Manually trigger Focus 20 tagging |
| **Focus20 → Remove RIDs from Smart Select** | Clear Focus 20 tags from selected accounts |
| **Update Notes Only** | Refreshes the sticky notes on accounts based on current rules |
| **Force Master Pipeline** | Manually runs the full data refresh (normally runs nightly) |
| **Reset Nightly Trigger** | Resets the automatic nightly refresh schedule |

---

## Fleet Commander (Admin Panel)

> **Note:** The Global Operations tab is only available to authorized administrators.

### Local Tab (Available to Everyone)

These actions only affect the current spreadsheet:

| Button | What It Does |
|--------|--------------|
| **Refresh AM Tabs** | Recreates all Account Manager tabs based on the Setup sheet |
| **Update Notes Only** | Refreshes sticky notes on all accounts |
| **Force Local Refresh** | Runs the complete data pipeline: updates account data, system info, and notes |
| **Delete AM Tabs** | Removes all Account Manager personal tabs |

### Global Ops Tab (Administrators Only)

These actions affect all spreadsheets in the fleet:

| Button | What It Does |
|--------|--------------|
| **Deploy Update** | Pushes an updated version of a sheet to all fleet files |
| **Deploy New** | Copies a new sheet to all fleet files |
| **Mass Delete** | Removes a specific sheet from all fleet files |
| **Data Refresh** | Refreshes account data across all fleet files (with options for full or partial refresh) |
| **Update IDs** | Syncs template IDs across all files |
| **AM Tabs** | Recreates AM tabs in all fleet files |

#### Range Replicator (Administrators Only)

A precision tool for pushing specific cell ranges across the fleet:

1. Select a range of cells in your spreadsheet
2. Click **Capture Selection** to lock in your selection
3. Optionally specify a header row for verification
4. Use **Verify Headers** to check if other files have matching structure
5. Use **Push to Fleet** to copy that exact range to all fleet files

**Test Mode:** Enable this to push to just one file first before going fleet-wide.

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

*Last Updated: January 2026*
