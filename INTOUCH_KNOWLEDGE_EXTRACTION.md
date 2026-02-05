# InTouch Knowledge Extraction - Static Content for Local Scripted Responses

## Summary
This document identifies knowledge categories from `INTOUCH_SYSTEM_INSTRUCTION` that contain static facts, definitions, workflows, and reference data suitable for conversion to local scripted responses (avoiding Gemini API calls).

## Relationship to PLAYBOOK.md

Categories 14-21 (Strategic Playbook, Renewal Lifecycle, Operating Rhythm, System Archetypes, Pricing Levers, Strategic Plays, Objection Scripts, Decision Framework) are **quick-reference summaries** of the detailed content in `PLAYBOOK.md`.

Categories 27-31 (Free Google) are **quick-lookup extractions** that complement the comprehensive Free Google section in `PLAYBOOK.md` Part 3.5.

Categories 32-35 (Free Google Sidebar Workflow, Strategy Generation, Bucket IQ Tab, Feedback System) document the **UI/UX features** added in v1.4.0 (Feb 2026) for the Free Google Initiative and AI optimizations.

**Usage guidance:**
- Use **Knowledge Extraction** categories for fast, static lookups (definitions, eligibility checks, dates, scripts)
- Use **PLAYBOOK.md** for detailed battle cards, full context, and nuanced If/Then scenarios
- Use **Categories 32-35** for UI navigation and workflow questions
- When both contain similar content, PLAYBOOK.md is authoritative for detailed guidance

---

## 1. SHEET LAYOUT & COLUMN STRUCTURE

**Type:** Static reference data

**Content:**
- Fixed columns (D, F, H) and their purposes
- Dynamic column categories and their options
- Column section mappings (Account IDs, Account Name, Location, Dates & Activity, etc.)
- Default column configurations per section
- How to change columns (double-click header method)

**Example Questions This Could Answer:**
- "What columns are fixed vs dynamic?"
- "What options are available for Column E?"
- "Where is Metro located?"
- "How do I change a column metric?"
- "What are the default columns in the Revenue section?"

**Conversion Potential:** HIGH - Pure reference data, no dynamic lookups needed

---

## 2. CORE FEATURES & NAVIGATION

**Type:** Static feature definitions and navigation paths

**Content:**
- iQ Column explanation (checkmark vs red numbers)
- Smart Select functionality and usage
- Focus20 definition and best practices (10-20 accounts, weekly refresh)
- RESET button functionality (clears filters, restores defaults, clears Smart Select)
- Meeting Prep tab location and capabilities
- Pricing Simulator location and scope
- Bucket Summary location and purpose

**Example Questions This Could Answer:**
- "What does a red number in iQ mean?"
- "How do I use Smart Select?"
- "What is Focus20?"
- "What does the RESET button do?"
- "Where is the Pricing Simulator?"
- "How do I access Meeting Prep?"

**Conversion Potential:** HIGH - Feature documentation, no data dependencies

---

## 3. CHANNEL HIERARCHY & MATH FORMULAS

**Type:** Static mathematical relationships

**Content:**
- Network = Direct + Discovery (exact formula)
- Fullbook = Network + RestRef + Phone/Walk-In
- Google is an attribution overlay, NOT additive to Network
- Never add Google separately to Fullbook calculations

**Example Questions This Could Answer:**
- "How is Network calculated?"
- "What's the relationship between Direct and Discovery?"
- "How do I calculate Fullbook?"
- "Is Google part of Network?"
- "Can I add Google covers to Network?"

**Conversion Potential:** HIGH - Pure formulas and rules, no lookups

---

## 4. METRIC DEFINITIONS & INTERPRETATION

**Type:** Static metric explanations and thresholds

**Content:**
- Discovery% definition and interpretation (low = growth opportunity, declining = availability issues)
- No Bookings >30 Days meaning (0-Fullbook = urgent, 0-Network = may be RestRef-dependent)
- Last Engaged Date thresholds (<30 = active, 30-60 = monitor, 60-90 = at risk, >90 = critical)
- Contract Alerts meanings (EXPIRED = urgent, Term Pending = plan renewal)
- iQ flag thresholds (1 = moderate, 2 = high, 3+ = urgent)

**Example Questions This Could Answer:**
- "What does Discovery% mean?"
- "What does 0-Fullbook indicate?"
- "How do I interpret Last Engaged Date?"
- "What does 'Term Pending' mean in Contract Alerts?"
- "What do the red numbers in iQ mean?"

