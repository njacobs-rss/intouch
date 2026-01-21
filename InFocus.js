/**
 * =============================================================
 * FILE: InFocus.js
 * PURPOSE: AI-powered natural language filtering for AM dashboards
 * ARCHITECTURE: Config + Backend + AI Prompt Builder
 * =============================================================
 * 
 * FLOW:
 * 1. User enters natural language query in sidebar
 * 2. AI generates formula for STATCORE Col BE (helper column)
 * 3. syncFilteredAccounts() reads filtered RIDs and pastes to Active Sheet
 * 4. resetToDefault() restores original formulas from RID DISTRO
 */

// =============================================================
// SECTION 1: CONFIGURATION
// =============================================================

const INFOCUS_CONFIG = {
  // Master Data Source
  MASTER_DATA: {
    sheetName: 'STATCORE',
    keyCol: 'A',           // RID column
    helperCol: 'BE',       // Where AI formula is injected (TRUE/FALSE filter result)
    managerCol1: 'N',      // Account Manager (Col N = index 13)
    managerCol2: 'AU',     // Secondary AM column (Col AU = index 46)
    headerRow: 2
  },
  
  // Sort Source (Original order)
  SORT_SOURCE: {
    sheetName: 'RID DISTRO',
    headerRow: 1           // Row 1 contains Manager Names as column headers
  },
  
  // Target (Active Dashboard)
  TARGET: {
    managerCell: 'B2',     // Cell containing Manager Name
    dataStartCell: 'C3',   // Where RID list begins
    dataCol: 'C'           // Column containing RIDs
  }
};

/**
 * DATA_KEY_SCHEMA - Hardcoded schema for AI prompt construction
 * Maps field names to their locations and definitions
 */
const DATA_KEY_SCHEMA = `
SECTION, INTOUCH NAME, POSSIBLE VARIABLES, DEFINITION, COLUMN HEADER
STATCORE, RID, , Unique restaurant identifier, RID
STATCORE, Current Term End Date, , Contract term end date, CURRENT_TERM_END_DATE
STATCORE, Account ID, , Salesforce Account ID, ACCOUNT_SFDC_ID
STATCORE, Parent Account ID, , Salesforce Parent Account ID, PARENT_ID
STATCORE, Account Name, , Restaurant Name, RNAME
STATCORE, Parent Account, , Group/Brand Name, GROUPNAME
STATCORE, Metro, , Metro Area, METROAREANAME
STATCORE, Macroname, , Macro Area (City District), MACRONAME
STATCORE, Neighborhood, , Neighborhood, NBHOODNAME
STATCORE, Status, "Active, Pending Cancellation, Hibernated", Lifecycle status, STATUS
STATCORE, Account_Status, "Active Customer, Termination Pending, Locked Out", SFDC Status, ACCOUNT_STATUS
STATCORE, Restaurant Status, "Reserve Now, Closed Temporarily, Seasonal", Operational Posture, CHARM_STATUS
STATCORE, Target Zipcode, "FALSE, TRUE", Target ZIP flag, TARGET_ZIPCODE
STATCORE, Account Manager, , Assigned AM, ACCOUNT_AM
STATCORE, Inside Sales Representative, , Assigned ISR, ACCOUNT_ISR
STATCORE, Payment Method, "Non - Auto Pay, Auto Pay - Credit Card", Billing config, PAYMENT_METHOD
STATCORE, Ordering Systems, , Third-party ordering systems, ORDERING_SYSTEMS
STATCORE, Total Due, , Outstanding Balance, TOTAL_DUE
STATCORE, Past Due, , Overdue Amount, PAST_DUE
STATCORE, Customer Since, , Partnership Start Date, CUSTOMER_SINCE
STATCORE, Exclusive Pricing, "Freemium, Pro/Core, Basic/OTC, Flex 1.0", Pricing Model, EP_CURRENT
STATCORE, Price, , Per-cover price, Standard Cover Price
STATCORE, System Status, "Reserve Now, Decline Online, Hibernated", Aggregated Rule Status, Derived from CHARM/ACCOUNT/STATUS
STATCORE, System Type, "Core, Pro, Basic, Guest Center, Network Access", System Type, DR_SYS_TYPE
STATCORE, Standard / Direct Cvrs, , Direct Source Covers, DIRECT_SEATED_COVERS
STATCORE, Google / Direct Cvrs, , Google Covers (Split), GOOGLE_SEATED_COVERS
STATCORE, Standard Exposure Cvrs, , Non-promoted Covers, STANDARD_EXPERIENCE_SEATED_COVERS
STATCORE, Instant Booking, Instant Booking, IB Live Flag, ACTIVE_INSTANT_BOOKING_EXPERIENCES
STATCORE, Private Dining, "FALSE, TRUE", PD Eligibility, UNPUBLISH_DATE rule
STATCORE, System Of Record, "OpenTable, Resy, SevenRooms, Toast", Primary System, SYSTEM_OF_RECORD
STATCORE, Stripe Status, "Enabled, Restricted, Rejected", Stripe Status, STRIPE_STATUS
STATCORE, Rest. Quality, "Normal, Top [NOM], Elite[NOM], Icon⭐", Quality/Awards, RESTAURANT_QUALITY
STATCORE, Contract Alerts, "EXPIRED MM-YY, EXP. IN - XXD", Contract expiration warning, Contract Alerts
STATCORE, Zero Activity, "0-Fullbook, 0-Online, 0-Restref, 0-InHouse", Zero bookings flag (L30 Days), No Bookings
DISTRO, Shift w/MAX CAP, Yes, Capacity Enforced, Capacity flags
DISTRO, Active XP, Yes, Active Experience, ACTIVE_XP
DISTRO, Active PI, "PR/CP, BP", PI Campaigns Active, PI activity flags
DISTRO, CVR Last Month – RestRef, , RestRef Covers (LM), RESTREF_SEATED_COVERS
DISTRO, CVR Last Month – Direct, , Direct Covers (LM), DIRECT_SEATED_COVERS
DISTRO, CVR Last Month – Discovery, , Discovery Covers (LM), DISCOVERY_SEATED_COVERS
DISTRO, CVR Last Month – Phone/Walkin, , Phone/Walkin Covers (LM), PHONE / WALKIN_SEATED_COVERS
DISTRO, CVR Last Month – Network, , Direct + Discovery Covers (LM), NETWORK_SEATED_COVERS
DISTRO, CVR Last Month – Fullbook, , All Sources Covers (LM), FULLBOOK_COVERS
DISTRO, CVR Last Month – Google, , Google Covers (LM), GOOGLE_SEATED_COVERS
DISTRO, CVRs Last Month – Total PI, , Total PI Covers (LM), PI_SEATED_COVERS
DISTRO, CVRs 12m Avg. – FullBook, , 12m Avg Fullbook, FULLBOOK_COVERS (12m avg)
DISTRO, Revenue – Total 12m Avg., , 12m Avg Total Revenue, TOTAL_REVENUE (12m avg)
DISTRO, Revenue – Subs Last Month, , Subscription Revenue (LM), RECOGNIZED_SUBSCRIPTION_REVENUE
DISTRO, Revenue – Total Last Month, , Total Revenue (LM), TOTAL_REVENUE (monthly)
DISTRO, CVR - Network YoY%, , Network Covers Year-Over-Year %, Derived
DISTRO, CVR - Fullbook YoY%, , Fullbook Covers Year-Over-Year %, Derived
DISTRO, PI Rev Share %, , % Revenue from PI, Derived
`;

