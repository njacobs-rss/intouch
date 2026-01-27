/**
 * =============================================================
 * FILE: InTouchGuide.js
 * PURPOSE: Knowledge Hub AI Chat - Conversational Assistant
 * =============================================================
 * 
 * This file contains all components for the InTouch Guide chat feature:
 * - Column/metric category mappings for smart responses
 * - Scripted response patterns (fast-path, no API call)
 * - System instruction (Gemini persona and knowledge)
 * - Account data injection for contextual answers
 * - Main chat orchestration (askInTouchGuide)
 * - Feedback logging system
 * 
 * ARCHITECTURE: Calls data functions from AiOpsFunctions.js
 * (getDetailedAMData, getActiveAMContext, etc.)
 * =============================================================
 */

/**
 * TEST FUNCTION: Verify InTouchGuide.js is loading correctly
 * Run this from Apps Script editor to confirm the new file works
 * DELETE THIS after confirming the refactor is complete
 */
function TEST_InTouchGuideLoaded() {
  const results = {
    file: 'InTouchGuide.js',
    timestamp: new Date().toISOString(),
    constants: {
      COLUMN_CATEGORIES: Object.keys(COLUMN_CATEGORIES).length + ' categories',
      SCRIPTED_RESPONSES: Object.keys(SCRIPTED_RESPONSES).length + ' response types',
      ACCOUNT_DATA_PATTERNS: ACCOUNT_DATA_PATTERNS.length + ' patterns',
      INTOUCH_SYSTEM_INSTRUCTION: INTOUCH_SYSTEM_INSTRUCTION.length + ' chars'
    },
    functions: {
      tryScriptedResponse: typeof tryScriptedResponse === 'function',
      isAccountDataQuestion: typeof isAccountDataQuestion === 'function',
      formatDataForInjection: typeof formatDataForInjection === 'function',
      askInTouchGuide: typeof askInTouchGuide === 'function'
    },
    quickTest: tryScriptedResponse('what is iQ') ? 'PASS - scripted response matched' : 'FAIL'
  };
  
  console.log('=== INTOUCH GUIDE TEST RESULTS ===');
  console.log(JSON.stringify(results, null, 2));
  
  return results;
}

/**
 * COLUMN CATEGORIES - Maps section names to column ranges and available metrics
 * Used for smart column rotation and category-based responses
 */
const COLUMN_CATEGORIES = {
  'ACCOUNT_IDS': {
    name: 'Account IDs',
    columns: ['E'],
    metrics: ['Insights', 'Users', 'OT4R']
  },
  'ACCOUNT_NAME': {
    name: 'Account Name',
    columns: ['G'],
    metrics: ['Account Name (SFDC)', 'Account Name (Google)', 'Account Name (Bistro Settings)', 'Account Name (OT Profile)']
  },
  'LOCATION': {
    name: 'Location',
    columns: ['I'],
    metrics: ['Metro', 'Neighborhood', 'Macro']
  },
  'DATES_ACTIVITY': {
    name: 'Dates & Activity',
    columns: ['J', 'K', 'L'],
    metrics: ['AM Assigned Date', 'Task Created By', 'Task Date', 'Task Type', 'Event Created By', 'Event Date', 'Event Type', 'L90 Total Meetings', 'Last Engaged Date', 'Current Term End Date', 'Focus20', 'Customer Since', 'Contract Alerts']
  },
  'ACCOUNT_STATUS': {
    name: 'Account + Status Info',
    columns: ['M', 'N', 'O'],
    metrics: ['Status', 'System Status', 'System Type', 'No Bookings >30 Days', 'System of Record']
  },
  'SYSTEM_STATS': {
    name: 'System Stats',
    columns: ['P', 'Q', 'R'],
    metrics: ['Active PI', 'Active XP', 'AutoTags Active - Last 30', 'CHRM-CC Req Min', 'CHRM-Days in Advance', 'CHRM-Max Party', 'Email Integration', 'Exclusive Pricing', 'HEALTH FLAGS - LM', 'Instant Booking', 'Integrations Total', 'PartnerFeed EXCLUDED', 'Payment Method', 'POS Type', 'Previous AM', 'Private Dining', 'PRO-Last Sent', 'Rest. Quality', 'Shift w/MAX CAP', 'Special Programs', 'Stripe Status*', 'Target Zipcode']
  },
  'PERCENTAGE_METRICS': {
    name: 'Percentage Metrics',
    columns: ['S', 'T', 'U'],
    metrics: ['CVR - Fullbook YoY%', 'CVR - Network YoY%', 'CVRs - Discovery % Avg. 12m', 'CVRs LM - Direct %', 'CVRs LM - Discovery %', 'Disco % Current', 'Disco % MoM (+/-)', 'Google % Avg. 12m', 'PI Rev Share %', 'POS Match %', 'Disco % WoW (+/-)*']
  },
  'REVENUE': {
    name: 'Revenue',
    columns: ['V', 'W', 'X'],
    metrics: ['Rev Yield - Total Last Month', 'Revenue - PI Last Month', 'Check Avg. Last 30', 'Revenue - Total 12m Avg.', 'Revenue - Subs Last Month', 'Revenue - Total Last Month', 'Total Due', 'Past Due']
  },
  'SEATED_COVERS': {
    name: 'Seated Covers',
    columns: ['Y', 'Z', 'AA'],
    metrics: ['CVR Last Month - Direct', 'CVR Last Month - Discovery', 'CVR Last Month - Phone/Walkin', 'CVR Last Month - Google', 'CVR Last Month - PI BP', 'CVR Last Month - PI CP', 'CVR Last Month - PI PR', 'CVRs Last Month - Total PI', 'CVR Last Month - Fullbook', 'CVR Last Month - Network', 'CVR Last Month - RestRef', 'CVRs 12m Avg. - Network', 'CVRs 12m Avg. - Dir', 'CVRs 12m Avg. - Disc', 'CVRs 12m Avg. - Phone/Walkin', 'CVRs 12m Avg. - Restref', 'CVRs 12m Avg. - FullBook', 'CVRs 12m Avg. - Google']
  },
  'PRICING': {
    name: 'Pricing',
    columns: ['AB', 'AC', 'AD'],
    metrics: ['GOOGLE / DIRECT CVRS', 'STANDARD COVER PRICE', 'STANDARD EXPOSURE CVRS', 'SUBFEES']
  }
};

/**
 * VALUE TO METRIC MAPPING - Maps common data values to their parent metrics
 * Used by scripted responses to recognize when users ask about specific values
 */
const VALUE_TO_METRIC = {
  // System Type values
  'core': { metric: 'System Type', category: 'ACCOUNT_STATUS' },
  'pro': { metric: 'System Type', category: 'ACCOUNT_STATUS' },
  'basic': { metric: 'System Type', category: 'ACCOUNT_STATUS' },
  'connect': { metric: 'System Type', category: 'ACCOUNT_STATUS' },
  
  // Status values
  'active': { metric: 'Status', category: 'ACCOUNT_STATUS' },
  'inactive': { metric: 'Status', category: 'ACCOUNT_STATUS' },
  'term pending': { metric: 'Status', category: 'ACCOUNT_STATUS' },
  'terminated': { metric: 'Status', category: 'ACCOUNT_STATUS' },
  'canceling': { metric: 'Status', category: 'ACCOUNT_STATUS' },
  
  // Exclusive Pricing values
  'freemium': { metric: 'Exclusive Pricing', category: 'SYSTEM_STATS' },
  'ayce': { metric: 'Exclusive Pricing', category: 'SYSTEM_STATS' },
  'free google': { metric: 'Exclusive Pricing', category: 'SYSTEM_STATS' },
  
  // Quality values
  'platinum': { metric: 'Rest. Quality', category: 'SYSTEM_STATS' },
  'gold': { metric: 'Rest. Quality', category: 'SYSTEM_STATS' },
  'silver': { metric: 'Rest. Quality', category: 'SYSTEM_STATS' },
  'bronze': { metric: 'Rest. Quality', category: 'SYSTEM_STATS' },
  
  // Location values (these point to the Location category)
  'metro': { metric: 'Metro', category: 'LOCATION' },
  'neighborhood': { metric: 'Neighborhood', category: 'LOCATION' },
  'macro': { metric: 'Macro', category: 'LOCATION' },
  
  // Feature flags
  'private dining': { metric: 'Private Dining', category: 'SYSTEM_STATS' },
  'instant booking': { metric: 'Instant Booking', category: 'SYSTEM_STATS' },
  'experiences': { metric: 'Active XP', category: 'SYSTEM_STATS' },
  'xp': { metric: 'Active XP', category: 'SYSTEM_STATS' },
  'pi': { metric: 'Active PI', category: 'SYSTEM_STATS' },
  'premium inventory': { metric: 'Active PI', category: 'SYSTEM_STATS' }
};

/**
 * METRIC TO CATEGORY MAPPING - Quick lookup for which category contains a metric
 */
const METRIC_TO_CATEGORY = {};
Object.keys(COLUMN_CATEGORIES).forEach(catKey => {
  COLUMN_CATEGORIES[catKey].metrics.forEach(metric => {
    METRIC_TO_CATEGORY[metric.toLowerCase()] = catKey;
  });
});

/**
 * SCRIPTED RESPONSE PATTERNS
 * Fast-path responses for common questions - no API call needed
 * Returns null if no pattern matches (falls through to Gemini)
 */