**Conversion Potential:** HIGH - Definitions and thresholds are static

---

## 5. TERMINOLOGY MAPPINGS (Meetings vs Tasks vs Engagement)

**Type:** Static terminology reference

**Content:**
- User term → InTouch column mappings
- "Meeting"/"QBR"/"event" → Event Date/Event Type
- "Task"/"call"/"email" → Task Date/Task Type
- "Engagement"/"touch" → Last Engaged Date
- Blank value meanings for Event/Task/Engagement columns (no activity in 90 days)

**Example Questions This Could Answer:**
- "What column shows when I last met with an account?"
- "What's the difference between Task Date and Event Date?"
- "What does a blank Event Date mean?"
- "How do I find accounts with no meetings in 90 days?"

**Conversion Potential:** HIGH - Pure mapping table, no calculations

---

## 6. COMMON COLUMN CONFIGURATIONS

**Type:** Static view templates

**Content:**
- Renewals View: Columns J-L = Current Term End Date, Contract Alerts, Focus20
- Risk View: Columns M-O = No Bookings >30 Days, Status, System Type
- Growth View: Columns P-R = Active PI, Active XP, Disco % Current
- Revenue View: Columns V-X = Revenue - Total Last Month, Revenue - Subs Last Month, Check Avg. Last 30

**Example Questions This Could Answer:**
- "How do I set up a renewals view?"
- "What columns should I use for risk analysis?"
- "What's the best view for growth opportunities?"
- "How do I configure columns for revenue analysis?"

**Conversion Potential:** HIGH - Preset configurations, no dynamic data

---

## 7. NAVIGATION PATHS TABLE

**Type:** Static action → path mappings

**Content:**
- Complete table of actions and their menu paths
- Examples: Open AI Panel → InTouch✔ai → Open InTouch AI Panel
- Add to Focus20 → Check Smart Select → Click + button
- Change column metric → Ask guide or double-click header

**Example Questions This Could Answer:**
- "How do I open the AI Panel?"
- "How do I add accounts to Focus20?"
- "How do I reset my view?"
- "Where is Fleet Commander?"

**Conversion Potential:** HIGH - Static path mappings

---

## 8. TROUBLESHOOTING QUICK FIXES

**Type:** Static problem → solution mappings

**Content:**
- Sheet looks empty/broken → Click RESET
- Only few accounts visible → Smart Select filtered, click RESET
- Can't find Metro → Offer to change Column I
- Can't find metric → Offer to add column
- iQ notes outdated → Offer to run Refresh Notes
- Focus20 buttons not working → Use Admin Functions menu

**Example Questions This Could Answer:**
- "My sheet looks broken, what do I do?"
- "I can't see Metro, where is it?"
- "My iQ notes are old, how do I refresh them?"
- "The Focus20 buttons aren't working"

**Conversion Potential:** HIGH - Static troubleshooting guide

---

## 9. CRITICAL RULES (Never Violate)

**Type:** Static guardrails and constraints

**Content:**
- NEVER recommend Data → Create a filter (breaks sheet)
- NEVER add Google covers separately to Fullbook
- NEVER offer full data refreshes (only targeted actions)
- ALWAYS tell users to click RESET for view problems
- Focus20 should be 10-20 accounts, refreshed weekly
- System fixes come BEFORE pricing changes
- Check column map before saying metric doesn't exist

**Example Questions This Could Answer:**
- "Can I use Google Sheets filters?"
- "Should I add Google covers to Network?"
- "How many accounts should be in Focus20?"
- "What should I fix first - system or pricing?"

**Conversion Potential:** HIGH - Static rules and constraints

---

## 10. VALUE TO METRIC MAPPINGS

**Type:** Static lookup table

**Content:**
- "Core"/"Pro"/"Basic" → System Type (ACCOUNT_STATUS)
- "Active"/"Term Pending"/"Terminated" → Status (ACCOUNT_STATUS)
- "Freemium"/"AYCE"/"Free Google" → Exclusive Pricing (SYSTEM_STATS)
- "Platinum"/"Gold"/"Silver"/"Bronze" → Rest. Quality (SYSTEM_STATS)
- "Metro"/"Neighborhood"/"Macro" → Location (LOCATION)