// =============================================================
// SECTION 2: BACKEND FUNCTIONS
// =============================================================

/**
 * syncFilteredAccounts() - The Filter Action
 * 
 * Goal: Apply the AI filter and paste static values to Active Sheet
 * 
 * Steps:
 * 1. Get Manager Name from Active Sheet Cell B2
 * 2. Read STATCORE and filter rows where:
 *    - Col BE (Helper) is TRUE AND
 *    - (Col N == Manager OR Col AU == Manager)
 * 3. Preserve Notes from Active Sheet C3:C
 * 4. Clear Active Sheet C3:C and paste Filtered RIDs
 * 5. Re-apply Notes to matching RIDs
 * 
 * @returns {Object} { success: boolean, count: number, message: string }
 */
function syncFilteredAccounts() {
  const startTime = new Date();
  const functionName = 'syncFilteredAccounts';
  Logger.log(`[${functionName}] Starting at ${startTime.toLocaleTimeString()}`);
  
  let result = "Success";
  let recordsAdded = 0;
  let errorMessage = "";
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const activeSheet = ss.getActiveSheet();
  
  try {
    // --- STEP 1: CONTEXT ---
    const managerName = activeSheet.getRange(INFOCUS_CONFIG.TARGET.managerCell).getValue();
    if (!managerName || String(managerName).trim() === "") {
      throw new Error("Manager name not found in cell " + INFOCUS_CONFIG.TARGET.managerCell);
    }
    Logger.log(`[${functionName}] Manager: ${managerName}`);
    
    // --- STEP 2: READ STATCORE ---
    const statcoreSheet = ss.getSheetByName(INFOCUS_CONFIG.MASTER_DATA.sheetName);
    if (!statcoreSheet) {
      throw new Error("Sheet '" + INFOCUS_CONFIG.MASTER_DATA.sheetName + "' not found.");
    }
    
    const statcoreLastRow = getTrueLastRow_(statcoreSheet, 'A');
    if (statcoreLastRow <= INFOCUS_CONFIG.MASTER_DATA.headerRow) {
      throw new Error("STATCORE has no data.");
    }
    
    // Read headers to find column indices
    const headers = statcoreSheet.getRange(INFOCUS_CONFIG.MASTER_DATA.headerRow, 1, 1, statcoreSheet.getLastColumn()).getValues()[0];
    const normalize = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
    
    // Find column indices
    const ridIdx = 0; // Col A
    const helperColLetter = INFOCUS_CONFIG.MASTER_DATA.helperCol;
    const helperColIdx = letterToColumn_(helperColLetter) - 1; // 0-indexed
    const amCol1Idx = letterToColumn_(INFOCUS_CONFIG.MASTER_DATA.managerCol1) - 1;
    const amCol2Idx = letterToColumn_(INFOCUS_CONFIG.MASTER_DATA.managerCol2) - 1;
    
    Logger.log(`[${functionName}] Column indices - RID: ${ridIdx}, Helper: ${helperColIdx}, AM1: ${amCol1Idx}, AM2: ${amCol2Idx}`);
    
    // Read all data (optimize by reading necessary columns only if sheet is wide)
    const dataRowCount = statcoreLastRow - INFOCUS_CONFIG.MASTER_DATA.headerRow;
    const lastCol = Math.max(helperColIdx + 1, amCol2Idx + 1, statcoreSheet.getLastColumn());
    const allData = statcoreSheet.getRange(INFOCUS_CONFIG.MASTER_DATA.headerRow + 1, 1, dataRowCount, lastCol).getValues();
    
    // Filter rows where Helper = TRUE AND (AM1 or AM2 matches)
    const normalizedManager = normalize(managerName);
    const filteredRids = [];
    
    allData.forEach(row => {
      const helperVal = row[helperColIdx];
      const am1Val = normalize(String(row[amCol1Idx] || ""));
      const am2Val = normalize(String(row[amCol2Idx] || ""));
      
      // Check if helper column is TRUE (boolean or string)
      const isHelperTrue = (helperVal === true || String(helperVal).toUpperCase() === 'TRUE');
      const isManagerMatch = (am1Val === normalizedManager || am2Val === normalizedManager);
      
      if (isHelperTrue && isManagerMatch) {
        filteredRids.push(String(row[ridIdx]));
      }
    });
    
    Logger.log(`[${functionName}] Filtered RIDs count: ${filteredRids.length}`);
    
    if (filteredRids.length === 0) {
      return { 
        success: false, 
        count: 0, 
        message: "No accounts matched the filter criteria. Check that Col BE has TRUE values for matching accounts." 
      };
    }
    
    // --- STEP 3: PRESERVE NOTES ---
    const targetColLetter = INFOCUS_CONFIG.TARGET.dataCol;
    const targetStartRow = 3; // C3
    const activeLastRow = Math.max(activeSheet.getLastRow(), targetStartRow);
    const targetRowCount = activeLastRow - targetStartRow + 1;
    
    // Read existing RIDs and Notes
    const existingDataRange = activeSheet.getRange(targetStartRow, 3, targetRowCount, 1); // Col C
    const existingRids = existingDataRange.getValues().flat().map(String);
    const existingNotes = existingDataRange.getNotes().flat();
    
    // Build Note Map: RID -> Note
    const noteMap = new Map();
    existingRids.forEach((rid, i) => {
      if (rid && existingNotes[i]) {
        noteMap.set(rid, existingNotes[i]);
      }
    });
    Logger.log(`[${functionName}] Preserved ${noteMap.size} notes.`);
    
    // --- STEP 4: CLEAR AND WRITE ---
    // Clear existing values and notes
    if (targetRowCount > 0) {
      activeSheet.getRange(targetStartRow, 3, targetRowCount, 1).clearContent().clearNote();
    }
    SpreadsheetApp.flush();
    
    // Prepare data to write
    const ridOutput = filteredRids.map(rid => [rid]);
    
    // Write filtered RIDs
    if (ridOutput.length > 0) {
      activeSheet.getRange(targetStartRow, 3, ridOutput.length, 1).setValues(ridOutput);
      SpreadsheetApp.flush();
    }
    
    // --- STEP 5: RE-APPLY NOTES ---
    const noteOutput = filteredRids.map(rid => {
      return noteMap.has(rid) ? noteMap.get(rid) : "";
    });
    
    // Set notes as 2D array
    const noteArray = noteOutput.map(n => [n]);
    if (noteArray.length > 0) {
      activeSheet.getRange(targetStartRow, 3, noteArray.length, 1).setNotes(noteArray);
    }
    
    recordsAdded = filteredRids.length;
    Logger.log(`[${functionName}] Successfully synced ${recordsAdded} accounts.`);
    
  } catch (error) {
    errorMessage = error.message;
    Logger.log(`[${functionName}] Error: ${errorMessage}`);
    result = "Fail";
  }
  
  // Log to Refresh sheet
  const duration = (new Date() - startTime) / 1000;
  try {
    const refreshSheet = ss.getSheetByName('Refresh');
    if (refreshSheet) {
      refreshSheet.appendRow([functionName, new Date(), recordsAdded, duration, result, errorMessage]);
    }
  } catch (logError) {
    Logger.log(`[${functionName}] Logging error: ${logError.message}`);
  }
  
  return {
    success: result === "Success",
    count: recordsAdded,
    message: result === "Success" 
      ? `Filter applied. Showing ${recordsAdded} accounts.`
      : `Filter failed: ${errorMessage}`
  };
}