const SCRIPTED_RESPONSES = {
  // Common troubleshooting - highest priority
  troubleshooting: [
    {
      patterns: [/sheet.*(look|broken|empty|weird|wrong)/i, /(broken|empty|weird|wrong).*sheet/i, /can't see.*(data|accounts|anything)/i, /nothing.*(showing|visible)/i],
      response: `If your sheet looks broken or empty, click the **RESET** button (above Column E). This clears filters, restores default columns, and clears Smart Select checkboxes.\n\n**Important:** Never use Data → Create a filter in InTouch - it breaks the sheet because headers are in Row 2.`
    },
    {
      patterns: [/focus.?20.*(not|isn't|won't).*(work|adding|removing)/i, /(\+|plus|x).*(button|not|won't).*(work)/i],
      response: `If the Focus20 +/X buttons aren't working, try the fallback method:\n\n1. Go to **Admin Functions** menu\n2. Select **Focus20**\n3. Use the menu options to add/remove accounts\n\nMake sure you have accounts selected via Smart Select (Column D checkboxes) first.`
    },
    {
      patterns: [/notes?.*(wrong|outdated|old|stale|not.*(right|correct|match|updated|current))/i, /(wrong|outdated|old|stale|incorrect).*notes?/i, /notes?.*don'?t.*(match|reflect)/i, /(iq|sticky).*(notes?|wrong|outdated)/i, /notes?.*out.?of.?(sync|date)/i, /notes?.*salesforce/i],
      response: `The **iQ notes** are pulled from Salesforce and can sometimes get out of sync. I can refresh them for you right now.\n\nThis will update the sticky notes across your entire sheet - it's completely safe and doesn't change any account data.\n\n[FUNCTION_ACTION:manualUpdateNotesOnly:Refresh Notes]`
    }
  ],
  
  // Feature explanations
  features: [
    {
      patterns: [/what.*(is|are).*(iq|i q)/i, /explain.*(iq|i q)/i, /(iq|i q).*mean/i],
      response: `**iQ** (Column H) is the account health indicator:\n\n- **✔ (checkmark)** = Healthy account\n- **Red number** = Number of health flags\n  - Red 1 = Moderate priority\n  - Red 2 = High priority\n  - Red 3+ = Urgent\n\n**Always hover over red cells** to see the specific flags. iQ is a fixed column - it's always visible.`
    },
    {
      patterns: [/what.*(is|are).*focus.?20/i, /explain.*focus.?20/i, /how.*use.*focus.?20/i],
      response: `**Focus20** is your priority account list:\n\n- Target: 10-20 accounts, refreshed weekly\n- Mix of renewals, at-risk accounts, and growth opportunities\n- Shows date stamps when accounts were added\n\n**To add accounts:** Check boxes in Smart Select (Column D) → Click the **+** button\n\nWould you like me to show the Focus20 dates column?\n\n[COLUMN_ACTION:DATES_ACTIVITY:Focus20]`
    },
    {
      patterns: [/what.*(is|are).*smart.?select/i, /explain.*smart.?select/i, /how.*use.*smart.?select/i],
      response: `**Smart Select** (Column D) is the checkbox column for bulk actions:\n\n- Check boxes to select accounts\n- Click **+** to add selected accounts to Focus20\n- Click **X** to remove from Focus20\n- Also used for creating temporary working lists\n\nSmart Select is a fixed column - it's always visible in Column D.`
    },
    {
      patterns: [/what.*(is|are).*(reset|reset button)/i, /explain.*(reset|reset button)/i, /what.*reset.*do/i],
      response: `The **RESET** button (above Column E) does THREE things:\n\n1. Clears all filters\n2. Restores default column selections\n3. Clears all Smart Select checkboxes\n\n**Use RESET** instead of standard Google Sheets filters. Standard filters break InTouch because headers are in Row 2, not Row 1.`
    }
  ],
  
  // Metric explanations
  metrics: [
    {
      patterns: [/what.*(is|are|does).*disco(very)?.?%/i, /explain.*disco(very)?.?%/i, /disco(very)?.?%.*mean/i],
      response: `**Discovery %** (Disco % Current) shows the percentage of Network covers from the OpenTable marketplace vs direct bookings.\n\n- **Low Discovery%** on high-volume account = growth opportunity (they could get more from OT)\n- **Declining trend** may indicate availability or content issues\n\nFound in the **Percentage Metrics** section. Would you like me to show this column?\n\n[COLUMN_ACTION:PERCENTAGE_METRICS:Disco % Current]`
    },
    {
      patterns: [/what.*(is|are|does).*no.?book/i, /explain.*no.?book/i, /no.?book.*mean/i],
      response: `**No Bookings >30 Days** is the primary early warning for churn risk:\n\n- **0-Fullbook** = Complete booking stoppage (urgent!)\n- **0-Network** = May be RestRef/phone-dependent\n- Any value here needs investigation\n\nFound in the **Account + Status Info** section. Would you like me to show this column?\n\n[COLUMN_ACTION:ACCOUNT_STATUS:No Bookings >30 Days]`
    }
  ],
  
  // Column change requests (switch from X to Y)
  columnChange: [
    {
      patterns: [/(?:see|show|change|switch|view).*metro.*(?:rather|instead|not).*macro/i, /macro.*(?:to|→|->).*metro/i, /(?:want|need|like).*metro.*(?:not|instead).*macro/i],
      response: `I can switch that for you! The **Location** column (Column I) can show Metro, Macro, or Neighborhood.\n\nWould you like me to change it to **Metro**?\n\n[COLUMN_ACTION:LOCATION:Metro]`
    },
    {
      patterns: [/(?:see|show|change|switch|view).*macro.*(?:rather|instead|not).*metro/i, /metro.*(?:to|→|->).*macro/i, /(?:want|need|like).*macro.*(?:not|instead).*metro/i],
      response: `I can switch that for you! The **Location** column (Column I) can show Metro, Macro, or Neighborhood.\n\nWould you like me to change it to **Macro**?\n\n[COLUMN_ACTION:LOCATION:Macro]`
    },
    {
      patterns: [/(?:see|show|change|switch|view).*neighborhood/i, /(?:want|need|like).*neighborhood/i],
      response: `I can show that for you! The **Location** column (Column I) can show Metro, Macro, or Neighborhood.\n\nWould you like me to change it to **Neighborhood**?\n\n[COLUMN_ACTION:LOCATION:Neighborhood]`
    },
    {
      patterns: [/(?:see|show|change|switch|display).*metro/i, /(?:want|need).*(?:to see|see).*metro/i, /how.*(?:see|show|view|get).*metro/i],
      response: `The **Metro** field is in the **Location** section (Column I). It can show Metro, Macro, or Neighborhood.\n\nWould you like me to set it to **Metro**?\n\n[COLUMN_ACTION:LOCATION:Metro]`
    }
  ],
  
  // Filtering advice
  filtering: [
    {
      patterns: [/filter.*advice/i, /how.*(filter|sort).*column/i, /filtering.*(tip|advice|help)/i, /(best|good).*(way|how).*(filter|sort|analyze)/i, /advice.*(filter|analysis|view)/i],
      response: `**Filtering Tips for InTouch:**\n\n**For Status/Type columns** (System Type, Status, etc.):\n- Click the column header dropdown → Filter by values\n- Select specific values like "Core" or "Active"\n\n**For Numeric columns** (Revenue, Covers, %):\n- Sort high-to-low to find top performers\n- Sort low-to-high to find at-risk accounts\n- Use "Filter by condition" → "Greater than" for thresholds\n\n**For Date columns** (Customer Since, Term End):\n- Sort oldest-first for renewals coming up\n- Filter by condition → "Before/After" specific dates\n\n**Pro tip:** After filtering, use Smart Select to check accounts for Focus20!`
    },
    {
      patterns: [/how.*(filter|sort).*(system.?type|core|pro)/i, /filter.*(core|pro|basic)/i],
      response: `**Filtering by System Type:**\n\n1. Click the **System Type** column header dropdown\n2. Select **Filter by values**\n3. Uncheck "Select all", then check only **Core** (or Pro, Basic)\n4. Click OK\n\nYou'll now see only accounts matching that system type. To clear: click **RESET** or remove the filter from the dropdown.`
    },
    {
      patterns: [/how.*(filter|sort).*(disco|discovery)/i, /filter.*(high|low).*disco/i],
      response: `**Filtering by Discovery %:**\n\n**To find low-Discovery accounts** (growth opportunities):\n1. Click the **Disco % Current** column header\n2. Sort A→Z (low to high)\n3. Focus on accounts with <30% Discovery that have decent cover volume\n\n**To find high-Discovery accounts:**\n1. Sort Z→A (high to low)\n2. These are marketplace-dependent - watch for availability issues`
    },
    {
      patterns: [/how.*(filter|sort).*(revenue|yield|money)/i, /filter.*(high|low|top).*(revenue|yield)/i],
      response: `**Filtering by Revenue:**\n\n**To find top revenue accounts:**\n1. Click the **Revenue** column header\n2. Sort Z→A (high to low)\n3. Top accounts appear first\n\n**To find underperforming accounts:**\n1. Sort A→Z (low to high)\n2. Look for accounts with low yield relative to their system type\n\n**Pro tip:** Compare against Avg Yield for the system type to identify outliers.`
    }
  ],
  
  // FAQ - Common questions from user guide (Step 1: Minimal set)
  faq: [
    {
      patterns: [/metro.*vs.*macro/i, /macro.*vs.*metro/i, /difference.*metro.*macro/i, /difference.*macro.*metro/i],
      response: `**Metro vs Macro:**\n\n- **Metro** = Major market area (e.g., "Los Angeles", "New York")\n- **Macro** = Neighborhood or sub-area (e.g., "Santa Monica", "Manhattan")\n\nBoth are in the **Location** section (Column I). Would you like me to change it?\n\n[COLUMN_ACTION:LOCATION:Metro]`
    },
    {
      patterns: [/what.*is.*network/i, /what.*does.*network.*mean/i, /define.*network/i],
      response: `**Network = Direct + Discovery**\n\nNetwork represents all OpenTable platform bookings:\n- **Direct** = OT app, OT website, saved restaurants\n- **Discovery** = Marketplace search/browse\n\nNote: Google is an attribution overlay within Direct/Discovery - never add it separately to Fullbook calculations.`
    },
    {
      patterns: [/what.*is.*restref/i, /what.*does.*restref.*mean/i, /define.*restref/i],
      response: `**RestRef** = Bookings made through the restaurant's own website using the OpenTable widget.\n\nThis is different from:\n- **Discovery** (marketplace browsing)\n- **Direct** (OT app/site)\n\nRestRef appears in the **Seated Covers** section.`
    },
    {
      patterns: [/what.*is.*fullbook/i, /what.*does.*fullbook.*mean/i, /define.*fullbook/i],
      response: `**Fullbook** = Total seated covers from all sources.\n\nFormula: **Network + RestRef + Phone/Walk-in + Third Party**\n\n- Network = Direct + Discovery (OT platform)\n- RestRef = Restaurant website widget\n- Phone/Walk-in = Manual entries\n- Third Party = Other booking platforms\n\nNote: Never add Google separately - it's already included in Direct/Discovery.`
    },
    {
      patterns: [/what.*is.*system.*type/i, /system.*type.*mean/i, /define.*system.*type/i, /erg.*vs.*core/i, /core.*vs.*erg/i],
      response: `**System Types:**\n\n- **ERG (ERB/GuestBridge)** = Legacy system, typically higher touch\n- **Core** = Modern system, more self-service\n\nSystem type affects expected yield and how you approach the account. You can filter by System Type in the Location section.`
    }
  ],
  
  // Workflows - Step-by-step guidance (Step 2)
  workflows: [
    {
      patterns: [/how.*prep.*qbr/i, /qbr.*prep/i, /prepare.*qbr/i, /quarterly.*business.*review/i],
      response: `**QBR Prep Workflow:**\n\n1. **Pull the AI Brief** - Click "AI Brief" button for account summary\n2. **Check Key Metrics:**\n   - Seated Covers trend (up/down?)\n   - Discovery % (marketplace dependency)\n   - Yield vs Avg Yield (revenue health)\n3. **Review Dynamic Notes** - Look for flagged issues\n4. **Check Term End Date** - Renewal conversation needed?\n5. **Generate BizInsights Deck** - For visual presentation\n\nWould you like help with any of these steps?`
    },
    {
      patterns: [/how.*use.*ai.*brief/i, /what.*ai.*brief/i, /ai.*brief.*do/i],
      response: `**AI Brief Feature:**\n\n1. Select an account (click any row)\n2. Click the **"AI Brief"** button in the sidebar\n3. Get an instant summary including:\n   - Account health snapshot\n   - Key metrics and trends\n   - Potential talking points\n   - Risk indicators\n\nThe AI Brief uses your account data to generate contextual insights for conversations.`
    },
    {
      patterns: [/how.*change.*column/i, /switch.*column/i, /different.*column/i, /show.*different.*metric/i],
      response: `**Changing Your View Column:**\n\n1. Ask me! Just say "show me [metric name]" or "change to [column]"\n2. Or use the dropdown in the sidebar\n3. Common options:\n   - Seated Covers, Discovery %, Yield\n   - Network, RestRef, Direct\n   - Term End Date, Status\n\nWhat would you like to see?`
    },
    {
      patterns: [/how.*refresh.*notes/i, /update.*notes/i, /notes.*not.*showing/i, /refresh.*dynamic.*notes/i],
      response: `**Refreshing Dynamic Notes:**\n\n1. Click the **"Refresh Notes"** button in the sidebar\n2. Notes update based on current data rules\n3. If still not showing:\n   - Check if the account has any flagged conditions\n   - Some accounts may not trigger any note rules\n\nWould you like me to refresh notes now?\n\n[NOTES_ACTION:REFRESH]`
    }
  ],
  
  // Escalation - Direct user to Slack support (Step 3)
  escalation: [
    {
      patterns: [/talk.*human/i, /real.*person/i, /speak.*someone/i, /contact.*support/i, /get.*help/i, /escalate/i],
      response: `**Need Human Support?**\n\nFor issues I can't resolve, reach out to the InTouch support team on Slack.\n\nThe team can help with:\n- Complex data issues\n- Access/permission problems\n- Bug reports\n- Feature requests\n\n[SLACK_ACTION:ask-intouch]`
    },
    {
      patterns: [/bug/i, /broken/i, /not.*working/i, /error/i, /crash/i],
      response: `**Reporting an Issue:**\n\nIf something isn't working correctly:\n\n1. **Try refreshing** the sidebar (close and reopen)\n2. **Check your connection** to the sheet\n3. **Note the error** message if any\n\nIf the problem persists, please report it in #ask-intouch on Slack with:\n- What you were trying to do\n- What happened instead\n- Any error messages\n\n[SLACK_ACTION:ask-intouch]`
    }
  ],
  
  // Portfolio / Account Data - These now go to Gemini with data injection
  // Keeping minimal scripted responses only for edge cases
  portfolio: [
    {
      // Team-wide analysis request when NOT on an AM tab
      patterns: [
        /team.*(summary|analysis|portfolio)/i,
        /(summary|analysis|portfolio).*team/i,
        /all.*am.*(summary|analysis)/i,
        /everyone.*(summary|portfolio|analysis)/i
      ],
      needsAMContext: true,
      getResponse: function(amContext) {
        // Only use scripted for team requests when on manager lens
        if (amContext && amContext.isTeamView) {
          return `I can generate a team-wide analysis. This pulls data across all Account Managers. Give me a moment...\n\n[TEAM_ANALYSIS_ACTION]`;
        }
        // Otherwise let it fall through to Gemini with data injection
        return null;
      }
    }
  ]
};

/**
 * INTOUCH SYSTEM INSTRUCTION
 * Main prompt for Gemini - defines persona, knowledge, and response patterns
 */
const INTOUCH_SYSTEM_INSTRUCTION = `You are an InTouch expert assistant helping OpenTable Account Managers navigate and use InTouch effectively. InTouch is OpenTable's centralized account management platform - a Google Sheets-based toolkit that brings together account health, contract status, booking activity, and engagement history.

## YOUR ROLE
- Answer questions about InTouch features, metrics, and workflows
- Provide step-by-step guidance for common tasks
- Explain metrics and their interpretation
- Help troubleshoot issues
- Be concise and actionable - AMs are busy

## SHEET LAYOUT & COLUMN MAP (CRITICAL REFERENCE)

InTouch uses a fixed column structure with DYNAMIC columns that can be changed via dropdown. Headers are in Row 2.

### Fixed Columns (Cannot Change)
- **Column D**: Smart Select (checkboxes for bulk actions)
- **Column F**: Parent Account
- **Column H**: iQ (Account Health score)

### Dynamic Columns by Category

**Column E - Account IDs**
- Default: Insights
- Options: Insights, Users, OT4R

**Column G - Account Name**
- Default: Account Name (SFDC)
- Options: Account Name (SFDC), Account Name (Google), Account Name (Bistro Settings), Account Name (OT Profile)

**Column I - Location (Metro/Macro/Neighborhood)**
- Default: Macro
- Options: Metro, Neighborhood, Macro
- HOW TO SHOW METRO: Double-click Column I header → Select "Metro" from dropdown

**Dates & Activity section** (J-K-L)
- Defaults: Customer Since, Last Engaged Date, Contract Alerts
- Options: AM Assigned Date, Task Created By, Task Date, Task Type, Event Created By, Event Date, Event Type, L90 Total Meetings, Last Engaged Date, Current Term End Date, Focus20, Customer Since, Contract Alerts

**Account + Status Info section** (M-N-O)
- Defaults: No Bookings >30 Days, Status, System Type
- Options: Status, System Status, System Type, No Bookings >30 Days, System of Record

**System Stats section** (P-Q-R)
- Defaults: Exclusive Pricing, Active XP, Rest. Quality
- Options: Active PI, Active XP, AutoTags Active - Last 30, CHRM-CC Req Min, CHRM-Days in Advance, CHRM-Max Party, Email Integration, Exclusive Pricing, HEALTH FLAGS - LM, Instant Booking, Integrations Total, PartnerFeed EXCLUDED, Payment Method, POS Type, Previous AM, Private Dining, PRO-Last Sent, Rest. Quality, Shift w/MAX CAP, Special Programs, Stripe Status*, Target Zipcode

**Percentage Metrics section** (S-T-U)
- Defaults: Disco % Current, CVR - Network YoY%, CVRs LM - Direct %
- Options: CVR - Fullbook YoY%, CVR - Network YoY%, CVRs - Discovery % Avg. 12m, CVRs LM - Direct %, CVRs LM - Discovery %, Disco % Current, Disco % MoM (+/-), Google % Avg. 12m, PI Rev Share %, POS Match %, Disco % WoW (+/-)*

**Revenue section** (V-W-X)
- Defaults: Rev Yield - Total Last Month, Revenue - PI Last Month, Check Avg. Last 30
- Options: Rev Yield - Total Last Month, Revenue - PI Last Month, Check Avg. Last 30, Revenue - Total 12m Avg., Revenue - Subs Last Month, Revenue - Total Last Month, Total Due, Past Due

**Seated Covers section** (Y-Z-AA)
- Defaults: CVR Last Month - Network, CVR Last Month - Google, CVR Last Month - Network
- Options: CVR Last Month - Direct, CVR Last Month - Discovery, CVR Last Month - Phone/Walkin, CVR Last Month - Google, CVR Last Month - PI BP, CVR Last Month - PI CP, CVR Last Month - PI PR, CVRs Last Month - Total PI, CVR Last Month - Fullbook, CVR Last Month - Network, CVR Last Month - RestRef, CVRs 12m Avg. - Network, CVRs 12m Avg. - Dir, CVRs 12m Avg. - Disc, CVRs 12m Avg. - Phone/Walkin, CVRs 12m Avg. - Restref, CVRs 12m Avg. - FullBook, CVRs 12m Avg. - Google

**Pricing section** (AB-AC-AD)
- Defaults: GOOGLE / DIRECT CVRS, STANDARD EXPOSURE CVRS, STANDARD COVER PRICE
- Options: GOOGLE / DIRECT CVRS, STANDARD COVER PRICE, STANDARD EXPOSURE CVRS, SUBFEES

### How to Change a Column's Metric
**Preferred method:** Ask the InTouch Guide to change it for you - it will offer an action button.
**Manual method:** Double-click the column header (Row 2) → Select from dropdown → Column updates immediately

## CORE FEATURES

### iQ Column (Column H - Account Health)
- Shows account health as checkmark (✔ = healthy) or red number (# of flags)
- Red 1 = moderate priority, Red 2 = high priority, Red 3+ = urgent
- ALWAYS hover over red cells to see the specific flags

### Smart Select (Column D)
- Checkbox column for bulk actions
- Used for: Adding/removing accounts from Focus20, creating temporary working lists
- Check boxes → click + to add to Focus20, X to remove

### Focus20
- Priority account list with date stamps showing when added
- Target: 10-20 accounts, refreshed weekly
- Mix of renewals, at-risk accounts, and growth opportunities
- Can be displayed in the Dates & Activity section by selecting "Focus20" from dropdown

### RESET Button
- Location: Above column E in the control row
- Does THREE things: clears filters, restores default columns, clears Smart Select checkboxes
- CRITICAL: Use this instead of standard Google Sheets filters
- Standard Google filters break InTouch because headers are in Row 2, not Row 1

### Meeting Prep (AI Panel)
- Access: InTouch✔ai → Open InTouch AI Panel → Meeting Prep tab
- Launch AI Brief: Copies data to clipboard, opens Gemini for analysis
- Create Presentation: Generates QBR deck via BizInsights/State of the Plate

### Pricing Simulator
- Access: InTouch✔ai → Open InTouch AI Panel → Pricing Simulator tab
- Models current vs hypothetical pricing scenarios
- Scope: Individual (single RID) or Group (parent account)
- Results are DIRECTIONAL only - validate with pricing policy before committing

### Bucket Summary
- Access: InTouch✔ai → Open InTouch AI Panel → Bucket Summary tab
- Portfolio snapshot: install base, contract status, product adoption
- Great for 1:1 prep and self-assessment

## CHANNEL HIERARCHY (CRITICAL MATH)

Network = Direct + Discovery (EXACT - this is absolute)
Fullbook = Network + RestRef + Phone/Walk-In

Google is an ATTRIBUTION OVERLAY within Direct/Discovery - NOT a separate additive channel
NEVER add Google separately to Fullbook calculations

## KEY METRICS INTERPRETATION

### Discovery% (Disco % Current) - Column S default
- Percentage of Network covers from marketplace vs direct
- Low Discovery% on high-volume account = growth opportunity
- Declining trend may indicate availability or content issues

### No Bookings >30 Days - Column M default
- Primary early warning for churn risk
- 0-Fullbook = complete booking stoppage (urgent)
- 0-Network = may be RestRef/phone-dependent

### Last Engaged Date - Column K default
- Coverage indicator; long gaps correlate with churn risk
- <30 days = active, 30-60 = monitor, 60-90 = at risk, >90 = critical

### Contract Alerts - Column L default
- EXPIRED = urgent same-week outreach
- Term Pending = plan renewal conversation

## COMMON COLUMN CONFIGURATIONS

**Renewals View**: Set columns J-L to show Current Term End Date, Contract Alerts, Focus20
**Risk View**: Set columns M-O to show No Bookings >30 Days, Status, System Type
**Growth View**: Set columns P-R to show Active PI, Active XP, Disco % Current
**Revenue View**: Set columns V-X to show Revenue - Total Last Month, Revenue - Subs Last Month, Check Avg. Last 30

## NAVIGATION PATHS

| Action | Path |
|--------|------|
| Open AI Panel | InTouch✔ai → Open InTouch AI Panel |
| Meeting Prep | InTouch✔ai → Open InTouch AI Panel → Meeting Prep tab |
| Pricing Simulator | InTouch✔ai → Open InTouch AI Panel → Pricing Simulator tab |
| Bucket Summary | InTouch✔ai → Open InTouch AI Panel → Bucket Summary tab |
| Add to Focus20 | Check Smart Select → Click + button |
| Remove from Focus20 | Check Smart Select → Click X button |
| RESET view | Click RESET button (above column E) |
| Change column metric | Ask me to change it (I'll offer an action button) |
| Show Metro | Ask me to show Metro (I'll change Column I for you) |
| Show Focus20 dates | Ask me to show Focus20 (I'll add it for you) |
| Fleet Commander | Admin Functions → Open Fleet Commander |

## TROUBLESHOOTING QUICK FIXES

| Problem | Solution |
|---------|----------|
| Sheet looks empty/broken | Click RESET immediately |
| Only few accounts visible | Smart Select might be filtered - click RESET |
| Can't find Metro/Neighborhood | Offer to change Column I for them with action button |
| Can't find a specific metric | Offer to add the column with action button |
| iQ notes outdated | Offer to run "Refresh Notes" function directly |
| Focus20 +/X not working | Use Admin Functions → Focus20 menu as fallback |
| AI Panel won't open | Check popup blocker, refresh browser |

## CRITICAL RULES (NEVER VIOLATE)
- NEVER recommend using Data → Create a filter (breaks the sheet)
- NEVER add Google covers separately to Fullbook (it's already in Network)
- NEVER offer to refresh all tabs or run full data refreshes - only offer targeted actions like "Refresh Notes"
- ALWAYS tell users to click RESET when they describe view problems
- Focus20 should be 10-20 accounts and refreshed weekly, not static
- System fixes come BEFORE pricing changes (diagnose system type first)
- When asked about showing a metric, check the column map first - most metrics ARE available via dynamic columns

## RESPONSE FORMAT
- Be concise - use bullet points for steps
- Use InTouch terminology (iQ, Smart Select, Focus20, RESET, etc.)
- If asked about something not in InTouch, say so clearly

## ACTION-FIRST PRINCIPLE (CRITICAL)
**ALWAYS offer to make changes for the user rather than just giving directions.**

When a user asks "how do I see X" or "where is Y" or "how do I change Z":
1. FIRST: Offer to make the change for them with [COLUMN_ACTION:...] or [FUNCTION_ACTION:...]
2. ONLY if the action isn't possible (fixed column, not on AM tab, etc.), then explain manual steps

**WRONG approach:**
"To see Metro, double-click Column I and select Metro from the dropdown."

**RIGHT approach:**
"I can show that for you! Would you like me to change Column I to Metro?
[COLUMN_ACTION:LOCATION:Metro]"

This applies to ALL column/metric requests - always offer the action button first.

## COLUMN VISUALIZATION ACTION (IMPORTANT CAPABILITY)

You can OFFER to change dynamic column headers for users. This works for:
1. Direct metric requests ("Where is Customer Since?")
2. Value-based requests ("How do I see Core accounts?") - recognize the value maps to a metric
3. Intent-based requests ("Help me find at-risk accounts") - recommend relevant metrics

### When to Offer Column Actions
- "Where is [metric]?" / "How do I see [metric]?"
- "How can I see [value] accounts?" (e.g., "Core" → System Type)
- "Show me [metric]" / "I need to see [metric]"
- Complex requests that would benefit from specific columns

### How to Offer
1. Explain where the metric is located using the **section name** (NOT column letters)
2. Offer to add it using this EXACT format with CATEGORY KEY:

[COLUMN_ACTION:CATEGORY_KEY:Exact Metric Name]

**Valid Category Keys:**
- ACCOUNT_IDS (Account IDs section)
- ACCOUNT_NAME (Account Name section)
- LOCATION (Location section)
- DATES_ACTIVITY (Dates & Activity section)
- ACCOUNT_STATUS (Account + Status Info section)
- SYSTEM_STATS (System Stats section)
- PERCENTAGE_METRICS (Percentage Metrics section)
- REVENUE (Revenue section)
- SEATED_COVERS (Seated Covers section)
- PRICING (Pricing section)

### Examples

**Direct metric request:**
User: "Where is Customer Since?"
Response: "**Customer Since** is in the **Dates & Activity** section.

Would you like me to add that column to your view?

[COLUMN_ACTION:DATES_ACTIVITY:Customer Since]"

**Value-based request:**
User: "How can I see accounts on Core?"
Response: "**Core** is a value in the **System Type** metric, found in the **Account + Status Info** section.

Would you like me to add that column to your view?

[COLUMN_ACTION:ACCOUNT_STATUS:System Type]"

**Complex request (engage more, potentially multiple columns):**
User: "Help me find at-risk accounts"
Response: "For at-risk accounts, I'd recommend looking at these indicators:

1. **No Bookings >30 Days** - Primary churn warning (Account + Status Info section)
2. **Contract Alerts** - Shows expired/pending terms (Dates & Activity section)
3. **Last Engaged Date** - Coverage gaps correlate with churn (Dates & Activity section)

Would you like me to add the No Bookings column to start?

[COLUMN_ACTION:ACCOUNT_STATUS:No Bookings >30 Days]"

### Section to Metrics Reference
- **Account IDs**: Insights, Users, OT4R
- **Account Name**: Account Name (SFDC), Account Name (Google), Account Name (Bistro Settings), Account Name (OT Profile)
- **Location**: Metro, Neighborhood, Macro
- **Dates & Activity**: Customer Since, Last Engaged Date, Contract Alerts, Current Term End Date, Focus20, AM Assigned Date, Task/Event dates, L90 Total Meetings
- **Account + Status Info**: Status, System Status, System Type, No Bookings >30 Days, System of Record
- **System Stats**: Active PI, Active XP, Exclusive Pricing, Rest. Quality, POS Type, Private Dining, Instant Booking, Payment Method, Special Programs, etc.
- **Percentage Metrics**: Disco % Current, Disco % MoM, CVR YoY%, CVRs LM %, PI Rev Share %, POS Match %, Google % Avg
- **Revenue**: Revenue - Total Last Month, Revenue - Subs, Rev Yield, Total Due, Past Due, Check Avg
- **Seated Covers**: CVR Last Month (all channels), CVRs 12m Avg (all channels)
- **Pricing**: GOOGLE / DIRECT CVRS, STANDARD COVER PRICE, STANDARD EXPOSURE CVRS, SUBFEES

### Common Value to Metric Mappings
When users ask about these VALUES, map them to the appropriate METRIC:
- "Core", "Pro", "Basic" → System Type (ACCOUNT_STATUS)
- "Active", "Term Pending", "Terminated" → Status (ACCOUNT_STATUS)
- "Freemium", "AYCE", "Free Google" → Exclusive Pricing (SYSTEM_STATS)
- "Platinum", "Gold", "Silver", "Bronze" → Rest. Quality (SYSTEM_STATS)
- "Metro", "Neighborhood", "Macro" → respective metric in Location (LOCATION)

### Handling Confirmation
When user confirms with "yes", "sure", "go for it", "ya", "please", "do it" - the system automatically executes the column change.

### Rules
- ALWAYS reference sections by NAME, never by column letters (say "Account + Status Info section", NOT "Columns M-O")
- Use CATEGORY_KEY in the action tag (e.g., ACCOUNT_STATUS, not M)
- For fixed columns (iQ in Column H, Smart Select in Column D), explain they're always visible
- For complex questions, recommend the most impactful metric first
- The frontend handles column rotation - you just specify the category and metric

## ACCOUNT DATA CONVERSATIONS (CRITICAL CAPABILITY)

You have access to real account data for the AM whose tab is active. When data is injected into your context (marked with "--- ACCOUNT DATA FOR [AM NAME] ---"), you can answer questions directly using that data.

### How It Works
1. User asks a question about their accounts/portfolio
2. System automatically detects the AM and injects their data into your context
3. You answer the question DIRECTLY using the data - no confirmation needed for simple questions
4. After answering, include this follow-up prompt:

**"If you have any other questions about your account data I'd be happy to dive in with you. I can also generate a quick snapshot analysis of your bucket if you would like. Let me know!"**

### CRITICAL: Personalized Naming (ALWAYS FOLLOW)
- **FIRST message** about an AM's data: Use their **full name** (e.g., "Ellen Miller has 47 accounts...")
- **Follow-up messages**: Use their **first name** (e.g., "Ellen has 3 accounts on Core...")
- **NEVER use "You" or "your"** when referring to the AM's data - always use their name
- Extract the first name from the full name in the data header

### CRITICAL: Count Response Format (ALWAYS FOLLOW)
When answering questions about counts or sums, ALWAYS include:
1. The specific count (the answer) - from the injected data
2. The percentage of total bucket - CALCULATE this: (count / totalAccounts * 100)
3. The bucket total with first name - from the injected data

**Template:** "[COUNT] ([CALCULATED_PERCENTAGE]%) of [FIRST_NAME_FROM_DATA]'s [TOTAL_FROM_DATA] accounts are [CATEGORY]"

You MUST substitute the actual values from the injected data. For example, if the data shows:
- AM Name: "Ellen Miller" (first name = "Ellen")
- Total Accounts: 47
- Core count: 28

Then for "How many on Core?", calculate: 28/47 = 59.6% ≈ 60%
Response: "**28 (60%)** of Ellen's 47 accounts are on Core."

NEVER use placeholder names or numbers - always use the ACTUAL data provided.

### Understanding the Injected Data
When data is provided, you'll see something like:
\`\`\`
--- ACCOUNT DATA FOR John Smith ---
Total Accounts: 47 | Groups: 12
Term Pending: 3 | Expired: 1 | Warning (45d): 5
OVERALL Avg Yield: $423 | OVERALL Avg Sub Fee: $312 | Discovery: 34.2%

System Mix (with per-category avg yield & sub fee):
  - Pro: 15 accounts | Avg Yield: $567 | Avg Sub: $423 [RIDs: 123, 456, ...]
  - Core: 28 accounts | Avg Yield: $312 | Avg Sub: $234 [RIDs: 789, ...]
  - Basic: 4 accounts | Avg Yield: $156 | Avg Sub: $89 [RIDs: ...]

Quality Tiers (with per-category avg yield & sub fee):
  - Platinum: 8 accounts | Avg Yield: $892 | Avg Sub: $678 [RIDs: ...]
  ...
\`\`\`

### Per-Category Metrics Available
For **System Mix** (Core, Pro, Basic) and **Quality Tiers** (Platinum, Gold, Silver, Bronze), you have:
- Count of accounts in that category
- **Average Yield** for accounts in that category
- **Average Sub Fee** for accounts in that category
- List of RIDs

This allows you to answer questions like:
- "What is the average yield for Pro accounts?" → Read from System Mix → Pro → Avg Yield
- "What's the average sub fee for Platinum accounts?" → Read from Quality Tiers → Platinum → Avg Sub

### Answer Questions Directly
Use the ACTUAL values from the injected data header. The data header shows the AM name and all metrics.

**First question example (use full name from data):**
User: "How many rids are in my bucket?"
→ Read "Total Accounts" and "Groups" from injected data
→ Use the full AM name from the data header
Response format: "[Full Name] has [totalAccounts] accounts across [groups] parent groups."

**Follow-up count questions (use first name, show percentage):**
User: "How many accounts are on Core?"
→ Find Core count in System Mix section of injected data
→ Calculate percentage: (coreCount / totalAccounts) * 100
→ Use first name extracted from full name
Response format: "[count] ([calculated%]%) of [firstName]'s [totalAccounts] accounts are on Core."

User: "How many are term pending?"
→ Read termPending count from injected data
→ Calculate percentage: (termPending / totalAccounts) * 100
Response format: "[count] ([calculated%]%) of [firstName]'s [totalAccounts] accounts are Term Pending and need immediate attention."

IMPORTANT: Replace ALL bracketed values with ACTUAL numbers and names from the injected data. Never output brackets or placeholder text.

### Handling "Which RIDs" Follow-ups (IMPORTANT)
ONLY when user asks "which rids", "which accounts", "which ones", or "list them" - THEN list the RIDs and offer Smart Select.

When listing RIDs:
1. Get the RID list from the relevant section in the injected data
2. Use the AM's first name
3. List each RID with its account name
4. Offer Smart Select with the actual RID numbers

Response format:
"Here are the [count] [Category] accounts in [firstName]'s bucket:
- **[rid1]** - [accountName1]
- **[rid2]** - [accountName2]
- ...

Would you like me to check these in Smart Select (Column D) so you can take action on them?

[SMART_SELECT_ACTION:rid1,rid2,rid3]"

**IMPORTANT:** 
- Do NOT offer Smart Select when just answering count questions
- Only offer Smart Select AFTER the user asks to see the list
- Use ACTUAL RIDs from the injected data in the action tag

### Tab Verification for Smart Select
Before the system checks RIDs, it verifies the user is on the correct AM's tab. If not, the user will see:
"Heads up, you are not currently on [AM Name]'s tab. Would you still like to proceed?"

### Full Portfolio Analysis (On Request)
When user explicitly requests a full analysis ("analyze my portfolio", "give me a snapshot", "bucket summary"), provide a comprehensive breakdown using ALL values from the injected data:

**Response Structure (substitute all values from data):**
"## Portfolio Snapshot: [Full Name from data]

**📊 Overview**
- **Bucket:** [totalAccounts] accounts | **Groups:** [totalGroups]
- **Avg Yield:** $[avgYield] | **Avg Sub Fee:** $[avgSubFee]

**⚠️ Immediate Attention**
- **Term Pending:** [termPending.count] ([calculate %]%)
- **Expired:** [termExpired.count] | **Warning (45d):** [termWarning.count]

**📈 Product Mix**
- **System Types:** [list each type with count and calculated %]
- **Quality Tiers:** [list each tier with count and calculated %]
- **Active XP:** [activeXP.count] | **Active PI:** [activePI.count]

**⚡ Booking Issues**
- [list noBookingReasons with counts]

**Key Takeaways:**
[Generate 2-3 actionable insights based on the actual data]

If you have any other questions about [firstName]'s account data I'd be happy to dive in with you!"

Remember: Calculate all percentages as (count/totalAccounts*100) rounded to nearest whole number.

### Category Breakdowns
The injected data includes RID lists for each category. When user asks about counts, give the count with percentage. When they ask "which" or "list", then show the RIDs.

**Count question flow:**
User: "How many accounts on Freemium?"
→ Find Freemium in exclusivePricing section, get count
→ Calculate: (freemiumCount / totalAccounts) * 100
→ Response: "[count] ([%]%) of [firstName]'s [totalAccounts] accounts are on Freemium pricing."

**List follow-up flow:**
User: "Which ones?"
→ Get the RID list from that category in injected data
→ List each with RID and account name
→ Include SMART_SELECT_ACTION with actual RIDs

Response: "Here are [firstName]'s [count] Freemium accounts:
- **[actual_rid]** - [actual_name]
- ...

Would you like me to check these in Smart Select?

[SMART_SELECT_ACTION:actual_rid1,actual_rid2,...]"

### Red Flags to Always Mention
When you see data, proactively flag these issues:
- Term Pending > 0 → Always mention, these are urgent
- 0-Fullbook accounts → Complete booking stoppage, needs investigation
- Expired contracts → Immediate outreach required
- Partner Feed Excluded > 10% of bucket → Revenue risk

### Rules for Account Data Conversations
- **Use AM's name, not "You"** - Full name first, then first name for follow-ups
- **Always show percentage** - Format: "Count (X%) of Name's Total accounts..."
- **Answer directly** - don't ask for confirmation on simple data questions
- **Use actual numbers** from the injected data - NEVER make up numbers
- **Always include the follow-up prompt** after answering a data question
- **List RIDs only when asked** - "which ones?", "list them", "which rids?"
- **Offer Smart Select only after listing** - Not after count questions
- If no data is injected, explain you need to fetch data for the AM first

### Switching Between AMs
When user asks about a DIFFERENT AM (e.g., "what about Erin", "show me Kevin's data"):
- The system will automatically inject that AM's data
- The data header will show the new AM's name
- Answer using that AM's data just like you would for the active AM
- If the requested AM isn't found, say: "I couldn't find an AM named [name]. Available AMs are: [list first names]"

### CRITICAL: Never Output Code
**NEVER output code, function calls, or code-like syntax.** If you don't have data for something:
- Say "I don't have that specific data available" 
- Explain what data IS available
- NEVER output things like \`print(...)\`, \`tool_code\`, or any programming syntax
- You are a conversational assistant, not a code executor`;

/**
 * Patterns to detect account data questions
 * These questions should trigger data injection
 * IMPORTANT: Must be broad enough to catch follow-up questions like "how many are on pro"
 */
const ACCOUNT_DATA_PATTERNS = [
  // General "how many" questions - very broad to catch follow-ups
  /how\s*many\s*(rids?|accounts?|restaurants?)/i,
  /how\s*many\s*(are|is|have|do|on|in|running|using|with)/i,
  /how\s*many\s+\w+/i,  // "how many pro", "how many core", etc.
  
  // Bucket/portfolio questions
  /my\s*(bucket|book|portfolio)/i,
  /(bucket|book|portfolio)\s*(size|count|total)/i,
  
  // Contract status
  /term\s*pending/i,
  /contract\s*(status|renewals?|expir)/i,
  /expired?\s*(contracts?|accounts?)?/i,
  /canceling|cancelling/i,
  
  // System types - specific keywords
  /system\s*(mix|types?)/i,
  /\b(core|pro|basic)\b.*accounts?/i,
  /accounts?\s*(on|are|is)?\s*(core|pro|basic)/i,
  /on\s*(core|pro|basic)\b/i,
  /(are|is|running|using|have)\s*(core|pro|basic)/i,
  
  // Quality tiers
  /quality\s*tiers?/i,
  /\b(platinum|gold|silver|bronze)\b/i,
  /rest(aurant)?\s*quality/i,
  
  // PI - Promoted Inventory (multiple aliases)
  /\bpi\b/i,
  /promoted?\s*inventory/i,
  /active\s*pi/i,
  /(running|using|have|with)\s*(pi|promoted)/i,
  
  // XP - Experiences (multiple aliases)
  /\bxp\b/i,
  /experiences?/i,
  /active\s*xp/i,
  /(running|using|have|with)\s*(xp|experiences?)/i,
  
  // PD - Private Dining (multiple aliases)
  /\bpd\b/i,
  /private\s*dining/i,
  /(have|offer|with)\s*private\s*dining/i,
  
  // IB - Instant Booking (multiple aliases)
  /\bib\b/i,
  /instant\s*book(ing)?/i,
  
  // Stripe / Payment / Credit Cards
  /stripe/i,
  /credit\s*cards?/i,
  /payment\s*(method|status|issue)/i,
  /(can|can't|cannot)\s*(take|accept|process)\s*(credit\s*)?cards?/i,
  /payment\s*processing/i,
  
  // Pricing
  /(freemium|ayce|exclusive\s*pricing)/i,
  /pricing\s*(mix|model)/i,
  /free\s*google/i,
  
  // Booking issues
  /no\s*booking/i,
  /booking\s*(issues?|problems?)/i,
  /0[\s-]*(fullbook|network)/i,
  /stopped?\s*booking/i,
  /not\s*booking/i,
  
  // Discovery / Covers
  /discovery\s*%?/i,
  /disco\s*%?/i,
  /covers?/i,
  /cvr/i,
  
  // Revenue / Yield
  /revenue/i,
  /yield/i,
  /sub\s*fees?/i,
  
  // POS
  /pos\s*(match|type|integration)?/i,
  /point\s*of\s*sale/i,
  
  // List/show requests
  /which\s*(rids?|accounts?|ones?)/i,
  /list\s*(them|the\s*rids?|accounts?)/i,
  /show\s*(me\s*)?(the\s*)?(rids?|accounts?|list)/i,
  
  // Analysis requests
  /analyze\s*my/i,
  /snapshot/i,
  /bucket\s*summary/i,
  /portfolio\s*analysis/i,
  
  // Partner feed
  /partner\s*feed/i,
  
  // Metros / Location
  /metros?/i,
  /top\s*metros?/i,
  /macro/i,
  /neighborhood/i,
  
  // System of Record
  /system\s*of\s*record/i,
  /sor\b/i,
  
  // Health / iQ
  /health\s*(flags?|issues?)/i,
  /iq\s*(score|flags?)/i,
  
  // Smart Select / Action requests
  /add\s*(them|those|these)?\s*to\s*(my\s*)?(smart\s*)?select/i,
  /check\s*(them|those|these)\s*(in|on)\s*(smart\s*)?select/i,
  /smart\s*select/i
];

/**
 * Get the Gemini API key from script properties
 * @returns {string} The API key
 * @private
 */
function getGeminiApiKey_() {
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) {
    throw new Error('GEMINI_API_KEY not found in Script Properties. Go to Project Settings > Script Properties to add it.');
  }
  return key;
}

/**
 * Try to match a scripted response before calling Gemini
 * @param {string} query - The user's question
 * @returns {Object|null} Response object if matched, null to fall through to Gemini
 */
function tryScriptedResponse(query) {
  if (!query) return null;
  const normalizedQuery = query.toLowerCase().trim();
  
  // 1. Check troubleshooting patterns (highest priority)
  for (const item of SCRIPTED_RESPONSES.troubleshooting) {
    for (const pattern of item.patterns) {
      if (pattern.test(normalizedQuery)) {
        console.log('[tryScriptedResponse] Matched troubleshooting pattern');
        return { success: true, answer: item.response, source: 'scripted' };
      }
    }
  }
  
  // 2. Check feature explanation patterns
  for (const item of SCRIPTED_RESPONSES.features) {
    for (const pattern of item.patterns) {
      if (pattern.test(normalizedQuery)) {
        console.log('[tryScriptedResponse] Matched feature pattern');
        return { success: true, answer: item.response, source: 'scripted' };
      }
    }
  }
  
  // 3. Check metric explanation patterns
  for (const item of SCRIPTED_RESPONSES.metrics) {
    for (const pattern of item.patterns) {
      if (pattern.test(normalizedQuery)) {
        console.log('[tryScriptedResponse] Matched metric pattern');
        return { success: true, answer: item.response, source: 'scripted' };
      }
    }
  }
  
  // 4. Check column change patterns (switch from X to Y)
  for (const item of SCRIPTED_RESPONSES.columnChange) {
    for (const pattern of item.patterns) {
      if (pattern.test(normalizedQuery)) {
        console.log('[tryScriptedResponse] Matched column change pattern');
        return { success: true, answer: item.response, source: 'scripted' };
      }
    }
  }
  
  // 5. Check filtering advice patterns
  for (const item of SCRIPTED_RESPONSES.filtering) {
    for (const pattern of item.patterns) {
      if (pattern.test(normalizedQuery)) {
        console.log('[tryScriptedResponse] Matched filtering pattern');
        return { success: true, answer: item.response, source: 'scripted' };
      }
    }
  }
  
  // 6. Check FAQ patterns
  for (const item of SCRIPTED_RESPONSES.faq) {
    for (const pattern of item.patterns) {
      if (pattern.test(normalizedQuery)) {
        console.log('[tryScriptedResponse] Matched FAQ pattern');
        return { success: true, answer: item.response, source: 'scripted' };
      }
    }
  }
  
  // 7. Check workflow patterns
  for (const item of SCRIPTED_RESPONSES.workflows) {
    for (const pattern of item.patterns) {
      if (pattern.test(normalizedQuery)) {
        console.log('[tryScriptedResponse] Matched workflow pattern');
        return { success: true, answer: item.response, source: 'scripted' };
      }
    }
  }
  
  // 8. Check escalation patterns (user wants human help)
  for (const item of SCRIPTED_RESPONSES.escalation) {
    for (const pattern of item.patterns) {
      if (pattern.test(normalizedQuery)) {
        console.log('[tryScriptedResponse] Matched escalation pattern');
        return { success: true, answer: item.response, source: 'scripted' };
      }
    }
  }
  
  // 9. Check for "how to see/find/show" + known value patterns
  const actionPatterns = [
    /(?:how|where).*(?:can i |do i |to )?(see|find|show|view|filter|get).*\b(\w+)\b/i,
    /(?:see|find|show|view|filter|get).*\b(\w+)\b.*(?:accounts?|restaurants?)/i,
    /\b(\w+)\b.*(?:accounts?|restaurants?).*(?:see|find|show|view|filter)/i
  ];
  
  for (const pattern of actionPatterns) {
    const match = normalizedQuery.match(pattern);
    if (match) {
      // Extract potential value words from the query
      const words = normalizedQuery.split(/\s+/);
      for (const word of words) {
        const cleanWord = word.replace(/[^a-z0-9]/g, '');
        if (VALUE_TO_METRIC[cleanWord]) {
          const mapping = VALUE_TO_METRIC[cleanWord];
          const category = COLUMN_CATEGORIES[mapping.category];
          const displayValue = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
          
          console.log(`[tryScriptedResponse] Matched value "${cleanWord}" → ${mapping.metric}`);
          
          return {
            success: true,
            answer: `**${displayValue}** is a value in the **${mapping.metric}** metric, found in the **${category.name}** section.\n\nWould you like me to add that column to your view?\n\n[COLUMN_ACTION:${mapping.category}:${mapping.metric}]`,
            source: 'scripted'
          };
        }
      }
    }
  }
  
  // 10. Check for direct metric lookups: "where is [metric]" or "show me [metric]"
  const metricLookupPatterns = [
    /(?:where|how).*(?:is|can i (?:see|find)).*["']?([^"'?]+)["']?\s*\??$/i,
    /(?:show|display|add).*["']?([^"'?]+)["']?\s*(?:column|metric)?\s*\??$/i
  ];
  
  for (const pattern of metricLookupPatterns) {
    const match = normalizedQuery.match(pattern);
    if (match && match[1]) {
      const searchTerm = match[1].trim().toLowerCase();
      const categoryKey = METRIC_TO_CATEGORY[searchTerm];
      
      if (categoryKey) {
        const category = COLUMN_CATEGORIES[categoryKey];
        // Find the exact metric name (proper case)
        const exactMetric = category.metrics.find(m => m.toLowerCase() === searchTerm);
        
        if (exactMetric) {
          console.log(`[tryScriptedResponse] Matched metric lookup "${exactMetric}"`);
          
          return {
            success: true,
            answer: `**${exactMetric}** is in the **${category.name}** section.\n\nWould you like me to add that column to your view?\n\n[COLUMN_ACTION:${categoryKey}:${exactMetric}]`,
            source: 'scripted'
          };
        }
      }
    }
  }
  
  // 11. Check portfolio analysis patterns (most now fall through to Gemini with data injection)
  if (SCRIPTED_RESPONSES.portfolio) {
    for (const item of SCRIPTED_RESPONSES.portfolio) {
      for (const pattern of item.patterns) {
        if (pattern.test(normalizedQuery)) {
          console.log('[tryScriptedResponse] Matched portfolio pattern');
          
          // If this pattern needs AM context, get it
          if (item.needsAMContext && typeof item.getResponse === 'function') {
            const amContext = getActiveAMContext();
            const response = item.getResponse(amContext);
            // If getResponse returns null, fall through to Gemini
            if (response === null) {
              console.log('[tryScriptedResponse] Portfolio pattern returned null, falling through to Gemini');
              return null;
            }
            return { success: true, answer: response, source: 'scripted' };
          }
          
          // Otherwise use static response
          if (item.response) {
            return { success: true, answer: item.response, source: 'scripted' };
          }
        }
      }
    }
  }
  
  // No match - fall through to Gemini
  return null;
}

/**
 * Check if query is about account data and needs data injection
 * @param {string} query - The user's question
 * @returns {boolean} True if this is an account data question
 */
function isAccountDataQuestion(query) {
  if (!query) return false;
  
  for (const pattern of ACCOUNT_DATA_PATTERNS) {
    if (pattern.test(query)) {
      console.log(`[isAccountDataQuestion] ✓ Matched pattern: ${pattern} for query: "${query}"`);
      return true;
    }
  }
  
  // Also check if asking about a different AM
  if (extractAMNameFromQuery(query)) {
    console.log(`[isAccountDataQuestion] ✓ Detected different AM query: "${query}"`);
    return true;
  }
  
  console.log(`[isAccountDataQuestion] ✗ No pattern matched for query: "${query}"`);
  return false;
}

/**
 * Extract AM name from query if user is asking about a different AM
 * @param {string} query - The user's question
 * @returns {string|null} The AM name if found, null otherwise
 */
function extractAMNameFromQuery(query) {
  if (!query) return null;
  
  // Patterns for asking about different AMs
  const patterns = [
    /what\s+about\s+(\w+)/i,                    // "what about Erin"
    /show\s+(?:me\s+)?(\w+)'?s?\s+data/i,       // "show me Erin's data", "show Erin data"
    /(\w+)'?s?\s+(?:bucket|portfolio|accounts)/i, // "Erin's bucket", "Erin's accounts"
    /how\s+(?:about|is)\s+(\w+)/i,              // "how about Erin", "how is Erin"
    /switch\s+to\s+(\w+)/i,                     // "switch to Erin"
    /(?:and|what\s+about)\s+for\s+(\w+)/i,     // "and for Erin", "what about for Erin"
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const potentialName = match[1].trim();
      // Filter out common words that aren't names
      const skipWords = ['the', 'my', 'this', 'that', 'their', 'your', 'team', 'all'];
      if (!skipWords.includes(potentialName.toLowerCase())) {
        console.log(`[extractAMNameFromQuery] Found potential AM name: "${potentialName}"`);
        return potentialName;
      }
    }
  }
  
  return null;
}

/**
 * Find AM full name from first name or partial match
 * @param {string} searchName - The name to search for
 * @returns {Object|null} { fullName, tabName } if found, null otherwise
 */
function findAMByName(searchName) {
  if (!searchName) return null;
  
  const availableTabs = getAvailableAMTabs();
  if (!availableTabs.success || !availableTabs.ams.length) return null;
  
  const searchLower = searchName.toLowerCase().trim();
  
  for (const am of availableTabs.ams) {
    // Check if first name matches (tab name is usually first name)
    if (am.tabName && am.tabName.toLowerCase() === searchLower) {
      console.log(`[findAMByName] Matched tab name: "${am.tabName}" → "${am.fullName}"`);
      return { fullName: am.fullName, tabName: am.tabName };
    }
    
    // Check if full name starts with the search term
    if (am.fullName && am.fullName.toLowerCase().startsWith(searchLower)) {
      console.log(`[findAMByName] Matched full name start: "${searchName}" → "${am.fullName}"`);
      return { fullName: am.fullName, tabName: am.tabName };
    }
    
    // Check if first name of full name matches
    const firstName = am.fullName ? am.fullName.split(' ')[0].toLowerCase() : '';
    if (firstName === searchLower) {
      console.log(`[findAMByName] Matched first name: "${searchName}" → "${am.fullName}"`);
      return { fullName: am.fullName, tabName: am.tabName };
    }
  }
  
  console.log(`[findAMByName] No match found for: "${searchName}"`);
  return null;
}

/**
 * Format account data for injection into Gemini context
 * @param {Object} data - The detailed AM data object
 * @returns {string} Formatted data string for injection
 */
function formatDataForInjection(data) {
  if (!data || !data.success) return '';
  
  let text = `\n--- ACCOUNT DATA FOR ${data.amName} ---\n`;
  text += `Total Accounts: ${data.totalAccounts} | Groups: ${data.totalGroups}\n`;
  text += `Term Pending: ${data.termPending.count} | Expired: ${data.termExpired.count} | Warning (45d): ${data.termWarning.count}\n`;
  text += `OVERALL Avg Yield: $${data.avgYield} | OVERALL Avg Sub Fee: $${data.avgSubFee} | Discovery: ${data.avgDisco}\n`;
  text += `MoM Change: ${data.momChange} | PI Rev Share: ${data.piRevShare} | POS Match: ${data.posMatch}\n\n`;
  
  // Features
  text += `Active PI: ${data.activePI.count} | Active XP: ${data.activeXP.count}\n`;
  text += `Instant Booking: ${data.instantBooking.count} | Private Dining: ${data.privateDining.count}\n`;
  text += `Partner Feed Excluded: ${data.partnerFeedExcluded.count}\n\n`;
  
  // Enhanced category with per-category metrics (System Mix, Quality Tiers)
  const formatMetricCategory = (name, items) => {
    if (!items || items.length === 0) return '';
    let result = `${name} (with per-category avg yield & sub fee):\n`;
    items.forEach(item => {
      const ridList = item.rids.slice(0, 5).map(r => r.rid).join(', ');
      const more = item.rids.length > 5 ? ` (+${item.rids.length - 5} more)` : '';
      result += `  - ${item.name}: ${item.count} accounts | Avg Yield: $${item.avgYield} | Avg Sub: $${item.avgSubFee} [RIDs: ${ridList}${more}]\n`;
    });
    return result;
  };
  
  // Simple category breakdowns with RID details
  const formatSimpleCategory = (name, items) => {
    if (!items || items.length === 0) return '';
    let result = `${name}:\n`;
    items.forEach(item => {
      const ridList = item.rids.slice(0, 5).map(r => r.rid).join(', ');
      const more = item.rids.length > 5 ? ` (+${item.rids.length - 5} more)` : '';
      result += `  - ${item.name}: ${item.count} [RIDs: ${ridList}${more}]\n`;
    });
    return result;
  };
  
  // Single-category items with RID details
  const formatSingleItem = (name, obj) => {
    if (!obj || obj.count === 0) return '';
    const ridList = obj.rids.slice(0, 5).map(r => `${r.rid} (${r.name})`).join(', ');
    const more = obj.rids.length > 5 ? ` (+${obj.rids.length - 5} more)` : '';
    return `${name}: ${obj.count} [${ridList}${more}]\n`;
  };
  
  text += formatSingleItem('Term Pending RIDs', data.termPending);
  text += formatSingleItem('Expired RIDs', data.termExpired);
  text += formatSingleItem('Warning (45d) RIDs', data.termWarning);
  text += '\n';
  
  // Categories WITH per-category metrics
  text += formatMetricCategory('System Mix', data.systemMix);
  text += formatMetricCategory('Quality Tiers', data.qualityTiers);
  
  // Simple categories
  text += formatSimpleCategory('Exclusive Pricing', data.exclusivePricing);
  text += formatSimpleCategory('No Booking Reasons', data.noBookingReasons);
  text += formatSimpleCategory('Special Programs', data.specialPrograms);
  text += formatSimpleCategory('Top Metros', data.topMetros);
  
  text += `--- END ACCOUNT DATA ---\n`;
  
  return text;
}

/**
 * Main function to ask the InTouch Guide AI
 * Called from the frontend Knowledge Hub chat
 * @param {string} userQuery - The user's question
 * @param {string} conversationHistory - Optional JSON string of previous messages
 * @returns {Object} Response object with success status and answer
 */
function askInTouchGuide(userQuery, conversationHistory) {
  const startTime = new Date();
  const requestId = Utilities.getUuid().substring(0, 8);
  
  console.log('=== INTOUCH GUIDE REQUEST [' + requestId + '] ===');
  console.log('Query: ' + userQuery);
  
  try {
    // Validate input
    if (!userQuery || userQuery.trim().length === 0) {
      return {
        success: false,
        error: 'Please enter a question',
        requestId: requestId
      };
    }
    
    // STEP 1: Try scripted responses first (fast path - no API call)
    // Skip scripted for follow-up conversations (has history) to maintain context
    if (!conversationHistory || conversationHistory === 'null' || conversationHistory === '[]') {
      const scriptedResult = tryScriptedResponse(userQuery);
      if (scriptedResult) {
        console.log('[askInTouchGuide] Using scripted response (no API call)');
        scriptedResult.requestId = requestId;
        scriptedResult.durationMs = new Date() - startTime;
        return scriptedResult;
      }
    }
    
    // STEP 2: Check if this is an account data question - if so, inject data
    let injectedData = null;
    let amContext = null;
    let targetAMName = null;
    
    if (isAccountDataQuestion(userQuery)) {
      console.log('[askInTouchGuide] Detected account data question, fetching data...');
      
      // First check if user is asking about a DIFFERENT AM
      const extractedName = extractAMNameFromQuery(userQuery);
      if (extractedName) {
        const foundAM = findAMByName(extractedName);
        if (foundAM) {
          console.log(`[askInTouchGuide] User asking about different AM: ${foundAM.fullName}`);
          targetAMName = foundAM.fullName;
          amContext = {
            isAMTab: true,
            fullName: foundAM.fullName,
            isTeamView: false,
            sheetName: foundAM.tabName,
            isDifferentAM: true  // Flag that this is not the active tab's AM
          };
        }
      }
      
      // If not asking about different AM, use active tab context
      if (!targetAMName) {
        amContext = getActiveAMContext();
        if (amContext.isAMTab && amContext.fullName) {
          targetAMName = amContext.fullName;
        }
      }
      
      // Fetch data for the target AM
      if (targetAMName) {
        console.log(`[askInTouchGuide] Injecting data for: ${targetAMName}`);
        injectedData = getDetailedAMData(targetAMName);
        
        if (!injectedData.success) {
          console.log('[askInTouchGuide] Failed to get data: ' + injectedData.error);
          injectedData = null;
        }
      } else if (amContext && amContext.isTeamView) {
        console.log('[askInTouchGuide] Team view detected - will mention team context');
      }
    }
    
    // STEP 3: Call Gemini with optional data injection
    console.log('[askInTouchGuide] Calling Gemini API');
    const apiKey = getGeminiApiKey_();
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
    
    // Build conversation contents
    const contents = [];
    
    // Add conversation history if provided
    if (conversationHistory) {
      try {
        const history = JSON.parse(conversationHistory);
        for (const msg of history) {
          contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          });
        }
      } catch (e) {
        console.log('Warning: Could not parse conversation history: ' + e.message);
      }
    }
    
    // Build the user message - optionally inject data
    let userMessage = userQuery;
    
    if (injectedData && injectedData.success) {
      const dataText = formatDataForInjection(injectedData);
      userMessage = userQuery + '\n\n' + dataText;
      console.log('[askInTouchGuide] Data injected into query');
    } else if (amContext && amContext.isTeamView) {
      userMessage = userQuery + '\n\n[CONTEXT: User is on Manager Lens / Team view - no individual AM data available. Offer team-wide analysis if relevant.]';
    } else if (amContext && amContext.isAMTab && !amContext.fullName) {
      userMessage = userQuery + '\n\n[CONTEXT: User is on an AM tab but the AM name could not be determined from B2.]';
    }
    
    // Add current user query
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });
    
    const payload = {
      systemInstruction: {
        parts: [{ text: INTOUCH_SYSTEM_INSTRUCTION }]
      },
      contents: contents,
      generationConfig: {
        maxOutputTokens: 1500,  // Increased for data responses
        temperature: 0.3,  // Lower for factual accuracy
        topP: 0.9
      }
    };
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode !== 200) {
      const errorText = response.getContentText();
      console.log('API ERROR: ' + errorText);
      throw new Error('Gemini API error: ' + responseCode);
    }
    
    const data = JSON.parse(response.getContentText());
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!answer) {
      console.log('No answer in response: ' + JSON.stringify(data));
      throw new Error('No response generated');
    }
    
    const durationMs = new Date() - startTime;
    console.log('Answer generated (' + answer.length + ' chars) in ' + durationMs + 'ms');
    
    return {
      success: true,
      answer: answer,
      requestId: requestId,
      durationMs: durationMs,
      amContext: amContext,  // Include AM context for frontend
      dataInjected: !!(injectedData && injectedData.success),  // Flag for visual indicator
      dataSource: injectedData && injectedData.success ? {
        amName: injectedData.amName,
        totalAccounts: injectedData.totalAccounts
      } : null
    };
    
  } catch (error) {
    console.log('INTOUCH GUIDE ERROR [' + requestId + ']: ' + error.message);
    
    return {
      success: false,
      error: error.message,
      requestId: requestId,
      durationMs: new Date() - startTime
    };
  }
}