**Example Questions This Could Answer:**
- "How do I see Core accounts?"
- "Where is the Freemium column?"
- "How do I filter by Platinum tier?"
- "What column shows Metro?"

**Conversion Potential:** HIGH - Static mapping table

---

## 11. CATEGORY KEY REFERENCE

**Type:** Static category → section mappings

**Content:**
- ACCOUNT_IDS → Account IDs section
- ACCOUNT_NAME → Account Name section
- LOCATION → Location section
- DATES_ACTIVITY → Dates & Activity section
- ACCOUNT_STATUS → Account + Status Info section
- SYSTEM_STATS → System Stats section
- PERCENTAGE_METRICS → Percentage Metrics section
- REVENUE → Revenue section
- SEATED_COVERS → Seated Covers section
- PRICING → Pricing section

**Example Questions This Could Answer:**
- "What category is Customer Since in?"
- "Where does System Type belong?"
- "What section is Active PI in?"

**Conversion Potential:** HIGH - Static reference data

---

## 12. ACTIVE PI VALUES

**Type:** Static value definitions

**Content:**
- BP = Bonus Points campaign
- PR/CP = Promoted/Co-Promoted campaign
- BP & PR/CP = Both campaigns active
- Empty/None/blank = no active PI campaign

**Example Questions This Could Answer:**
- "What does BP mean in Active PI?"
- "What does PR/CP mean?"
- "How do I know if an account has active PI?"

**Conversion Potential:** HIGH - Static definitions

---

## 13. RESPONSE FORMAT GUIDELINES

**Type:** Static formatting rules

**Content:**
- Use bullet points for steps
- Use InTouch terminology (iQ, Smart Select, Focus20, RESET)
- Be concise - AMs are busy
- Use tables for 4+ accounts (not bullets)
- Use first name after initial full name reference

**Example Questions This Could Answer:**
- "How should I format account lists?"
- "What terminology should I use?"
- "When should I use tables vs bullets?"

**Conversion Potential:** MEDIUM - Formatting guidelines (could be combined with other responses)

---

## 14. STRATEGIC PLAYBOOK - THREE-LAYER FRAMEWORK

**Type:** Static framework explanation

**Content:**
- Layer 1: TIME (renewal lifecycle)
- Layer 2: SYSTEM (System Type and functionality)
- Layer 3: ECONOMICS (pricing levers)
- Critical rule: Fix System BEFORE changing Price
- Price complaints are proxies for system issues

**Example Questions This Could Answer:**
- "What's the three-layer framework?"
- "What should I fix first - system or price?"
- "Why do partners complain about pricing?"

**Conversion Potential:** HIGH - Static framework explanation

---

## 15. RENEWAL LIFECYCLE PHASES

**Type:** Static phase definitions and thresholds

**Content:**
- Phase 1: Discover & Qualify (90+ days out)
- Phase 2: Build Value Story (60-90 days out)
- Phase 3: Run & Close (30-60 days out)
- Phase 4: Land & Setup (0-30 days post-renewal)
- Actions and InTouch columns to check for each phase

**Example Questions This Could Answer:**
- "What phase is a renewal in if it's 45 days out?"
- "What should I do in Phase 2?"
- "What columns should I check for Phase 3?"

**Conversion Potential:** HIGH - Static phase definitions with thresholds

---

## 16. OPERATING RHYTHM

**Type:** Static workflow schedules

**Content:**
- Daily: Clear tasks/events, log touches, check health signals
- Weekly: Review 60-90 day term pendings, at-risk accounts
- Monthly: Churn scan using iQ flags (0-2 = low, 3-5 = medium, 6-9 = high)
- Quarterly: QBR prep, Return on Network story

**Example Questions This Could Answer:**
- "What should I do daily in InTouch?"
- "How often should I review term pendings?"
- "What do iQ flag counts mean for risk?"

**Conversion Potential:** HIGH - Static schedules and thresholds

---

## 17. SYSTEM TYPE ARCHETYPES

**Type:** Static archetype definitions

**Content:**
- Archetype 1: BASIC / Light-Touch / Demand-Only
- Archetype 2: CORE On-Prem / Constrained-Access
- Archetype 3: PRO Partial Integration / Under-Adopted
- Archetype 4: PRO Full Platform, Low Network
- Archetype 5: PRO Integrated Multi-Location / Group
- Detection signals, plays, scripts, success signals for each