/**
 * resetToDefault() - The Restore Action
 * 
 * Goal: Restore the original formulas and sort order from RID DISTRO
 * 
 * Steps:
 * 1. Get Manager Name from Active Sheet Cell B2
 * 2. Find Manager's column in RID DISTRO (Row 1 headers)
 * 3. Read the default sorted RIDs from that column
 * 4. Preserve Notes from Active Sheet C3:C
 * 5. Rebuild formulas and set them (or paste the sorted RIDs)
 * 6. Re-apply Notes to matching RIDs
 * 
 * @returns {Object} { success: boolean, count: number, message: string }
 */
function resetToDefault() {
  const startTime = new Date();
  const functionName = 'resetToDefault';
  Logger.log(`[${functionName}] Starting at ${startTime.toLocaleTimeString()}`);
  
  let result = "Success";
  let recordsAdded = 0;
  let errorMessage = "";
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const activeSheet = ss.getActiveSheet();
  
  try {
    // --- STEP 1: CONTEXT ---
    const managerName = activeSheet.getRange(INFOCUS_CONFIG.TARGET.managerCell).getValue();
    if (!managerName || String(managerName).trim() === "") {
      throw new Error("Manager name not found in cell " + INFOCUS_CONFIG.TARGET.managerCell);
    }
    Logger.log(`[${functionName}] Manager: ${managerName}`);
    
    // --- STEP 2: FIND SOURCE COLUMN ---
    const distroSheet = ss.getSheetByName(INFOCUS_CONFIG.SORT_SOURCE.sheetName);
    if (!distroSheet) {
      throw new Error("Sheet '" + INFOCUS_CONFIG.SORT_SOURCE.sheetName + "' not found.");
    }
    
    const distroLastCol = distroSheet.getLastColumn();
    const distroHeaders = distroSheet.getRange(1, 1, 1, distroLastCol).getValues()[0];
    
    // Find manager's column (case-insensitive match)
    const normalizedManager = String(managerName).toLowerCase().trim();
    let managerColIdx = -1;
    
    for (let i = 0; i < distroHeaders.length; i++) {
      if (String(distroHeaders[i]).toLowerCase().trim() === normalizedManager) {
        managerColIdx = i;
        break;
      }
    }
    
    if (managerColIdx === -1) {
      throw new Error(`Manager "${managerName}" not found in RID DISTRO header row.`);
    }
    
    Logger.log(`[${functionName}] Found manager column at index ${managerColIdx} (${distroHeaders[managerColIdx]})`);
    
    // --- STEP 3: GET DEFAULT ORDER ---
    const distroLastRow = getTrueLastRow_(distroSheet, columnToLetter_(managerColIdx + 1));
    if (distroLastRow <= 1) {
      throw new Error("No data found in RID DISTRO for this manager.");
    }
    
    const defaultRids = distroSheet.getRange(2, managerColIdx + 1, distroLastRow - 1, 1)
      .getValues()
      .flat()
      .filter(v => v !== "" && v != null)
      .map(String);
    
    Logger.log(`[${functionName}] Default RID count: ${defaultRids.length}`);
    
    // --- STEP 4: PRESERVE NOTES ---
    const targetStartRow = 3;
    const activeLastRow = Math.max(activeSheet.getLastRow(), targetStartRow);
    const targetRowCount = activeLastRow - targetStartRow + 1;
    
    // Read existing RIDs and Notes
    const existingDataRange = activeSheet.getRange(targetStartRow, 3, targetRowCount, 1);
    const existingRids = existingDataRange.getValues().flat().map(String);
    const existingNotes = existingDataRange.getNotes().flat();
    
    // Build Note Map: RID -> Note
    const noteMap = new Map();
    existingRids.forEach((rid, i) => {
      if (rid && existingNotes[i]) {
        noteMap.set(rid, existingNotes[i]);
      }
    });
    Logger.log(`[${functionName}] Preserved ${noteMap.size} notes.`);
    
    // --- STEP 5: REBUILD FORMULAS ---
    // Clear existing content and notes
    if (targetRowCount > 0) {
      activeSheet.getRange(targetStartRow, 3, targetRowCount, 1).clearContent().clearNote();
    }
    SpreadsheetApp.flush();
    
    // Build formulas array
    // Formula: =FILTER('RID DISTRO'!Row:Row, 'RID DISTRO'!$1:$1=$B$2)
    // Each row in the dashboard pulls the corresponding row from RID DISTRO
    const formulas = [];
    
    for (let i = 0; i < defaultRids.length; i++) {
      const distroRow = i + 2; // Row 2 is first data row in RID DISTRO (Row 1 is headers)
      // Formula that references the manager's column dynamically
      // =INDEX(FILTER('RID DISTRO'!2:2, 'RID DISTRO'!$1:$1=$B$2))
      // But since each row maps to a specific RID DISTRO row, we use:
      const formula = `=INDEX(FILTER('RID DISTRO'!${distroRow}:${distroRow}, 'RID DISTRO'!$1:$1=$B$2))`;
      formulas.push([formula]);
    }
    
    // Write formulas in batches
    if (formulas.length > 0) {
      const batchSize = 1000;
      for (let i = 0; i < formulas.length; i += batchSize) {
        const batch = formulas.slice(i, i + batchSize);
        activeSheet.getRange(targetStartRow + i, 3, batch.length, 1).setFormulas(batch);
        SpreadsheetApp.flush();
      }
    }
    
    // --- STEP 6: SYNC NOTES ---
    // Re-apply notes based on the default order
    const noteArray = defaultRids.map(rid => {
      return noteMap.has(rid) ? [noteMap.get(rid)] : [""];
    });
    
    if (noteArray.length > 0) {
      activeSheet.getRange(targetStartRow, 3, noteArray.length, 1).setNotes(noteArray);
    }
    
    recordsAdded = defaultRids.length;
    Logger.log(`[${functionName}] Successfully restored ${recordsAdded} formulas.`);
    
  } catch (error) {
    errorMessage = error.message;
    Logger.log(`[${functionName}] Error: ${errorMessage}`);
    result = "Fail";
  }
  
  // Log to Refresh sheet
  const duration = (new Date() - startTime) / 1000;
  try {
    const refreshSheet = ss.getSheetByName('Refresh');
    if (refreshSheet) {
      refreshSheet.appendRow([functionName, new Date(), recordsAdded, duration, result, errorMessage]);
    }
  } catch (logError) {
    Logger.log(`[${functionName}] Logging error: ${logError.message}`);
  }
  
  return {
    success: result === "Success",
    count: recordsAdded,
    message: result === "Success"
      ? `Reset complete. Restored ${recordsAdded} accounts to default order.`
      : `Reset failed: ${errorMessage}`
  };
}