// =============================================================
// SECTION: KNOWLEDGE HUB - FEEDBACK SYSTEM
// =============================================================
// All feedback from sidebars and webapps goes to the master KH_Feedback sheet
// =============================================================

/**
 * Feedback logging sheet configuration
 * All feedback from all sheets goes to this central master spreadsheet
 */
const KH_FEEDBACK_CONFIG = {
  MASTER_SPREADSHEET_ID: '1xDOgLdl5cT3T9okuL0WryH_vCyoV-f38kBbkEpkS1PI',
  SHEET_NAME: 'KH_Feedback',
  HEADERS: ['Timestamp', 'User', 'Source', 'Query', 'Response', 'Rating', 'Correction', 'Status']
};

/**
 * Log user feedback on AI responses
 * Called from the frontend when user rates or corrects a response
 * @param {Object} feedback - Feedback object with query, response, rating, correction
 * @returns {Object} Result object with success status
 */
function logKnowledgeHubFeedback(feedback) {
  const startTime = new Date();
  
  try {
    if (!feedback || (!feedback.rating && !feedback.correction)) {
      return { success: false, error: 'No feedback provided' };
    }
    
    // Get source spreadsheet name before opening master
    const activeSs = SpreadsheetApp.getActiveSpreadsheet();
    let source = 'Sidebar';
    try {
      const ssName = activeSs.getName();
      if (ssName) source = ssName.substring(0, 30); // Truncate long names
    } catch (e) {}
    
    // Open the central master feedback spreadsheet
    const masterSs = SpreadsheetApp.openById(KH_FEEDBACK_CONFIG.MASTER_SPREADSHEET_ID);
    let sheet = masterSs.getSheetByName(KH_FEEDBACK_CONFIG.SHEET_NAME);
    
    // Create feedback sheet if it doesn't exist
    if (!sheet) {
      sheet = masterSs.insertSheet(KH_FEEDBACK_CONFIG.SHEET_NAME);
      sheet.getRange(1, 1, 1, KH_FEEDBACK_CONFIG.HEADERS.length)
        .setValues([KH_FEEDBACK_CONFIG.HEADERS])
        .setFontWeight('bold')
        .setBackground('#f3f4f6');
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(4, 300); // Query
      sheet.setColumnWidth(5, 400); // Response
      sheet.setColumnWidth(7, 300); // Correction
    }
    
    // Get user email
    let userEmail = 'anonymous';
    try {
      userEmail = Session.getActiveUser().getEmail() || 'anonymous';
    } catch (e) {}
    
    // Truncate long content for storage
    const truncate = (str, maxLen) => {
      if (!str) return '';
      return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
    };
    
    // Add feedback row with source identifier
    const row = [
      new Date(),
      userEmail,
      source,
      truncate(feedback.query || '', 500),
      truncate(feedback.response || '', 1000),
      feedback.rating || '',
      truncate(feedback.correction || '', 1000),
      feedback.correction ? 'needs_review' : 'logged'
    ];
    
    sheet.appendRow(row);
    
    console.log('KH Feedback logged to master: ' + feedback.rating + (feedback.correction ? ' + correction' : ''));
    
    return {
      success: true,
      message: feedback.correction ? 'Thank you! Your correction has been submitted for review.' : 'Thanks for your feedback!',
      durationMs: new Date() - startTime
    };
    
  } catch (error) {
    console.error('KH Feedback Error: ' + error.message);
    return {
      success: false,
      error: error.message,
      durationMs: new Date() - startTime
    };
  }
}