**Example Questions This Could Answer:**
- "What are the system archetypes?"
- "How do I identify a Partial Integration account?"
- "What play should I use for BASIC accounts?"
- "What script should I use for PRO under-adoption?"

**Conversion Potential:** HIGH - Static definitions and scripts

---

## 18. PRICING LEVERS

**Type:** Static pricing option definitions

**Content:**
- Freemium: When to use, InTouch signal
- Free Google: When to use, InTouch signal
- AYCE: When to use, InTouch signal
- Standard: When to use, InTouch signal
- Guardrails (12-month term, envelope calculation rules)

**Example Questions This Could Answer:**
- "When should I offer Freemium?"
- "What's the difference between Freemium and AYCE?"
- "What are the guardrails for AYCE?"

**Conversion Potential:** HIGH - Static definitions and rules

---

## 19. STRATEGIC PLAYS

**Type:** Static play definitions

**Content:**
- Fairness Play: When to use, pricing lever, InTouch trigger
- Stability Play: When to use, pricing lever, InTouch trigger
- Operational Relief Play: When to use, action, InTouch trigger

**Example Questions This Could Answer:**
- "What's the Fairness Play?"
- "When should I use Stability Play?"
- "What's the difference between plays?"

**Conversion Potential:** HIGH - Static play definitions

---

## 20. OBJECTION HANDLING SCRIPTS

**Type:** Static scripts and responses

**Content:**
- Objection 1: "It's too expensive for what we use" - Full script, diagnosis checks, play recommendation
- Objection 2: "We're paying for our own demand" - Full script, diagnosis checks, play recommendation
- Objection 3: "I can't predict what I'll owe" - Full script, diagnosis checks, play recommendation

**Example Questions This Could Answer:**
- "What do I say when they say it's too expensive?"
- "How do I respond to 'paying for our own website'?"
- "What script should I use for budget volatility complaints?"

**Conversion Potential:** HIGH - Static scripts (word-for-word responses)

---

## 21. DECISION FRAMEWORK (If/Then Rules)

**Type:** Static conditional logic rules

**Content:**
- Phase-based triggers (IF term > 90 days AND no flags → light-touch prep)
- Objection-based triggers (IF objection = "too expensive" AND System Type = Basic → Operational Relief)
- Risk triggers (IF No Bookings >30 Days = TRUE AND Status = Active → urgent churn risk)
- Stakeholder-based triggers (IF meeting with Owner → lead with fairness framing)

**Example Questions This Could Answer:**
- "What should I do if term is 60 days out with flags?"
- "How do I handle 'too expensive' for Basic accounts?"
- "What's the play for accounts with 0-Fullbook?"

**Conversion Potential:** HIGH - Static if/then rules

---

## 22. OPPORTUNITY ENGINE - LOGIC GUARDRAILS

**Type:** Static business rules

**Content:**
- The Network Rule: Network = Direct + Discovery ONLY
- The Google Rule: Google is attribution overlay, NOT part of Network
- The Benchmark Rule: Use 12-month average if no peer data
- The Status Rule: No upsells to Termination Pending or Past Due > $0
- The Ghosting Rule: Last Engaged > 90 days → Primary action = Schedule Health Check

**Example Questions This Could Answer:**
- "Can I upsell to accounts with Past Due?"
- "What should I do for accounts not engaged in 90+ days?"
- "How do I calculate Network?"

**Conversion Potential:** HIGH - Static business rules

---

## 23. OPPORTUNITY DETECTION MAPPINGS

**Type:** Static question → filter logic → play mappings

**Content:**
- "Who is under-monetized?" → Filter logic → Recommended play
- "Who should be running Ads?" → Filter logic → Recommended play
- "Who has ghosted me?" → Filter logic → Recommended play
- Multiple opportunity types with exact filter criteria

**Example Questions This Could Answer:**
- "How do I find under-monetized accounts?"
- "What filter should I use for PI opportunities?"
- "How do I identify churn risk accounts?"

**Conversion Potential:** MEDIUM - Filter logic is static, but requires data to execute (could provide guidance without executing)

---

## 24. STARTER PROMPT RESPONSE TEMPLATES

**Type:** Static response format templates

**Content:**
- "Summarize my bucket" - Required sections, table formats, calculation rules
- "Which accounts need attention?" - Alert flag definitions, table format
- "Breakdown my system mix" - Table format, percentage calculations
- "Show most important accounts" - Exclusion rules (exclude "Top" only), inclusion criteria
- "Find accounts that need PI" - PI eligibility indicators, candidate categories
- "How do I rank against the team?" - Ranking metrics explained, table formats