/**
 * injectAIFormula() - Injects the AI-generated formula into STATCORE Col BE
 * 
 * @param {string} formula - The formula generated by AI (without leading =)
 * @returns {Object} { success: boolean, message: string }
 */
function injectAIFormula(formula) {
  const functionName = 'injectAIFormula';
  Logger.log(`[${functionName}] Injecting formula: ${formula}`);
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    const statcoreSheet = ss.getSheetByName(INFOCUS_CONFIG.MASTER_DATA.sheetName);
    if (!statcoreSheet) {
      throw new Error("STATCORE sheet not found.");
    }
    
    // Ensure formula starts with =
    const cleanFormula = formula.startsWith('=') ? formula : '=' + formula;
    
    // Inject into BE3 (first data row, helper column)
    const helperColNum = letterToColumn_(INFOCUS_CONFIG.MASTER_DATA.helperCol);
    const targetCell = statcoreSheet.getRange(3, helperColNum);
    
    // Clear the helper column first
    const lastRow = getTrueLastRow_(statcoreSheet, 'A');
    if (lastRow > 2) {
      statcoreSheet.getRange(3, helperColNum, lastRow - 2, 1).clearContent();
    }
    SpreadsheetApp.flush();
    
    // Set the ArrayFormula
    targetCell.setFormula(cleanFormula);
    SpreadsheetApp.flush();
    
    Logger.log(`[${functionName}] Formula injected successfully.`);
    
    return {
      success: true,
      message: "Formula injected into STATCORE column " + INFOCUS_CONFIG.MASTER_DATA.helperCol
    };
    
  } catch (error) {
    Logger.log(`[${functionName}] Error: ${error.message}`);
    return {
      success: false,
      message: "Failed to inject formula: " + error.message
    };
  }
}

/**
 * clearAIFilter() - Clears the helper column in STATCORE
 * @returns {Object} { success: boolean, message: string }
 */
function clearAIFilter() {
  const functionName = 'clearAIFilter';
  Logger.log(`[${functionName}] Clearing helper column.`);
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    const statcoreSheet = ss.getSheetByName(INFOCUS_CONFIG.MASTER_DATA.sheetName);
    if (!statcoreSheet) {
      throw new Error("STATCORE sheet not found.");
    }
    
    const helperColNum = letterToColumn_(INFOCUS_CONFIG.MASTER_DATA.helperCol);
    const lastRow = getTrueLastRow_(statcoreSheet, 'A');
    
    if (lastRow > 2) {
      statcoreSheet.getRange(3, helperColNum, lastRow - 2, 1).clearContent();
      SpreadsheetApp.flush();
    }
    
    return { success: true, message: "Filter cleared." };
    
  } catch (error) {
    Logger.log(`[${functionName}] Error: ${error.message}`);
    return { success: false, message: "Failed to clear filter: " + error.message };
  }
}