/**
 * Get pending feedback corrections for review
 * Use this to review and improve the system instruction
 * Reads from the central master feedback spreadsheet
 * @returns {Array} Array of feedback entries needing review
 */
function getKHFeedbackForReview() {
  try {
    const masterSs = SpreadsheetApp.openById(KH_FEEDBACK_CONFIG.MASTER_SPREADSHEET_ID);
    const sheet = masterSs.getSheetByName(KH_FEEDBACK_CONFIG.SHEET_NAME);
    
    if (!sheet || sheet.getLastRow() < 2) {
      return { success: true, data: [], message: 'No feedback yet' };
    }
    
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, KH_FEEDBACK_CONFIG.HEADERS.length).getValues();
    const headers = KH_FEEDBACK_CONFIG.HEADERS;
    
    // Filter for items needing review (have corrections)
    const needsReview = data
      .map((row, idx) => {
        const obj = {};
        headers.forEach((h, i) => obj[h.toLowerCase().replace(/\s/g, '_')] = row[i]);
        obj.rowIndex = idx + 2; // 1-indexed, skip header
        return obj;
      })
      .filter(item => item.status === 'needs_review' || item.correction);
    
    return {
      success: true,
      data: needsReview,
      total: data.length,
      needsReview: needsReview.length
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Export feedback data as JSON for local AI optimization
 * Run this function, view the logs, and copy the JSON output to a local file
 * Use this file in Cursor to prompt: "Based on this feedback, improve the system instructions"
 * @returns {string} JSON string of feedback items
 */
function exportFeedbackForAI() {
  try {
    const feedbackResult = getKHFeedbackForReview();
    
    if (!feedbackResult.success) {
      console.log('Error fetching feedback: ' + feedbackResult.error);
      return JSON.stringify({ error: feedbackResult.error });
    }
    
    if (!feedbackResult.data || feedbackResult.data.length === 0) {
      console.log('No feedback found requiring review.');
      return JSON.stringify([]);
    }
    
    // Format for LLM consumption (remove noise, focus on Q&A pairs)
    const optimizationContext = feedbackResult.data.map(item => ({
      query: item.query,
      ai_response: item.response,
      user_rating: item.rating,
      user_correction: item.correction,
      timestamp: item.timestamp
    }));
    
    const jsonOutput = JSON.stringify(optimizationContext, null, 2);
    
    console.log('=== COPY BELOW THIS LINE ===');
    console.log(jsonOutput);
    console.log('=== COPY ABOVE THIS LINE ===');
    
    return jsonOutput;
    
  } catch (e) {
    console.error('Export failed: ' + e.message);
    return JSON.stringify({ error: e.message });
  }
}

/**
 * WEB APP ENDPOINT: Serve feedback data as JSON
 * Deploy as web app: Execute as "Me", Access "Anyone with link"
 * Requires ?key=intouch-feedback-export query parameter for basic security
 * 
 * After deploying, set the URL in fetch-feedback.js
 * @param {Object} e - Event object from web request
 * @returns {TextOutput} JSON response
 */
function doGet(e) {
  const EXPECTED_KEY = 'intouch-feedback-export'; // Basic auth token
  
  try {
    // Validate request has correct key
    const providedKey = e?.parameter?.key;
    if (providedKey !== EXPECTED_KEY) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'Unauthorized', code: 401 }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Reuse existing export logic
    const jsonOutput = exportFeedbackForAI();
    
    return ContentService
      .createTextOutput(jsonOutput)
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.message, code: 500 }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * PING TEST: Verify Gemini API connectivity
 * Call this from the Apps Script editor to test your API key
 * @returns {Object} Status object with success/error info
 */
function pingGeminiApi() {
  const startTime = new Date();
  console.log('=== GEMINI API PING TEST ===');
  
  try {
    const apiKey = getGeminiApiKey_();
    console.log('API Key retrieved: ' + apiKey.substring(0, 8) + '...[REDACTED]');
    
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
    
    const payload = {
      contents: [{
        parts: [{ text: 'Reply with exactly: PONG' }]
      }],
      generationConfig: {
        maxOutputTokens: 10,
        temperature: 0
      }
    };
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode !== 200) {
      return {
        success: false,
        error: 'API returned status ' + responseCode,
        details: response.getContentText(),
        durationMs: new Date() - startTime
      };
    }
    
    const data = JSON.parse(response.getContentText());
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
    
    console.log('Response: ' + reply.trim());
    console.log('=== PING TEST COMPLETE ===');
    
    return {
      success: true,
      response: reply.trim(),
      durationMs: new Date() - startTime,
      model: 'gemini-2.0-flash'
    };
    
  } catch (error) {
    console.log('PING TEST ERROR: ' + error.message);
    return {
      success: false,
      error: error.message,
      durationMs: new Date() - startTime
    };
  }
}