**Example Questions This Could Answer:**
- "What format should bucket summaries use?"
- "What accounts should be excluded from 'most important'?"
- "How do I calculate percentages for system mix?"

**Conversion Potential:** MEDIUM - Templates are static, but responses require data (could provide format guidance)

---

## 25. HANDLING LIMITATIONS GUIDANCE

**Type:** Static response patterns for edge cases

**Content:**
- Priority order: Check similar capabilities → Offer alternatives → Include learning message
- Examples of "wrong" vs "right" approaches
- How to reference Nick and the feedback pencil
- When to explain what data IS available vs what isn't

**Example Questions This Could Answer:**
- "What should I say when I can't do something?"
- "How do I handle unclear requests?"
- "What's the feedback pencil for?"

**Conversion Potential:** MEDIUM - Response patterns are static, but context-dependent

---

## 26. CAPABILITY GUIDANCE

**Type:** Static capability explanations with examples

**Content:**
- Filtering & Isolation capabilities with example prompts
- Portfolio Analysis capabilities with example prompts
- Column & View Changes capabilities with example prompts
- Metric Explanations capabilities with example prompts
- Account Data Questions capabilities with example prompts
- Workflows & How-To capabilities with example prompts

**Example Questions This Could Answer:**
- "What can you help me with?"
- "Can you filter accounts?"
- "What analysis can you do?"
- "How do I use column actions?"

**Conversion Potential:** HIGH - Static capability descriptions with example prompts

---

## 27. FREE GOOGLE DEFINITIONS & VARIANTS

**Type:** Static reference data

**Content:**
- Free Google is an Exclusive Pricing (EP) plan type where RwG covers are billed at $0
- Three variants exist: Classic Free Google, Free Google w/ Add-On, Unlimited Google Covers (UGC)
- Classic Free Google: RwG covers $0 via EP PRF/SKU, value recaptured via higher subs or PI
- Free Google w/ Add-On: RwG covers free, funded by fixed subscription add-on (DATA-13106)
- Unlimited Google Covers: Flat fee caps Google exposure, Core-only, NOT available on AYCE/Freemium/Free Google
- UGC and Free Google are mutually exclusive - cannot stack EP programs
- Free Google preserves Discovery revenue while zeroing Google-attributed covers

**Example Questions This Could Answer:**
- "What is Free Google?"
- "What's the difference between Free Google and Unlimited Google Covers?"
- "Can I use Free Google with Freemium?"
- "What are the Free Google variants?"
- "How does Free Google w/ Add-On work?"

**Conversion Potential:** HIGH - Pure definitions, no data lookups needed

---

## 28. FREE GOOGLE TIMELINE & CRITICAL DATES

**Type:** Static timeline reference

**Content:**
- January 15, 2026: Free Google Global Pricing Overhaul (FT-5081) - new bundles, targeted market logic
- January 26, 2026: Google project pricing goes live
- End of February 2026: Google's blue "Reserve a table" button rolled out widely
- March 1, 2026: Free Google restaurants get RwG blue button
- End of March 2026: All other restaurants will PAY for Google covers
- Google partnership agreement expires Jan 31, 2026; amendment covering RwG billing changes effective Feb 1

**Example Questions This Could Answer:**
- "When does Free Google launch?"
- "What's the March deadline for Free Google?"
- "When does the Google blue button roll out?"
- "What are the Free Google milestones?"
- "When do restaurants start paying for Google covers?"

**Conversion Potential:** HIGH - Static dates, no calculations

---

## 29. FREE GOOGLE ELIGIBILITY RULES

**Type:** Static eligibility checklist

**Content:**
- System Type: Core/Pro only - Basic is NOT eligible
- Term Length: 6M+ term (US independents via 2026 blanket PRF)
- Not Stackable: Cannot combine with AYCE or Freemium
- PRF Required: Individual PRF required for all Free Google offers
- Markets: US, CA, MX, UK (legacy) + expanding to LATAM, DE, IE via FT-5081/FT-5123
- If on AYCE or Freemium, neither Free Google nor UGC is available
- If term < 6 months in US without blanket PRF, requires special approval ("near impossible")