/**
 * getInFocusStatus() - Returns current filter status for sidebar
 * @returns {Object} { isFiltered: boolean, managerName: string, accountCount: number }
 */
function getInFocusStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const activeSheet = ss.getActiveSheet();
  
  try {
    const managerName = activeSheet.getRange(INFOCUS_CONFIG.TARGET.managerCell).getValue();
    
    // Check if C3 contains a formula (default) or static value (filtered)
    const c3Cell = activeSheet.getRange('C3');
    const c3Formula = c3Cell.getFormula();
    const isFiltered = !c3Formula || c3Formula === "";
    
    // Count non-empty cells in Column C starting from C3
    const lastRow = activeSheet.getLastRow();
    let accountCount = 0;
    if (lastRow >= 3) {
      const values = activeSheet.getRange(3, 3, lastRow - 2, 1).getValues().flat();
      accountCount = values.filter(v => v !== "" && v != null).length;
    }
    
    return {
      isFiltered: isFiltered,
      managerName: String(managerName || ""),
      accountCount: accountCount,
      sheetName: activeSheet.getName()
    };
    
  } catch (error) {
    Logger.log("[getInFocusStatus] Error: " + error.message);
    return {
      isFiltered: false,
      managerName: "",
      accountCount: 0,
      sheetName: ""
    };
  }
}

// =============================================================
// SECTION 3: AI PROMPT BUILDER
// =============================================================

/**
 * buildInFocusPrompt() - Constructs the full AI prompt for Gemini
 * 
 * Components:
 * A. Role & Goal
 * B. Data Map (Schema)
 * C. Temporal Anchor (Today's Date)
 * D. Business Thesaurus (Ambiguity Solver)
 * E. Output Format (JSON)
 * 
 * @param {string} userQuery - Natural language query from user
 * @returns {string} Full prompt for AI
 */
function buildInFocusPrompt(userQuery) {
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  
  // A. Role & Goal
  const rolePrompt = `You are a Google Sheets Formula Expert. Your goal is to write a filtering ARRAYFORMULA for Row 3 of the 'STATCORE' sheet that will populate Column BE with TRUE/FALSE values.

The formula must evaluate each row and return TRUE for rows that match the user's criteria, FALSE otherwise.`;

  // B. Data Map
  const dataMapPrompt = `## DATA SCHEMA
Use the following field definitions when building your formula:

${DATA_KEY_SCHEMA}

**Important**: 
- STATCORE data starts at Row 3 (Row 2 is headers)
- Use ARRAYFORMULA to apply logic to all rows
- Column A contains RID (unique identifier)
- Return TRUE/FALSE for each row`;

  // C. Temporal Anchor
  const datePrompt = `## DATE CONTEXT
Today's Date is: ${today}

When the user mentions:
- "Last Month" = Previous calendar month
- "This Month" = Current calendar month
- "Recent" = Last 30 days
- "Expired" = Date is before ${today}
- "Expiring Soon" = Within next 30-45 days`;

  // D. Business Thesaurus
  const thesaurusPrompt = `## BUSINESS LOGIC DEFAULTS

Apply these interpretations:

**Status Terms:**
- "Active" = STATUS column = 'Active' (ignore 'Pending Cancellation')
- "At Risk" = Contract Alerts contains 'EXP' OR No Bookings is not empty
- "Churning" / "Canceling" = STATUS contains 'Pending' or 'Cancel'
- "Expired" = Current Term End Date < TODAY()

**Product Terms:**
- "Pro" = System Type = 'Pro' OR Exclusive Pricing contains 'Pro'
- "Core" = System Type = 'Core' OR Exclusive Pricing contains 'Core'
- "Basic" = System Type = 'Basic' OR Exclusive Pricing contains 'Basic'

**AM Engagement Terms (Account Manager contact/activity - tasks, meetings, events):**
- "Haven't talked to" / "No engagement" / "Need to reach out" / "Haven't contacted" = Column AU (Last Updated) is empty OR is older than 30 days
  Formula pattern: (AU3:AU="") for empty, or (AU3:AU < TODAY()-30) for old dates
- "Recently engaged" / "Talked to recently" / "Recently contacted" = Column AU has a date within last 14 days
  Formula pattern: (AU3:AU >= TODAY()-14)
- "Stale" / "Neglected" / "No recent contact" = Column AU is empty OR older than 60 days
- CRITICAL: Use Column AU for AM engagement. Do NOT use Column AH (No Bookings) for engagement queries.

**Performance Terms (Business metrics - bookings, revenue, covers):**
- "Zero bookings" / "No bookings" / "Dead" = Column AH (No Bookings) is not empty
  Formula pattern: (AH3:AH<>"")
- "Best" / "Top" / "High performing" = Sort by Total Revenue or Fullbook Covers descending
- "Low performing" / "Underperforming" = CVR Last Month columns are zero or very low
- "At risk" (performance) = Column AH is not empty OR Column AG (Contract Alerts) contains 'EXP'
- CRITICAL: Use Column AH for booking/performance. This is DIFFERENT from AM engagement (Column AU).

**Location Terms:**
- "Denver" / "LA" / city names = Match against Column G (Metro)
  Formula pattern: (G3:G="Denver")
- "Downtown" / neighborhood names = Match against Column H (Macro) or Column I (Neighborhood)

**Cross-Sheet Lookups:**
If the user asks for Revenue/Covers data that lives in DISTRO:
- Use: XLOOKUP(A3, 'RID DISTRO'!A:A, 'RID DISTRO'![Target Column])`;

  // E. Output Format
  const outputPrompt = `## OUTPUT FORMAT

IMPORTANT: Be concise. Return ONLY the JSON below - no explanation, no reasoning, no markdown.

{
  "formula": "=ARRAYFORMULA(IF(A3:A=\"\", \"\", [YOUR LOGIC]))",
  "logic_summary": "Filters for [Column Name] = 'value' AND [Column Name] condition",
  "confidence": "High"
}

**Example formulas (replace [VALUE] with user's input):**
- Metro filter: =ARRAYFORMULA(IF(A3:A="", "", G3:G="[METRO_NAME]"))
- Column is empty: =ARRAYFORMULA(IF(A3:A="", "", AU3:AU=""))
- Column is NOT empty: =ARRAYFORMULA(IF(A3:A="", "", AH3:AH<>""))
- Metro AND no engagement: =ARRAYFORMULA(IF(A3:A="", "", (G3:G="[METRO_NAME]")*(AU3:AU="")))
- Status filter: =ARRAYFORMULA(IF(A3:A="", "", I3:I="[STATUS_VALUE]"))
- Text contains: =ARRAYFORMULA(IF(A3:A="", "", ISNUMBER(SEARCH("[TEXT]", AG3:AG))))
- At risk in metro: =ARRAYFORMULA(IF(A3:A="", "", (G3:G="[METRO_NAME]")*((AH3:AH<>"")+(ISNUMBER(SEARCH("EXP", AG3:AG))))>0))

**CRITICAL SYNTAX RULES:**
- Empty check: ="" (two quotes)
- Not empty check: <>"" (two quotes after <>)
- NEVER write <>" or =" - always use TWO quotes: "" 

**Rules:**
- ARRAYFORMULA returning TRUE/FALSE (use * for AND, + with >0 for OR)
- Handle empty rows with IF(A3:A="", "", ...)
- Double-check all quotes are properly closed (e.g., <>"" not <>")
- No markdown code blocks
- No extra text before or after the JSON
- In logic_summary: Use COLUMN HEADER NAMES (e.g., "Metro", "Status", "Last Updated"), NOT column letters`;

  // Full Prompt Assembly
  const fullPrompt = `${rolePrompt}

${dataMapPrompt}

${datePrompt}

${thesaurusPrompt}

${outputPrompt}

## USER REQUEST
"${userQuery}"

Generate the formula now:`;

  return fullPrompt;
}