**Example Questions This Could Answer:**
- "Is this account eligible for Free Google?"
- "Can Basic accounts get Free Google?"
- "What term length is needed for Free Google?"
- "Can I use Free Google with AYCE?"
- "What markets have Free Google?"

**Conversion Potential:** HIGH - Static rules, straightforward yes/no logic

---

## 30. FREE GOOGLE COHORTS & PLAYS

**Type:** Static play definitions with scripts

**Content:**
- Cohort: Low Hanging Fruit - Sub discount > Google revenue, high sub discount, moderate Google RPR
- Cohort: PI Reinvestment - High PI spend, history of marketing, meaningful Google RPR
- Cohort: Unsecured Contracts - Contract expiring <90 days, non-auto-renew, contract risk + Google exposure
- Play 1: Discount Swap (LHF) - Trade discount for Free Google + list sub
- Play 2: PI Booster (PI Reinvestment) - Free Google in exchange for PI commitment
- Play 3: Save the At-Risk (Unsecured) - Free Google + renewal + term lock
- Script for Discount Swap: "We're retiring Google fees and normalizing your software price at a fair level"
- Script for PI Booster: "We'll stop charging for Google covers if you commit to a stronger PI program"
- Script for Save the At-Risk: "We'll relieve Google fees if we can get you into a modern contract"

**Example Questions This Could Answer:**
- "What Free Google cohorts exist?"
- "What play should I use for Low Hanging Fruit?"
- "What's the script for PI Booster?"
- "How do I use Free Google as a save play?"
- "What is the Discount Swap play?"

**Conversion Potential:** HIGH - Static play definitions with exact scripts

---

## 31. FREE GOOGLE BILLING & QA

**Type:** Static troubleshooting and QA reference

**Content:**
- Known issue: Only "Reserve a Table" button was zeroed initially; "Reservations" link was missed (2021, fixed)
- Known issue: SF bug inactivated Free Google contracts signed before May 25, 2021
- Known issue: Recent billing errors (2025) - RIDs installed Free Google but still billed
- Known issue: Experience bookings via Google billed as OTNW despite Free Google SKU (TRACK-3475)
- QA Check: Verify Free Google SKU is active in billing system
- QA Check: Cross-check Google Seated Covers vs invoiced amounts
- QA Check: Confirm no Experiences bookings being mis-billed
- QA Check: Validate PRF flags match contract terms
- QA Check: Check for UGC add-on conflicts (should not coexist with Free Google)

**Example Questions This Could Answer:**
- "Why is my Free Google account still being charged?"
- "How do I verify Free Google is working?"
- "What are the known Free Google billing issues?"
- "How do I QA a Free Google account?"
- "What should I check if Free Google billing looks wrong?"

**Conversion Potential:** HIGH - Static troubleshooting guide

---

## 32. FREE GOOGLE SIDEBAR WORKFLOW

**Type:** Static UI/navigation guidance

**Content:**
- Free Google panel location: Bucket IQ tab → Free Google accordion
- Cohort display: Grouped by priority (PI Reinvestment, Unsecured Contracts, Low Hanging Fruit, etc.)
- Each cohort shows: Priority dot, play name, account count
- Account display: RID, account name, Google RPR badge
- "Show All" button appears when cohort has more than 5 accounts
- Click an RID → copies to clipboard with strategic context toast

**Example Questions This Could Answer:**
- "Where is the Free Google panel?"
- "How do I see my Free Google accounts?"
- "How do I copy a Free Google RID?"
- "What does the priority dot mean?"
- "How are Free Google accounts organized?"

**Conversion Potential:** HIGH - Static UI guidance

---

## 33. FREE GOOGLE STRATEGY GENERATION

**Type:** Static workflow explanation

**Content:**
- Three strategy options: Quick Strategy, Full Strategy, Glean Handoff
- Quick Strategy: Local generation using cohort config, no API call, instant response
- Full Strategy: Uses askInTouchGuide() with account context for detailed analysis
- Glean Handoff: Generates pre-filled Glean research prompt and opens Glean
- Auto-detection: System recognizes Free Google RIDs pasted in chat input
- Strategy menu appears automatically when Free Google RID detected
- Quick Strategy includes: Cohort name, strategic play, recommended action, key metrics

**Example Questions This Could Answer:**
- "How do I generate a Free Google strategy?"
- "What's the difference between Quick and Full strategy?"
- "How do I use Glean for Free Google?"
- "What happens when I paste a Free Google RID?"
- "What does Quick Strategy include?"