/**
 * parseAIResponse() - Parses the AI response JSON
 * @param {string} responseText - Raw AI response
 * @returns {Object} { formula: string, logic_summary: string, confidence: string, error: string }
 */
function parseAIResponse(responseText) {
  try {
    // Try to extract JSON from response
    let jsonStr = responseText;
    
    // Handle markdown code blocks
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    // Try to find JSON object in response
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) {
      jsonStr = objMatch[0];
    }
    
    const parsed = JSON.parse(jsonStr);
    
    return {
      formula: parsed.formula || "",
      logic_summary: parsed.logic_summary || "No summary provided",
      confidence: parsed.confidence || "Unknown",
      error: null
    };
    
  } catch (error) {
    Logger.log("[parseAIResponse] Parse error: " + error.message);
    return {
      formula: "",
      logic_summary: "",
      confidence: "",
      error: "Failed to parse AI response: " + error.message
    };
  }
}

// =============================================================
// SECTION 4: GEMINI API INTEGRATION
// =============================================================

/**
 * callGeminiAPI() - Sends prompt to Gemini and returns parsed response
 * 
 * @param {string} userQuery - The natural language query from user
 * @returns {Object} { success: boolean, formula: string, logic_summary: string, confidence: string, error: string }
 */
function callGeminiAPI(userQuery) {
  const functionName = 'callGeminiAPI';
  Logger.log(`[${functionName}] Processing query: ${userQuery}`);
  
  try {
    // Get API key from Script Properties
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in Script Properties. Please add it in Project Settings.');
    }
    
    // Build the full prompt
    const fullPrompt = buildInFocusPrompt(userQuery);
    
    // Gemini API endpoint (using Gemini 3 Flash for speed)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
    
    // Request payload
    const payload = {
      contents: [{
        parts: [{
          text: fullPrompt
        }]
      }],
      generationConfig: {
        temperature: 0.2,  // Lower temperature for more deterministic formula output
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 4096,
        thinkingConfig: {
          thinkingLevel: "LOW"  // Minimize reasoning latency
        }
      }
    };
    
    // Make API request
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    Logger.log(`[${functionName}] Calling Gemini API...`);
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    Logger.log(`[${functionName}] Response code: ${responseCode}`);
    
    if (responseCode !== 200) {
      const errorData = JSON.parse(responseText);
      throw new Error(`Gemini API error (${responseCode}): ${errorData.error?.message || responseText}`);
    }
    
    // Parse Gemini response
    const geminiResponse = JSON.parse(responseText);
    Logger.log(`[${functionName}] Full Gemini response: ${JSON.stringify(geminiResponse, null, 2)}`);
    
    // Handle different response structures (Gemini 3 may vary)
    let generatedText = null;
    
    // Standard path
    if (geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text) {
      generatedText = geminiResponse.candidates[0].content.parts[0].text;
    }
    // Check for thinking/reasoning output in Gemini 3
    else if (geminiResponse.candidates?.[0]?.content?.parts) {
      // Gemini 3 may have multiple parts (thinking + response)
      const parts = geminiResponse.candidates[0].content.parts;
      for (const part of parts) {
        if (part.text) {
          generatedText = part.text;
          break;
        }
      }
    }
    // Check for blocked/filtered response
    else if (geminiResponse.candidates?.[0]?.finishReason) {
      const reason = geminiResponse.candidates[0].finishReason;
      if (reason === 'SAFETY') {
        throw new Error('Response blocked by safety filter. Try rephrasing your query.');
      } else if (reason === 'RECITATION') {
        throw new Error('Response blocked due to recitation policy.');
      } else {
        throw new Error(`Generation stopped: ${reason}`);
      }
    }
    // Check for prompt feedback (blocked before generation)
    else if (geminiResponse.promptFeedback?.blockReason) {
      throw new Error(`Prompt blocked: ${geminiResponse.promptFeedback.blockReason}`);
    }
    
    if (!generatedText) {
      Logger.log(`[${functionName}] Unexpected response structure: ${responseText}`);
      throw new Error('No text generated by Gemini. Check Apps Script logs for details.');
    }
    
    Logger.log(`[${functionName}] Raw Gemini response: ${generatedText}`);
    
    // Parse the JSON from Gemini's response
    const parsed = parseAIResponse(generatedText);
    
    if (parsed.error) {
      throw new Error(parsed.error);
    }
    
    if (!parsed.formula) {
      throw new Error('Gemini did not return a valid formula');
    }
    
    Logger.log(`[${functionName}] Parsed formula: ${parsed.formula}`);
    Logger.log(`[${functionName}] Logic summary: ${parsed.logic_summary}`);
    
    return {
      success: true,
      formula: parsed.formula,
      logic_summary: parsed.logic_summary,
      confidence: parsed.confidence,
      error: null
    };
    
  } catch (error) {
    Logger.log(`[${functionName}] Error: ${error.message}`);
    return {
      success: false,
      formula: "",
      logic_summary: "",
      confidence: "",
      error: error.message
    };
  }
}