**Conversion Potential:** HIGH - Static workflow explanation

---

## 34. BUCKET IQ TAB FEATURES

**Type:** Static feature definitions

**Content:**
- Bucket IQ is the renamed Knowledge Hub tab (v1.4.0+)
- Chat interface: Message history, input area, send button
- Data Loading Banner: Shows spinner during initial data load, displays timestamp on completion
- Refresh button: Reloads sidebar data, appears in data loaded banner
- Welcome screen: Quick action buttons for common tasks
- Free Google accordion: Collapsible panel showing cohort-grouped accounts
- Feedback system: Thumbs up/down on responses, correction input field
- Query classification: System routes to appropriate model (Flash for simple, Pro for complex)

**Example Questions This Could Answer:**
- "What is Bucket IQ?"
- "How do I refresh the sidebar data?"
- "What are the quick actions?"
- "How do I give feedback on responses?"
- "What happened to Knowledge Hub?"

**Conversion Potential:** HIGH - Static feature definitions

---

## 35. FEEDBACK SYSTEM USAGE

**Type:** Static workflow explanation

**Content:**
- Feedback location: Below each AI response in Bucket IQ tab
- Feedback options: Thumbs up (helpful), Thumbs down (unhelpful), Correction text field
- Feedback logging: All feedback sent to Central Master spreadsheet
- Admin functions: getKHFeedbackForReview() retrieves items needing review
- Export function: exportFeedbackForAI() creates JSON for Cursor optimization
- Markdown export: generateFeedbackMarkdown_() creates Cursor-compatible instructions
- Feedback loop: User feedback → Central log → Admin review → AI improvement

**Example Questions This Could Answer:**
- "How do I report a wrong answer?"
- "Where does my feedback go?"
- "How do I give feedback on AI responses?"
- "What happens to feedback I submit?"
- "How is feedback used to improve the AI?"

**Conversion Potential:** HIGH - Static workflow explanation

---

## SUMMARY BY CONVERSION PRIORITY

### HIGH PRIORITY (Pure Static Content - No Data Required)
1. Sheet Layout & Column Structure
2. Core Features & Navigation
3. Channel Hierarchy & Math Formulas
4. Metric Definitions & Interpretation
5. Terminology Mappings
6. Common Column Configurations
7. Navigation Paths Table
8. Troubleshooting Quick Fixes
9. Critical Rules
10. Value to Metric Mappings
11. Category Key Reference
12. Active PI Values
14. Strategic Playbook Framework
15. Renewal Lifecycle Phases
16. Operating Rhythm
17. System Type Archetypes
18. Pricing Levers
19. Strategic Plays
20. Objection Handling Scripts
21. Decision Framework Rules
22. Opportunity Engine Guardrails
26. Capability Guidance
27. Free Google Definitions & Variants
28. Free Google Timeline & Critical Dates
29. Free Google Eligibility Rules
30. Free Google Cohorts & Plays
31. Free Google Billing & QA
32. Free Google Sidebar Workflow
33. Free Google Strategy Generation
34. Bucket IQ Tab Features
35. Feedback System Usage

### MEDIUM PRIORITY (Static Templates/Patterns - Require Data to Execute)
13. Response Format Guidelines
23. Opportunity Detection Mappings (can provide guidance without executing)
24. Starter Prompt Response Templates (can provide format guidance)
25. Handling Limitations Guidance

---

## IMPLEMENTATION RECOMMENDATIONS

### Phase 1: Extract Pure Static Content
- Create lookup functions for column mappings, metric definitions, navigation paths
- Build response templates for troubleshooting, feature explanations
- Implement static rule checker (critical rules, guardrails)

### Phase 2: Template-Based Responses
- Create response formatters that use templates but require data injection
- Build opportunity detection guidance (explain filters without executing)
- Implement starter prompt formatters (format data into required templates)

### Phase 3: Hybrid Approach
- Use local scripted responses for static content
- Fall back to Gemini API only when:
  - User asks questions requiring account data analysis
  - User needs personalized recommendations based on their specific accounts
  - User asks open-ended strategic questions requiring reasoning

---

## ESTIMATED COVERAGE

Based on this analysis, approximately **70-80%** of common user questions could be answered with local scripted responses, significantly reducing Gemini API calls and improving response speed.