/**
 * runInFocusQuery() - Main entry point for sidebar
 * Orchestrates: AI call → Formula injection → Sync filtered accounts
 * 
 * @param {string} userQuery - Natural language query
 * @returns {Object} { success: boolean, count: number, logic_summary: string, confidence: string, message: string }
 */
function runInFocusQuery(userQuery) {
  const functionName = 'runInFocusQuery';
  const startTime = new Date();
  Logger.log(`[${functionName}] Starting with query: ${userQuery}`);
  
  try {
    // Step 1: Validate the active sheet
    const validation = validateInFocusSheet();
    if (!validation.isValid) {
      return {
        success: false,
        count: 0,
        logic_summary: "",
        confidence: "",
        message: validation.error
      };
    }
    
    // Step 2: Call Gemini API
    const aiResult = callGeminiAPI(userQuery);
    if (!aiResult.success) {
      return {
        success: false,
        count: 0,
        logic_summary: "",
        confidence: "",
        message: "AI Error: " + aiResult.error
      };
    }
    
    // Step 3: Inject formula into STATCORE Col BE
    const injectResult = injectAIFormula(aiResult.formula);
    if (!injectResult.success) {
      return {
        success: false,
        count: 0,
        logic_summary: aiResult.logic_summary,
        confidence: aiResult.confidence,
        message: injectResult.message
      };
    }
    
    // Step 4: Wait for formula to calculate
    SpreadsheetApp.flush();
    Utilities.sleep(500); // Brief pause for formula evaluation
    
    // Step 5: Sync filtered accounts to active sheet
    const syncResult = syncFilteredAccounts();
    
    // Log to Refresh sheet
    const duration = (new Date() - startTime) / 1000;
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const refreshSheet = ss.getSheetByName('Refresh');
      if (refreshSheet) {
        refreshSheet.appendRow([functionName, new Date(), syncResult.count, duration, syncResult.success ? "Success" : "Fail", userQuery]);
      }
    } catch (logError) {
      Logger.log(`[${functionName}] Logging error: ${logError.message}`);
    }
    
    return {
      success: syncResult.success,
      count: syncResult.count,
      logic_summary: aiResult.logic_summary,
      confidence: aiResult.confidence,
      message: syncResult.message,
      formula: aiResult.formula  // Include for debugging
    };
    
  } catch (error) {
    Logger.log(`[${functionName}] Error: ${error.message}`);
    return {
      success: false,
      count: 0,
      logic_summary: "",
      confidence: "",
      message: "Error: " + error.message
    };
  }
}

// =============================================================
// SECTION 5: SETUP & TESTING
// =============================================================

/**
 * listMetroValues() - Show unique Metro values in STATCORE
 * Run from Script Editor to see exact Metro names
 */
function listMetroValues() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const statcore = ss.getSheetByName('STATCORE');
  if (!statcore) return;
  
  const lastRow = getTrueLastRow_(statcore, 'A');
  const metroCol = 7; // Column G
  const metros = statcore.getRange(3, metroCol, lastRow - 2, 1).getValues().flat();
  
  const uniqueMetros = [...new Set(metros.filter(m => m && m !== ''))].sort();
  
  Logger.log('Unique Metro values (' + uniqueMetros.length + '):');
  uniqueMetros.forEach(m => Logger.log('  - "' + m + '"'));
  
  SpreadsheetApp.getUi().alert('Metro Values', 'Found ' + uniqueMetros.length + ' unique metros.\n\nFirst 20:\n' + uniqueMetros.slice(0, 20).join('\n'), SpreadsheetApp.getUi().ButtonSet.OK);
  
  return uniqueMetros;
}

/**
 * debugInFocusFilter() - Check what's in the helper column after a filter
 * Run from Script Editor to see formula results
 */
function debugInFocusFilter() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const statcore = ss.getSheetByName('STATCORE');
  const activeSheet = ss.getActiveSheet();
  
  if (!statcore) {
    Logger.log('STATCORE not found');
    return;
  }
  
  const helperColNum = letterToColumn_(INFOCUS_CONFIG.MASTER_DATA.helperCol); // BE = 57
  const lastRow = getTrueLastRow_(statcore, 'A');
  
  // Get the formula in BE3
  const formulaCell = statcore.getRange(3, helperColNum);
  const formula = formulaCell.getFormula();
  Logger.log('Formula in BE3: ' + formula);
  
  // Get values in helper column
  const helperValues = statcore.getRange(3, helperColNum, Math.min(lastRow - 2, 100), 1).getValues().flat();
  
  // Count TRUE values
  let trueCount = 0;
  let falseCount = 0;
  let emptyCount = 0;
  let errorCount = 0;
  
  helperValues.forEach(v => {
    if (v === true || String(v).toUpperCase() === 'TRUE') trueCount++;
    else if (v === false || String(v).toUpperCase() === 'FALSE') falseCount++;
    else if (v === '' || v === null) emptyCount++;
    else if (String(v).startsWith('#')) errorCount++;
  });
  
  Logger.log(`Helper column (first 100 rows): TRUE=${trueCount}, FALSE=${falseCount}, Empty=${emptyCount}, Errors=${errorCount}`);
  
  // Get manager name from active sheet
  const managerName = activeSheet.getRange('B2').getValue();
  Logger.log('Active Sheet Manager: ' + managerName);
  
  // Check manager columns
  const amCol1 = letterToColumn_(INFOCUS_CONFIG.MASTER_DATA.managerCol1); // N = 14
  const amCol2 = letterToColumn_(INFOCUS_CONFIG.MASTER_DATA.managerCol2); // AU = 47
  
  // Count rows matching manager
  const allData = statcore.getRange(3, 1, Math.min(lastRow - 2, 100), Math.max(amCol2, helperColNum)).getValues();
  let managerMatchCount = 0;
  let managerAndTrueCount = 0;
  
  const normalizedManager = String(managerName).toLowerCase().trim();
  
  allData.forEach((row, i) => {
    const am1 = String(row[amCol1 - 1] || '').toLowerCase().trim();
    const am2 = String(row[amCol2 - 1] || '').toLowerCase().trim();
    const helperVal = row[helperColNum - 1];
    
    if (am1 === normalizedManager || am2 === normalizedManager) {
      managerMatchCount++;
      if (helperVal === true || String(helperVal).toUpperCase() === 'TRUE') {
        managerAndTrueCount++;
      }
    }
  });
  
  Logger.log(`Manager "${managerName}" matches (first 100): ${managerMatchCount} rows`);
  Logger.log(`Manager + Helper=TRUE: ${managerAndTrueCount} rows`);
  
  // Show sample of helper column values
  Logger.log('Sample helper values: ' + JSON.stringify(helperValues.slice(0, 10)));
  
  SpreadsheetApp.getActiveSpreadsheet().toast(
    `TRUE: ${trueCount}, FALSE: ${falseCount}, Empty: ${emptyCount}, Errors: ${errorCount}\nManager matches: ${managerMatchCount}, With TRUE: ${managerAndTrueCount}`,
    'InFocus Debug',
    10
  );
  
  return {
    formula: formula,
    trueCount: trueCount,
    falseCount: falseCount,
    emptyCount: emptyCount,
    errorCount: errorCount,
    managerMatchCount: managerMatchCount,
    managerAndTrueCount: managerAndTrueCount
  };
}

/**
 * testGeminiConnection() - Run this from Script Editor to test API + force reauth
 * Menu: Run > testGeminiConnection
 */
function testGeminiConnection() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    // This line forces the external_request permission prompt
    const testFetch = UrlFetchApp.fetch('https://www.google.com');
    Logger.log('UrlFetchApp permission: OK');
    
    // Check for API key
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) {
      ui.alert('❌ Missing API Key', 'GEMINI_API_KEY not found in Script Properties.\n\nGo to Project Settings > Script Properties to add it.', ui.ButtonSet.OK);
      return;
    }
    Logger.log('API Key: Found');
    
    // Test Gemini API (Gemini 3 Flash)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: 'Say "InFocus Ready" in exactly 2 words.' }] }]
    };
    
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    const code = response.getResponseCode();
    const responseText = response.getContentText();
    Logger.log('Gemini Response: ' + responseText);
    
    if (code === 200) {
      const parsed = JSON.parse(responseText);
      // Try to extract text from various possible locations
      let text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text && parsed.candidates?.[0]?.content?.parts) {
        for (const part of parsed.candidates[0].content.parts) {
          if (part.text) { text = part.text; break; }
        }
      }
      
      if (text) {
        ui.alert('✅ Success!', `Gemini 3 Pro working!\n\nResponse: "${text.substring(0, 100)}..."`, ui.ButtonSet.OK);
        Logger.log('Gemini API: OK - ' + text);
      } else {
        ui.alert('⚠️ Partial Success', `API responded but no text found.\n\nCheck Logs (View > Logs) for full response structure.`, ui.ButtonSet.OK);
        Logger.log('Response structure: ' + JSON.stringify(parsed, null, 2));
      }
    } else {
      const error = JSON.parse(responseText);
      ui.alert('❌ API Error', `Code: ${code}\n\n${error.error?.message || responseText}`, ui.ButtonSet.OK);
    }
    
  } catch (e) {
    ui.alert('❌ Error', e.message, ui.ButtonSet.OK);
    Logger.log('Error: ' + e.message);
  }
}

// =============================================================
// SECTION 6: HELPER UTILITIES
// =============================================================

/**
 * Converts column letter to number (A=1, B=2, etc.)
 * @param {string} letter - Column letter(s)
 * @returns {number} Column number (1-indexed)
 */
function letterToColumn_(letter) {
  let column = 0;
  const length = letter.length;
  for (let i = 0; i < length; i++) {
    column += (letter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
  }
  return column;
}

/**
 * Converts column number to letter (1=A, 2=B, etc.)
 * @param {number} column - Column number (1-indexed)
 * @returns {string} Column letter(s)
 */
function columnToLetter_(column) {
  let temp, letter = '';
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

/**
 * Validates that the active sheet is a valid AM dashboard
 * @returns {Object} { isValid: boolean, error: string }
 */
function validateInFocusSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const activeSheet = ss.getActiveSheet();
  const sheetName = activeSheet.getName();
  
  // Exclude system sheets
  const systemSheets = ['STATCORE', 'DISTRO', 'SETUP', 'RID DISTRO', 'Focus20', 'Refresh', 'NOTE_CONFIG', 'Log', 'Sets', 'Launcher'];
  
  if (systemSheets.includes(sheetName)) {
    return {
      isValid: false,
      error: `Cannot use InFocus on system sheet "${sheetName}". Please select an AM dashboard tab.`
    };
  }
  
  // Check for manager name in B2
  const managerName = activeSheet.getRange('B2').getValue();
  if (!managerName || String(managerName).trim() === "") {
    return {
      isValid: false,
      error: "No manager name found in cell B2. Please select a valid AM dashboard."
    };
  }
  
  return {
    isValid: true,
    error: null
  };
}
