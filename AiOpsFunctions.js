/**
 * =============================================================
 * FILE: AiOpsFunctions.gs
 * PURPOSE: AI Integration, Sidebar Data, & AM Summary Dashboard
 * ARCHITECTURE: Thick Client (Supports Pro Sidebar)
 * =============================================================
 */

const CACHE_KEY_AMS = "SIDEBAR_DATA_AMS";
const CACHE_KEY_ACCOUNTS = "SIDEBAR_DATA_ACCOUNTS";
const CACHE_DURATION = 21600; // 6 Hours

// 🟢 CONFIGURATION: AI Brief Data
const ACCOUNT_DATA_MAP = {
  'DISTRO': { 
    keyCol: 'rid', 
    headerRow: 1, 
    extract: [
      'Active PI', 'CVR Last Month – RestRef', 'CVR Last Month – Direct', 'CVR Last Month – Discovery',
      'CVR Last Month – Phone/Walkin', 'CVR Last Month – Network', 'CVR Last Month – Fullbook',
      'CVR Last Month – Google', 'CVRs LM – Discovery %', 'CVRs LM – Direct %', 
      'Google % Avg. 12m', 'CVRs – Discovery % Avg. 12m', 'CVRs 12m Avg. – Google', 
      'AutoTags Active – Last 30', 'Check Avg. Last 30', 'CVRs 12m Avg. – FullBook', 
      'CVRs 12m Avg. – Phone/Walkin', 'CVRs 12m Avg. – Network', 'CVRs 12m Avg. – Restref', 
      'CVRs 12m Avg. – Dir', 'CVRs 12m Avg. – Disc', 'Revenue – Total 12m Avg.', 
      'Revenue – Subs Last Month', 'POS Match %', 
      'PRO – Last Sent', 'CHRM – Max Party', 'CHRM – CC Req Min', 'CHRM – Days in Advance',
      'Disco % Current', 'Revenue – Total Last Month', 'Disco % MoM (+/‑)', 'Disco % WoW (+/‑)',
      'Rev Yield – Total Last Month', 'POS Type'
    ] 
  },
  'STATCORE': { 
    keyCol: 'rid', 
    headerRow: 2, 
    extract: [
      'RID', 'Current Term End Date', 'Account ID', 'Parent Account ID', 'Account Name', 
      'Parent Account', 'Status', 'Account_Status', 'Restaurant Status', 
      'METRO', 'MACRO', 'NEIGHBORHOOD',
      'Account Manager', 'Inside Sales Representative', 'Payment Method', 'Total Due', 
      'Past Due', 'Customer Since', 'Price', 'System Status', 'System Type', 
      'Standard / Direct Cvrs', 'Stripe Status', 'Rest. Quality'
    ] 
  }
};

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// =============================================================
// SECTION 1: SIDEBAR DATA API
// =============================================================

function refreshSidebarCache() {
  try {
    const ams = getAMList();
    const accounts = getAccountListForSidebar();
    const cache = CacheService.getUserCache();
    if (ams.length) cache.put(CACHE_KEY_AMS, JSON.stringify(ams), CACHE_DURATION);
    if (accounts.length) cache.put(CACHE_KEY_ACCOUNTS, JSON.stringify(accounts), CACHE_DURATION);
    console.log("✅ Sidebar Data Cached.");
  } catch (e) { console.error("Cache Error", e); }
}

function getSidebarData() {
  const cache = CacheService.getUserCache();
  let ams = null, accounts = null;
  try {
    const cAms = cache.get(CACHE_KEY_AMS);
    const cAcc = cache.get(CACHE_KEY_ACCOUNTS);
    if (cAms) ams = JSON.parse(cAms);
    if (cAcc) accounts = JSON.parse(cAcc);
  } catch (e) {}
  if (!ams) ams = getAMList();
  if (!accounts) accounts = getAccountListForSidebar();
  return { ams, accounts };
}

function getAMList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('STATCORE');
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 3) return [];
  const headers = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
  const data = sheet.getRange(3, 1, lastRow - 2, lastCol).getValues();
  let amIdx = headers.findIndex(h => String(h).toLowerCase().replace(/[^a-z0-9]/g, "").includes("accountmanager"));
  if (amIdx === -1 && headers.length > 13) amIdx = 13;
  const amSet = new Set();
  data.forEach(row => {
    const am = row[amIdx];
    if (am && String(am).trim() !== "") amSet.add(String(am).trim());
  });
  return Array.from(amSet).sort();
}

/**
 * 🟢 FIX v2: ROBUST METRO/MACRO EXTRACTION
 * 1. Uses fuzzy matching to find columns.
 * 2. Applies coalescing (Macro -> Neighborhood) to handle empty data.
 * 3. Properly handles null/undefined cell values (prevents "null" string bug).
 * 4. Trims data to avoid whitespace issues.
 */
function getAccountListForSidebar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('STATCORE');
  if (!sheet) return [];
  
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) return [];

  const headers = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
  const data = sheet.getRange(3, 1, lastRow - 2, lastCol).getValues();

  // 🟢 HELPER: Safe string conversion (fixes null/undefined bug)
  const safeStr = (val) => {
    if (val == null || val === "") return "";
    const str = String(val).trim();
    // Guard against literal "null" or "undefined" strings from coercion edge cases
    if (str === "null" || str === "undefined") return "";
    return str;
  };

  // 🟢 LEGACY FINDER: Robust fuzzy matching with normalized headers
  const findCol = (keyword) => {
    const normalizedKeyword = keyword.toLowerCase().replace(/[^a-z0-9]/g, "");
    return headers.findIndex(h => 
      String(h).toLowerCase().replace(/[^a-z0-9]/g, "").includes(normalizedKeyword)
    );
  };

  const IDX_RID = findCol("rid");
  const IDX_NAME = findCol("accountname") > -1 ? findCol("accountname") : findCol("name");
  
  // Fuzzy match "metro" -> matches "METRO", "Metro Area", etc.
  const IDX_METRO = findCol("metro"); 

  // Fuzzy match "macro" -> matches "MACRO", "MacroName", etc.
  // Priority: "macro" first (exact), then fallback to "neighborhood" via coalescing
  let IDX_MACRO = findCol("macro");
  
  // Fuzzy match "neighborhood"
  const IDX_NBHD = findCol("neighborhood");

  // 🔍 DEBUG LOG: Active to troubleshoot column detection
  console.log(`[getAccountListForSidebar] Column indices: RID=${IDX_RID}, NAME=${IDX_NAME}, METRO=${IDX_METRO}, MACRO=${IDX_MACRO}, NBHD=${IDX_NBHD}`);
  console.log(`[getAccountListForSidebar] Headers (first 20): ${headers.slice(0, 20).join(' | ')}`);
  
  // Log specific header names at found indices
  if (IDX_METRO > -1) console.log(`[getAccountListForSidebar] METRO header at idx ${IDX_METRO}: "${headers[IDX_METRO]}"`);
  if (IDX_MACRO > -1) console.log(`[getAccountListForSidebar] MACRO header at idx ${IDX_MACRO}: "${headers[IDX_MACRO]}"`);
  if (IDX_NBHD > -1) console.log(`[getAccountListForSidebar] NBHD header at idx ${IDX_NBHD}: "${headers[IDX_NBHD]}"`);

  const accountList = [];
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    const rid = safeStr(row[IDX_RID]);
    const name = safeStr(row[IDX_NAME]);
    
    // Skip rows without RID or Name
    if (!rid || !name) continue;
    
    // 🟢 METRO: Extract with null-safe handling
    const metro = (IDX_METRO > -1) ? safeStr(row[IDX_METRO]) : "";
    
    // 🟢 MACRO: Coalescing logic - Try Macro first, if empty use Neighborhood
    let macroVal = "";
    if (IDX_MACRO > -1) {
      macroVal = safeStr(row[IDX_MACRO]);
    }
    
    // Fallback to Neighborhood if Macro is empty
    if (!macroVal && IDX_NBHD > -1) {
      macroVal = safeStr(row[IDX_NBHD]);
    }

    accountList.push({
      rid: rid,
      name: name,
      metro: metro,
      macro: macroVal, 
      neighborhood: macroVal // Redundancy for UI safety
    });
  }
  
  return accountList;
}

/**
 * Global Account Search
 * Scans STATCORE for accounts matching the query (RID or Name)
 */
function searchGlobalAccount(query) {
  const accounts = getAccountListForSidebar(); // Reuses existing robust fetcher
  if (!query) return { success: false, error: "No query provided" };
  
  const q = String(query).toLowerCase().trim();
  const matches = accounts.filter(a => 
    String(a.rid).includes(q) || 
    String(a.name).toLowerCase().includes(q)
  ).slice(0, 5); // Limit to top 5 matches
  
  return { success: true, matches: matches };
}

/**
 * 🔍 DIAGNOSTIC: Debug function to inspect STATCORE column headers
 * Call this from Apps Script editor to troubleshoot metro/macro column issues.
 * Usage: Run debugSTATCOREHeaders() and check the Logs (Ctrl+Enter)
 */
function debugSTATCOREHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('STATCORE');
  
  if (!sheet) {
    console.log("❌ STATCORE sheet not found!");
    return { error: "STATCORE sheet not found" };
  }
  
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
  
  // Normalize helper
  const normalize = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  
  // Find specific columns
  const findCol = (keyword) => {
    const normalizedKeyword = normalize(keyword);
    return headers.findIndex(h => normalize(h).includes(normalizedKeyword));
  };
  
  const results = {
    totalColumns: lastCol,
    headerRow: 2,
    allHeaders: headers.map((h, i) => ({ index: i, name: h, normalized: normalize(h) })),
    columnMatches: {
      rid: findCol("rid"),
      accountname: findCol("accountname"),
      name: findCol("name"),
      metro: findCol("metro"),
      macro: findCol("macro"),
      neighborhood: findCol("neighborhood")
    }
  };
  
  // Sample first data row for verification
  const firstDataRow = sheet.getRange(3, 1, 1, lastCol).getValues()[0];
  results.sampleData = {
    rid: firstDataRow[results.columnMatches.rid],
    metro: results.columnMatches.metro > -1 ? firstDataRow[results.columnMatches.metro] : "(column not found)",
    macro: results.columnMatches.macro > -1 ? firstDataRow[results.columnMatches.macro] : "(column not found)",
    neighborhood: results.columnMatches.neighborhood > -1 ? firstDataRow[results.columnMatches.neighborhood] : "(column not found)"
  };
  
  console.log("📊 STATCORE Header Debug:");
  console.log(JSON.stringify(results, null, 2));
  
  // Alert summary
  const metro_col = results.columnMatches.metro;
  const macro_col = results.columnMatches.macro;
  const nbhd_col = results.columnMatches.neighborhood;
  
  console.log("\n📌 SUMMARY:");
  console.log(`  METRO column: ${metro_col > -1 ? `Found at index ${metro_col} ("${headers[metro_col]}")` : "❌ NOT FOUND"}`);
  console.log(`  MACRO column: ${macro_col > -1 ? `Found at index ${macro_col} ("${headers[macro_col]}")` : "❌ NOT FOUND"}`);
  console.log(`  NEIGHBORHOOD column: ${nbhd_col > -1 ? `Found at index ${nbhd_col} ("${headers[nbhd_col]}")` : "❌ NOT FOUND"}`);
  
  return results;
}

/**
 * 🔍 TEST: Full end-to-end test of Metro/Macro data flow
 * Run this from Apps Script editor to test without using the sidebar.
 * Optionally pass a test RID, or it will use the first account found.
 */
function testMetroMacroDataFlow(testRid) {
  console.log("========================================");
  console.log("🧪 TESTING METRO/MACRO DATA FLOW");
  console.log("========================================\n");
  
  // Step 1: Test getAccountListForSidebar()
  console.log("📋 STEP 1: Testing getAccountListForSidebar()...");
  const accounts = getAccountListForSidebar();
  console.log(`   Found ${accounts.length} accounts`);
  
  if (accounts.length === 0) {
    console.error("❌ FAILED: No accounts returned!");
    return { success: false, error: "No accounts returned from getAccountListForSidebar()" };
  }
  
  // Find test account
  let testAccount = accounts[0];
  if (testRid) {
    const found = accounts.find(a => a.rid === String(testRid));
    if (found) testAccount = found;
    else console.warn(`   ⚠️ RID ${testRid} not found, using first account`);
  }
  
  console.log(`\n📋 STEP 2: Test Account Data:`);
  console.log(`   RID: ${testAccount.rid}`);
  console.log(`   Name: ${testAccount.name}`);
  console.log(`   Metro: "${testAccount.metro}" ${testAccount.metro ? '✅' : '❌ EMPTY'}`);
  console.log(`   Macro: "${testAccount.macro}" ${testAccount.macro ? '✅' : '❌ EMPTY'}`);
  console.log(`   Neighborhood: "${testAccount.neighborhood}" ${testAccount.neighborhood ? '✅' : '❌ EMPTY'}`);
  
  // Step 3: Simulate what the sidebar would send to BizInsights
  const mockConfig = {
    accountName: testAccount.name,
    rid: testAccount.rid,
    metro: testAccount.metro,
    macro: testAccount.macro,
    neighborhood: testAccount.neighborhood || testAccount.macro
  };
  
  console.log(`\n📋 STEP 3: Config that would be sent to createBizInsightsDeck():`);
  console.log(JSON.stringify(mockConfig, null, 2));
  
  // Check for issues
  const issues = [];
  if (!mockConfig.metro) issues.push("Metro is empty");
  if (!mockConfig.macro) issues.push("Macro is empty");
  if (!mockConfig.neighborhood) issues.push("Neighborhood is empty");
  
  if (issues.length > 0) {
    console.log(`\n⚠️ ISSUES DETECTED:`);
    issues.forEach(i => console.log(`   - ${i}`));
    console.log(`\n💡 Run debugSTATCOREHeaders() to check column detection.`);
  } else {
    console.log(`\n✅ All fields populated correctly!`);
  }
  
  console.log("\n========================================");
  console.log("🧪 TEST COMPLETE");
  console.log("========================================");
  
  return {
    success: issues.length === 0,
    testAccount: testAccount,
    mockConfig: mockConfig,
    issues: issues
  };
}

// =============================================================
// SECTION 2: CALCULATION ENGINE (PRESERVED)
// =============================================================

function generateAMSummary(amName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const statSheet = ss.getSheetByName('STATCORE');
  const distroSheet = ss.getSheetByName('DISTRO');
  
  if (!statSheet || !distroSheet) throw new Error("Missing Sheets");

  // A. GET DATA
  const sHead = statSheet.getRange(2, 1, 1, statSheet.getLastColumn()).getValues()[0];
  const sData = statSheet.getRange(3, 1, statSheet.getLastRow()-2, statSheet.getLastColumn()).getValues();
  
  const dHead = distroSheet.getRange(1, 1, 1, distroSheet.getLastColumn()).getValues()[0];
  const dData = distroSheet.getRange(2, 1, distroSheet.getLastRow()-1, distroSheet.getLastColumn()).getValues();

  // B. ROBUST COLUMN MAPPING
  const findCol = (headers, keyword) => headers.findIndex(h => 
    String(h).toLowerCase().replace(/[^a-z0-9]/g, "").includes(keyword.toLowerCase().replace(/[^a-z0-9]/g, ""))
  );

  const map = {
    // Statcore
    s_rid: findCol(sHead, "rid"),
    am: findCol(sHead, "accountmanager"),
    parent: findCol(sHead, "parentaccount"),
    status: findCol(sHead, "status"),
    accStatus: findCol(sHead, "accountstatus"),
    termEnd: findCol(sHead, "termenddate"),
    metro: findCol(sHead, "metro"),
    
    // System Mix
    sor: findCol(sHead, "systemofrecord"),
    sysType: findCol(sHead, "systemtype"),
    qual: findCol(sHead, "quality"),
    programs: findCol(sHead, "specialprograms"),
    pricing: findCol(sHead, "exclusivepricing"),
    l90: findCol(sHead, "l90"),
    
    // Features (Statcore)
    ib: findCol(sHead, "instantbooking"),
    pd: findCol(sHead, "privatedining"),
    lastEngaged: findCol(sHead, "lastengageddate"),

    // Distro
    d_rid: findCol(dHead, "rid"),
    subfees: findCol(dHead, "subslastmonth"), 
    yield: findCol(dHead, "revyield"),
    noBook: findCol(dHead, "nobookings"),
    disco: findCol(dHead, "discocurrent"),
    mom: findCol(dHead, "discomom"),
    xp: findCol(dHead, "activexp"),
    pi: findCol(dHead, "activepi"),
    piShare: findCol(dHead, "pirevshare"),
    pos: findCol(dHead, "posmatch"),
    pf: findCol(dHead, "partnerfeed")
  };

  // AM Column Fallback (Col N is index 13)
  if (map.am === -1) map.am = 13; 

  // C. BUILD LOOKUP MAP
  const dMap = new Map();
  dData.forEach(row => {
    if (row[map.d_rid]) dMap.set(String(row[map.d_rid]), row);
  });

  // D. AGGREGATION OBJECT
  const agg = {
    book: 0,
    groups: new Set(),
    termPending: 0, termExpired: 0, termWarn: 0,
    subSum: 0, subCnt: 0, yldSum: 0, yldCnt: 0,
    discoSum: 0, discoCnt: 0, momSum: 0, momCnt: 0,
    xp: 0, pi: 0, ib: 0, pd: 0, pfExcl: 0,
    piShareSum: 0, piShareCnt: 0, posSum: 0, posCnt: 0,
    l90: 0,
    engagedLast90: 0,  // Count of accounts with last engagement within 90 days
    metros: {}, sysTypes: {}, sors: {}, quals: {}, progs: {}, prices: {}, noBooks: {}
  };

  const today = new Date();
  const warnDate = new Date();
  warnDate.setDate(today.getDate() + 45);

  // E. PROCESS ROWS
  sData.forEach(row => {
    const rowAM = String(row[map.am] || "").trim();
    if (rowAM.toLowerCase() !== amName.toLowerCase().trim()) return;

    agg.book++;
    const rid = String(row[map.s_rid]);
    const dRow = dMap.get(rid);

    if (map.parent > -1 && row[map.parent]) agg.groups.add(row[map.parent]);

    // Status
    if (map.termEnd > -1) {
      const d = row[map.termEnd];
      if (d instanceof Date) {
        if (d < today) agg.termExpired++;
        else if (d <= warnDate) agg.termWarn++;
      }
    }
    const st = String(row[map.status]||"") + String(row[map.accStatus]||"");
    if (st.toLowerCase().includes("term") || st.toLowerCase().includes("cancel")) {
      agg.termPending++;
    }

    // Counters
    countVal(agg.metros, row, map.metro);
    countVal(agg.sysTypes, row, map.sysType);
    countVal(agg.sors, row, map.sor);
    countVal(agg.quals, row, map.qual);
    countVal(agg.progs, row, map.programs);
    countVal(agg.prices, row, map.pricing);
    
    if (map.l90 > -1) agg.l90 += (parseFloat(row[map.l90]) || 0);
    if (map.ib > -1 && isTrue(row[map.ib])) agg.ib++;
    if (map.pd > -1 && isTrue(row[map.pd])) agg.pd++;
    
    // Check last engagement date - count if within last 90 days
    if (map.lastEngaged > -1 && row[map.lastEngaged]) {
      const engagedDate = new Date(row[map.lastEngaged]);
      if (!isNaN(engagedDate.getTime())) {
        const daysDiff = Math.floor((today - engagedDate) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 90) agg.engagedLast90++;
      }
    }

    // Distro Metrics
    if (dRow) {
      addNum(agg, 'sub', dRow[map.subfees]);
      addNum(agg, 'yld', dRow[map.yield]);
      addNum(agg, 'disco', dRow[map.disco]);
      addNum(agg, 'mom', dRow[map.mom]);
      addNum(agg, 'piShare', dRow[map.piShare]);
      addNum(agg, 'pos', dRow[map.pos]);

      if (map.xp > -1 && isTrue(dRow[map.xp])) agg.xp++;
      if (map.pi > -1 && hasActivePI(dRow[map.pi])) agg.pi++;
      
      const pf = String(dRow[map.pf]||"").toUpperCase();
      if (pf.includes("EXCLUDED") || pf === "FALSE") agg.pfExcl++;
      
      countVal(agg.noBooks, dRow, map.noBook);
    }
  });

  return {
    book: agg.book,
    groups: agg.groups.size,
    termCanc: agg.termPending,
    termExpired: agg.termExpired,
    termWarn: agg.termWarn,
    subfees: calcAvg(agg.subSum, agg.subCnt, 0),
    yield: calcAvg(agg.yldSum, agg.yldCnt, 0),
    l90: agg.l90,
    engagedLast90: agg.engagedLast90,  // Accounts with last engagement within 90 days
    xp: agg.xp, pi: agg.pi, ib: agg.ib, pd: agg.pd, pfExc: agg.pfExcl,
    piRevShare: calcAvg(agg.piShareSum, agg.piShareCnt, 1) + "%",
    posMatch: calcAvg(agg.posSum, agg.posCnt, 0) + "%",
    disco: calcAvg(agg.discoSum, agg.discoCnt, 1) + "%",
    mom: calcAvg(agg.momSum, agg.momCnt, 1) + "%",
    metroList: sortObj(agg.metros, 3),
    sysTypeList: sortObj(agg.sysTypes, 5),
    sorList: sortObj(agg.sors, 5),
    qualityList: sortObj(agg.quals, 5),
    progList: sortObj(agg.progs, 5),
    priceList: sortObj(agg.prices, 5),
    noBookList: sortObj(agg.noBooks, 5)
  };
}

// =============================================================
// SECTION 3: BATCH EXPORT (Restored)
// =============================================================

function exportAllAMSummariesToSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const startTime = new Date();
  ss.toast("Compiling full data & creating Sheet...", "System", -1);
  const amList = getAMList(); 
  
  if (!amList || amList.length === 0) {
    ss.toast("No AMs found in STATCORE.", "Error"); return;
  }

  const headers = [
    "AM Name", "Total Book", "Groups", 
    "Term Pending", "Canceling", "Term Expired", "Term Warning", 
    "Avg Sub Fees", "Avg Yield", 
    "L90 Total", "XP Count", "Active PI", "Private Dining", "PI Rev Share %", "Disco %",
    "Partner Feed Issues", "POS Match %", "MoM Disco Change",
    "Top Metros", "System Types", "System of Record", "Quality Ratings", 
    "Special Programs", "Pricing Models", "No Booking Reasons"
  ];

  const dataRows = [];
  
  amList.forEach(amName => {
    try {
      const data = generateAMSummary(amName);
      const row = [
        amName, data.book, data.groups,
        data.termPending, data.termCanc, data.termExpired, data.termWarn,
        data.subfees, data.yield,
        data.l90,
        data.xp, data.pi, data.pd, data.piRevShare, data.disco,
        data.pfExc, data.posMatch, data.mom,
        // Lists
        flattenList_(data.metroList), flattenList_(data.sysTypeList), flattenList_(data.sorList),
        flattenList_(data.qualityList), flattenList_(data.progList), flattenList_(data.priceList), flattenList_(data.noBookList)
      ];
      dataRows.push(row);
    } catch (e) {
      dataRows.push([amName, "ERROR: " + e.message, ...Array(headers.length - 2).fill("")]);
    }
  });

  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd_HHmm");
  const fileName = `AM_Summary_Full_Export_${timestamp}`;
  const newSS = SpreadsheetApp.create(fileName);
  const sheet = newSS.getActiveSheet();
  
  if (dataRows.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(3, 1, dataRows.length, headers.length).setValues(dataRows);
    
    // Simple Styling
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f4f6");
    sheet.setFrozenRows(2);
    sheet.autoResizeColumns(1, headers.length);
  }

  showExportSuccessModal_(fileName, newSS.getUrl(), ((new Date() - startTime) / 1000).toFixed(1));
}

// =============================================================
// SECTION 4: SIMULATOR & AI (Restored & Fixed)
// =============================================================

function getGroupList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('STATCORE');
  if (!sh) return [];
  
  // 🔧 FIX: Use exact match for "Parent Account" to avoid matching "Parent Account ID"
  const headers = sh.getRange(2, 1, 1, sh.getLastColumn()).getValues()[0];
  const normalize = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  
  // Find column that matches "parentaccount" exactly (not "parentaccountid")
  let colIdx = headers.findIndex(h => normalize(h) === "parentaccount");
  
  // Fallback: look for column containing "parentaccount" but NOT "id"
  if (colIdx === -1) {
    colIdx = headers.findIndex(h => {
      const norm = normalize(h);
      return norm.includes("parentaccount") && !norm.includes("id");
    });
  }
  
  if (colIdx === -1) return [];
  
  const raw = sh.getRange(3, colIdx + 1, sh.getLastRow() - 2, 1).getValues().flat();
  return [...new Set(raw.filter(String).map(s => s.trim()))].sort();
}

function getAccountBaseline(target) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dSh = ss.getSheetByName('DISTRO');
  const sSh = ss.getSheetByName('STATCORE');
  if (!dSh || !sSh) return { revenue: 0, subFee: 0, direct: 0, discovery: 0, google: 0, network: 0 };

  const dHead = dSh.getRange(1,1,1,dSh.getLastColumn()).getValues()[0].map(normalizeHeader_);
  const ridIdx = dHead.indexOf("rid");
  const revIdx = dHead.findIndex(h => h.includes("revenuetotallastmonth"));
  const subIdx = dHead.findIndex(h => h.includes("revenuesubslastmonth"));
  const directIdx = dHead.findIndex(h => h.includes("cvrlastmonthdirect"));
  const discoIdx = dHead.findIndex(h => h.includes("cvrlastmonthdiscovery"));
  const googleIdx = dHead.findIndex(h => h.includes("cvrlastmonthgoogle"));
  const networkIdx = dHead.findIndex(h => h.includes("cvrlastmonthnetwork"));
  
  if (ridIdx === -1) return { revenue: 0, subFee: 0, direct: 0, discovery: 0, google: 0, network: 0 };
  const dData = dSh.getRange(2, 1, dSh.getLastRow()-1, dSh.getLastColumn()).getValues();
  const dataMap = new Map();
  dData.forEach(r => {
    if (r[ridIdx]) {
      dataMap.set(String(r[ridIdx]), {
        revenue: Number(r[revIdx]) || 0,
        subFee: Number(r[subIdx]) || 0,
        direct: Number(r[directIdx]) || 0,
        discovery: Number(r[discoIdx]) || 0,
        google: Number(r[googleIdx]) || 0,
        network: Number(r[networkIdx]) || 0
      });
    }
  });

  let agg = { revenue: 0, subFee: 0, direct: 0, discovery: 0, google: 0, network: 0 };
  
  // 🔧 FIX: Handle 3 target formats:
  // 1. "Name (RID)" - legacy format with parentheses
  // 2. Raw RID - numeric string like "12345" (from sidebar INDIVIDUAL mode)
  // 3. Group name - non-numeric string for GROUP mode
  
  let rid = null;
  let isGroupLookup = false;
  
  if (target.includes('(') && target.includes(')')) {
    // Format: "Restaurant Name (12345)"
    rid = target.split('(').pop().split(')')[0];
  } else if (/^\d+$/.test(String(target).trim())) {
    // Format: Raw RID (numeric string like "12345")
    rid = String(target).trim();
  } else {
    // Format: Group name (non-numeric string)
    isGroupLookup = true;
  }
  
  if (rid && !isGroupLookup) {
    // Individual account lookup
    const data = dataMap.get(rid);
    if (data) agg = data;
  } else if (isGroupLookup) {
    // Group lookup - aggregate all accounts under this parent
    const sHead = sSh.getRange(2,1,1,sSh.getLastColumn()).getValues()[0].map(normalizeHeader_);
    const sParentIdx = sHead.findIndex(h => h.includes("parentaccount"));
    const sRidIdx = sHead.indexOf("rid");
    if (sParentIdx > -1 && sRidIdx > -1) {
      const sData = sSh.getRange(3, 1, sSh.getLastRow()-2, sSh.getLastColumn()).getValues();
      sData.forEach(r => {
        if (String(r[sParentIdx]).trim() === target.trim()) {
           const memberRid = String(r[sRidIdx]);
           const data = dataMap.get(memberRid);
           if (data) {
             agg.revenue += data.revenue;
             agg.subFee += data.subFee;
             agg.direct += data.direct;
             agg.discovery += data.discovery;
             agg.google += data.google;
             agg.network += data.network;
           }
        }
      });
    }
  }
  return agg;
}

/**
 * Alias for getAccountBaseline - called by sidebar's Pricing Simulator
 * Returns { revenue, subFee, direct, discovery, google, network }
 * @param {string} target - RID or Group name
 * @returns {Object} Revenue and cover data
 */
function getAccountRevenue(target) {
  return getAccountBaseline(target);
}

function runPricingSimulation(cfg) {
  const baseline = getAccountBaseline(cfg.target || "");
  const baseRev = baseline.revenue || 0;
  if (baseRev === 0 && baseline.direct === 0 && baseline.discovery === 0) {
    if (cfg.scope === 'INDIVIDUAL') return { error: "No revenue or cover history found." }; 
  }
  const RATES = {
    'FREEMIUM': { direct: 0.00, discovery: Number(cfg.discoRate) || 1.50, googleDiscount: false },
    'FREE_GOOGLE': { direct: 0.00, discovery: 1.00, googleDiscount: true }, 
    'AYCE': { direct: 0.0, discovery: 0.0, googleDiscount: false }
  };
  const model = RATES[cfg.model] || RATES['FREEMIUM'];
  const newSubFee = Number(cfg.subFee) || 0;
  let costDirect = baseline.direct * model.direct;
  let costDiscovery = baseline.discovery * model.discovery;
  if (model.googleDiscount && baseline.google > 0) {
     const googleCredit = baseline.google * model.direct; 
     costDirect = Math.max(0, costDirect - googleCredit);
  }
  
  // 🟢 Current pricing breakdown (from actual data)
  const currentSubFee = baseline.subFee || 0;
  const currentVariableFees = baseRev - currentSubFee;
  const currentBreakdown = {
    subFee: currentSubFee,
    yourNetwork: 0,  // We don't have exact breakdown, so we'll estimate
    network: 0,
    discoPI: 0,
    google: 0,
    variableFees: currentVariableFees, // Lump sum of all variable fees
    total: baseRev
  };
  
  // 🟢 Simulated pricing breakdown
  const breakdown = {
    subFee: newSubFee, yourNetwork: costDirect, network: 0, discoPI: costDiscovery, google: 0, total: 0
  };
  breakdown.total = breakdown.subFee + breakdown.yourNetwork + breakdown.discoPI;
  
  const currentTotal = baseRev; 
  const monthlyDelta = breakdown.total - currentTotal;
  const percentChange = currentTotal > 0 ? (monthlyDelta / currentTotal) * 100 : 0;
  
  return { 
    success: true, 
    data: { 
      breakdown, 
      currentBreakdown,
      monthlyDelta, 
      percentChange 
    } 
  };
}

/**
 * 🟢 FIX: Replaced broken ITGlobal call with direct data fetching
 * This fixes the "Unknown" Account and missing data in the AI Brief.
 */
function local_getLLMBriefData(rid) {
  logInteraction('AI Brief');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const gatheredData = {};

  Object.keys(ACCOUNT_DATA_MAP).forEach(sheetName => {
    const config = ACCOUNT_DATA_MAP[sheetName];
    const sheetData = _readSheetDataSmart_(ss, sheetName, config, rid);
    if (sheetData) gatheredData[sheetName] = sheetData;
  });

  // Format to match expected string output
  let accName = "Unknown";
  if (gatheredData['STATCORE'] && gatheredData['STATCORE']['Account Name']) {
    accName = gatheredData['STATCORE']['Account Name'];
  }
  
  let prompt = `*** DATA START ***\nAccount: ${accName}\nRID: ${rid}\n\n`;
  ['DISTRO', 'STATCORE'].forEach(source => { 
    if (gatheredData[source]) { 
      prompt += `[${source}]\n`; 
      for (const [key, val] of Object.entries(gatheredData[source])) {
        prompt += `${key}: ${val}\n`; 
      }
      prompt += `\n`; 
    }
  });
  prompt += `*** END ***`;
  return prompt;
}

// Map alias if UI calls the old name
function buildPromptForRID(rid) { return local_getLLMBriefData(rid); }

// =============================================================
// HELPERS (Standard)
// =============================================================

function countVal(obj, row, idx) {
  if (idx > -1 && row[idx]) {
    const v = String(row[idx]).trim();
    if (v) obj[v] = (obj[v] || 0) + 1;
  }
}

function addNum(agg, key, val) {
  if (val === "" || val == null) return;
  const clean = String(val).replace(/[^0-9.-]/g, "");
  const num = parseFloat(clean);
  if (!isNaN(num)) {
    agg[key + 'Sum'] += num;
    agg[key + 'Cnt']++;
  }
}

function calcAvg(sum, count, dec) { return count === 0 ? "0" : (sum / count).toFixed(dec); }

function isTrue(val) {
  const s = String(val).toUpperCase();
  return s === "TRUE" || s === "YES" || s === "1" || s === "LIVE";
}

/**
 * Check if Active PI field has an active campaign
 * Active PI values are: "BP", "BP & PR/CP", "PR/CP" (or variations)
 * NOT active: empty, null, "None", etc.
 * @param {*} val - The Active PI field value
 * @returns {boolean} True if there's an active PI campaign
 */
function hasActivePI(val) {
  if (!val) return false;
  const s = String(val).toUpperCase().trim();
  if (!s || s === "NONE" || s === "N/A" || s === "FALSE" || s === "NO") return false;
  // Check for known active values: BP, PR, CP (or combinations)
  return s.includes("BP") || s.includes("PR") || s.includes("CP");
}

function sortObj(obj, limit) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([k,v]) => ({ label: k, count: v }));
}

function normalizeHeader_(str) { return String(str).toLowerCase().replace(/[^a-z0-9]/g, ""); }
function getColIndex_(sheet, name) { const h = sheet.getRange(2,1,1,sheet.getLastColumn()).getValues()[0]; return h.findIndex(c => normalizeHeader_(c).includes(normalizeHeader_(name))) + 1; }
function flattenList_(list) { if (!list || !Array.isArray(list)) return ""; return list.map(item => `${item.label} (${item.count})`).join(", "); }

// 🟢 NEW HELPER: Reads data safely for the AI Brief
function _readSheetDataSmart_(ss, sheetName, config, targetRid) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return null;
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(config.headerRow, 1, 1, lastCol).getValues()[0];
  const normalize = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  
  const keyIdx = headers.findIndex(h => normalize(h).includes(normalize(config.keyCol)));
  if (keyIdx === -1) return null;

  // 🟢 OPTIMIZATION: Use TextFinder to avoid reading full sheet
  const searchRange = sheet.getRange(config.headerRow + 1, keyIdx + 1, sheet.getLastRow() - config.headerRow, 1);
  const finder = searchRange.createTextFinder(String(targetRid)).matchEntireCell(true);
  const found = finder.findNext();
  
  if (!found) return null;
  
  const rowIdx = found.getRow();
  const row = sheet.getRange(rowIdx, 1, 1, lastCol).getValues()[0];
  
  const result = {};
  config.extract.forEach(field => {
    const idx = headers.findIndex(h => normalize(h).includes(normalize(field)));
    if (idx > -1) {
        let val = row[idx];
        if (val instanceof Date) val = val.toDateString();
        result[field] = val;
    } else {
        // 🟢 GUARDRAIL: Explicitly signal missing data to prevent hallucination
        result[field] = "[DATA MISSING]";
    }
  });
  return result;
}

function showExportSuccessModal_(fileName, url, duration) {
  const htmlContent = `<div style="font-family:'Segoe UI', sans-serif; padding:20px; text-align:center;"><h3 style="color:#16a34a; margin-top:0;">✅ Full Export Ready</h3><p>Created <strong>${fileName}</strong> in ${duration}s.</p><a href="${url}" target="_blank" id="openLink" style="display:inline-block; background:#007bff; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight:bold;">Open Google Sheet</a><script>window.onload = function() { var win = window.open('${url}', '_blank'); if(!win) document.getElementById('openLink').style.boxShadow = "0 0 10px rgba(0,123,255,0.5)"; };</script></div>`;
  const htmlOutput = HtmlService.createHtmlOutput(htmlContent).setWidth(350).setHeight(250);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Export Successful');
}

// =============================================================
// SECTION 5: KNOWLEDGE HUB - AI ASSISTANT
// =============================================================
// ** MOVED TO InTouchGuide.js **
// All Knowledge Hub code has been moved to InTouchGuide.js for better
// organization. This includes:
// - COLUMN_CATEGORIES, VALUE_TO_METRIC, METRIC_TO_CATEGORY
// - SCRIPTED_RESPONSES, INTOUCH_SYSTEM_INSTRUCTION, ACCOUNT_DATA_PATTERNS
// - tryScriptedResponse(), isAccountDataQuestion(), extractAMNameFromQuery()
// - findAMByName(), formatDataForInjection(), askInTouchGuide()
// - KH_FEEDBACK_CONFIG, logKnowledgeHubFeedback(), getKHFeedbackForReview()
// - getGeminiApiKey_(), pingGeminiApi()
// =============================================================

// =============================================================
// SECTION 5B: DYNAMIC COLUMN ACTIONS
// =============================================================
// These functions support the [COLUMN_ACTION:...] feature in the AI chat
// =============================================================

/**
 * Maps metric names to their column letters
 * Used by findColumnForMetric to locate which column can display a metric
 */
const DYNAMIC_COLUMN_MAP = {
  // Column E - Account IDs
  'Insights': 'E', 'Users': 'E', 'OT4R': 'E',
  
  // Column G - Account Name variants
  'Account Name (SFDC)': 'G', 'Account Name (Google)': 'G', 
  'Account Name (Bistro Settings)': 'G', 'Account Name (OT Profile)': 'G',
  
  // Column I - Location
  'Metro': 'I', 'Neighborhood': 'I', 'Macro': 'I',
  
  // Columns J-L - Dates & Activity
  'AM Assigned Date': 'J', 'Task Created By': 'J', 'Task Date': 'J', 'Task Type': 'J',
  'Event Created By': 'J', 'Event Date': 'J', 'Event Type': 'J', 'L90 Total Meetings': 'J',
  'Last Engaged Date': 'K', 'Current Term End Date': 'K', 'Focus20': 'K',
  'Customer Since': 'L', 'Contract Alerts': 'L',
  
  // Columns M-O - Account + Status Info
  'Status': 'M', 'System Status': 'M', 'System Type': 'N', 
  'No Bookings >30 Days': 'M', 'System of Record': 'O',
  
  // Columns P-R - System Stats
  'Active PI': 'P', 'Active XP': 'P', 'AutoTags Active - Last 30': 'P',
  'CHRM-CC Req Min': 'P', 'CHRM-Days in Advance': 'P', 'CHRM-Max Party': 'P',
  'Email Integration': 'P', 'Exclusive Pricing': 'P', 'HEALTH FLAGS - LM': 'P',
  'Instant Booking': 'P', 'Integrations Total': 'P', 'PartnerFeed EXCLUDED': 'P',
  'Payment Method': 'P', 'POS Type': 'P', 'Previous AM': 'P', 'Private Dining': 'P',
  'PRO-Last Sent': 'P', 'Rest. Quality': 'Q', 'Shift w/MAX CAP': 'P',
  'Special Programs': 'P', 'Stripe Status*': 'P', 'Target Zipcode': 'P',
  
  // Columns S-U - Percentage Metrics
  'CVR - Fullbook YoY%': 'S', 'CVR - Network YoY%': 'S', 
  'CVRs - Discovery % Avg. 12m': 'S', 'CVRs LM - Direct %': 'S',
  'CVRs LM - Discovery %': 'S', 'Disco % Current': 'S', 'Disco % MoM (+/-)': 'S',
  'Google % Avg. 12m': 'S', 'PI Rev Share %': 'S', 'POS Match %': 'S',
  'Disco % WoW (+/-)*': 'S',
  
  // Columns V-X - Revenue
  'Rev Yield - Total Last Month': 'V', 'Revenue - PI Last Month': 'V',
  'Check Avg. Last 30': 'V', 'Revenue - Total 12m Avg.': 'V',
  'Revenue - Subs Last Month': 'V', 'Revenue - Total Last Month': 'V',
  'Total Due': 'V', 'Past Due': 'V',
  
  // Columns Y-AA - Seated Covers
  'CVR Last Month - Direct': 'Y', 'CVR Last Month - Discovery': 'Y',
  'CVR Last Month - Phone/Walkin': 'Y', 'CVR Last Month - Google': 'Y',
  'CVR Last Month - PI BP': 'Y', 'CVR Last Month - PI CP': 'Y',
  'CVR Last Month - PI PR': 'Y', 'CVRs Last Month - Total PI': 'Y',
  'CVR Last Month - Fullbook': 'Y', 'CVR Last Month - Network': 'Y',
  'CVR Last Month - RestRef': 'Y', 'CVRs 12m Avg. - Network': 'Y',
  'CVRs 12m Avg. - Dir': 'Y', 'CVRs 12m Avg. - Disc': 'Y',
  'CVRs 12m Avg. - Phone/Walkin': 'Y', 'CVRs 12m Avg. - Restref': 'Y',
  'CVRs 12m Avg. - FullBook': 'Y', 'CVRs 12m Avg. - Google': 'Y',
  
  // Columns AB-AD - Pricing
  'GOOGLE / DIRECT CVRS': 'AB', 'STANDARD COVER PRICE': 'AB',
  'STANDARD EXPOSURE CVRS': 'AB', 'SUBFEES': 'AB'
};

/**
 * Sets a dynamic column header value on the active AM sheet
 * Called when user confirms a [COLUMN_ACTION:...] from the AI chat
 * @param {string} columnLetter - The column letter (e.g., "J", "K", "AA")
 * @param {string} metricName - The metric name to set in the dropdown
 * @returns {Object} Result with success status
 */
function setDynamicColumnHeader(columnLetter, metricName) {
  const functionName = 'setDynamicColumnHeader';
  console.log(`[${functionName}] Setting column ${columnLetter} to "${metricName}"`);
  
  // Helper to normalize strings for comparison (handles special chars like > < etc.)
  const normalizeForCompare = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  
  try {
    // Validate we're on an AM tab
    const tabCheck = checkIfAMTab();
    if (!tabCheck.isAMTab) {
      return {
        success: false,
        error: 'Please navigate to an AM tab first. The active sheet "' + tabCheck.sheetName + '" is not an AM tab.'
      };
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet();
    
    // Convert column letter to index
    const colIndex = columnLetterToIndex_(columnLetter);
    if (colIndex < 1) {
      return { success: false, error: 'Invalid column letter: ' + columnLetter };
    }
    
    // Get the cell in Row 2
    const cell = sheet.getRange(2, colIndex);
    const currentValue = String(cell.getValue()).trim();
    
    // Check if already set to this metric (using normalized comparison)
    if (normalizeForCompare(currentValue) === normalizeForCompare(metricName)) {
      console.log(`[${functionName}] Column ${columnLetter} already set to "${currentValue}"`);
      return {
        success: true,
        alreadySet: true,
        column: columnLetter,
        metric: currentValue,
        previousValue: currentValue,
        sheetName: tabCheck.sheetName
      };
    }
    
    // Get data validation to verify the metric is valid for this column
    const validation = cell.getDataValidation();
    if (validation) {
      const criteriaType = validation.getCriteriaType();
      let validOptions = [];
      
      if (criteriaType === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
        validOptions = validation.getCriteriaValues()[0] || [];
      } else if (criteriaType === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE) {
        try {
          const range = validation.getCriteriaValues()[0];
          if (range) validOptions = range.getValues().flat().filter(String);
        } catch (e) {
          console.log('Could not read validation range:', e.message);
        }
      }
      
      // Check if metricName is in the valid options (using normalized comparison)
      const matchedOption = validOptions.find(opt => 
        normalizeForCompare(opt) === normalizeForCompare(metricName)
      );
      
      if (!matchedOption && validOptions.length > 0) {
        // Check if maybe it's already set (current value matches requested)
        const currentMatches = validOptions.find(opt => 
          normalizeForCompare(opt) === normalizeForCompare(currentValue) &&
          normalizeForCompare(opt) === normalizeForCompare(metricName)
        );
        
        if (currentMatches) {
          return {
            success: true,
            alreadySet: true,
            column: columnLetter,
            metric: currentValue,
            previousValue: currentValue,
            sheetName: tabCheck.sheetName
          };
        }
        
        return {
          success: false,
          error: `"${metricName}" is not available in column ${columnLetter}. Available options: ${validOptions.slice(0, 5).join(', ')}${validOptions.length > 5 ? '...' : ''}`
        };
      }
      
      // Use the exact matched option (preserves original case)
      if (matchedOption) metricName = matchedOption;
    }
    
    // Set the value
    cell.setValue(metricName);
    SpreadsheetApp.flush();
    
    console.log(`[${functionName}] Success: Column ${columnLetter} set to "${metricName}"`);
    return {
      success: true,
      column: columnLetter,
      metric: metricName,
      previousValue: currentValue,
      sheetName: tabCheck.sheetName
    };
    
  } catch (e) {
    console.error(`[${functionName}] Error:`, e);
    return { success: false, error: e.message };
  }
}

/**
 * Finds the first (leftmost) column that can display a given metric
 * @param {string} metricName - The metric to find
 * @returns {Object} {found: boolean, column: string, metric: string}
 */
function findColumnForMetric(metricName) {
  const normalizedSearch = metricName.toLowerCase().trim();
  
  // First check exact match in our map
  for (const [metric, col] of Object.entries(DYNAMIC_COLUMN_MAP)) {
    if (metric.toLowerCase() === normalizedSearch) {
      return { found: true, column: col, metric: metric };
    }
  }
  
  // Then check partial match
  for (const [metric, col] of Object.entries(DYNAMIC_COLUMN_MAP)) {
    if (metric.toLowerCase().includes(normalizedSearch) || 
        normalizedSearch.includes(metric.toLowerCase())) {
      return { found: true, column: col, metric: metric };
    }
  }
  
  return { found: false, column: null, metric: metricName };
}

/**
 * Helper: Convert column letter to 1-based index
 * @param {string} letters - Column letter(s) like "A", "Z", "AA", "AB"
 * @returns {number} 1-based column index
 */
function columnLetterToIndex_(letters) {
  let result = 0;
  for (let i = 0; i < letters.length; i++) {
    result = result * 26 + (letters.toUpperCase().charCodeAt(i) - 64);
  }
  return result;
}

// =============================================================
// SECTION 6: BIZINSIGHTS HELPERS
// =============================================================

function BI_runWithRuntimeLogging(opts) {
  if (typeof ITGlobal !== 'undefined') {
    return ITGlobal.BI_createPresentation({
      logSheetId: '174CADIuvvbFnTWgVHh-X5EC5pQZQc_9KRjFVdCeA7pk',
      accountName: opts.accountName, 
      rid: opts.rid,
      metro: opts.metro,
      macro: opts.macro,
      neighborhood: opts.neighborhood,
      addLinkToStartHere: true,
      readFromSetupIfMissing: true
    });
  } else {
    return "Error: ITGlobal library missing";
  }
}

// =============================================================
// SECTION 7: PORTFOLIO ANALYSIS FOR AI CHAT
// =============================================================

/**
 * DEBUG: Diagnose AM context detection
 * Run this from Apps Script editor to test the B2-based AM detection
 * @returns {Object} Diagnostic information
 */
function debugAMContext() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const activeSheet = ss.getActiveSheet();
  const sheetName = activeSheet.getName();
  
  console.log('=== AM CONTEXT DEBUG ===');
  console.log(`Active sheet: "${sheetName}"`);
  
  // Check B2 value
  const b2Value = String(activeSheet.getRange('B2').getValue() || '').trim();
  console.log(`B2 value: "${b2Value}"`);
  
  if (b2Value.toUpperCase() === 'ALL TEAM') {
    console.log('→ This is the Manager Lens / Team view');
  } else if (b2Value) {
    console.log(`→ This is ${b2Value}'s tab`);
  } else {
    console.log('→ B2 is empty - cannot determine AM');
  }
  
  // Test the actual function
  console.log('');
  console.log('Testing getActiveAMContext():');
  const context = getActiveAMContext();
  console.log(JSON.stringify(context, null, 2));
  
  // List all AM tabs found
  console.log('');
  console.log('Testing getAvailableAMTabs():');
  const tabsResult = getAvailableAMTabs();
  if (tabsResult.success) {
    console.log(`Found ${tabsResult.ams.length} AM tabs:`);
    tabsResult.ams.forEach(am => {
      console.log(`  - ${am.fullName} (tab: ${am.tabName})`);
    });
  } else {
    console.log('Error: ' + tabsResult.error);
  }
  
  return { context, tabs: tabsResult };
}

/**
 * Check if the active sheet is an AM tab by looking for "Smart Select" header in Row 2
 * AM tabs have a specific structure with Smart Select column header
 * @returns {Object} { isAMTab: boolean, sheetName: string }
 */
function checkIfAMTab() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const activeSheet = ss.getActiveSheet();
    const sheetName = activeSheet.getName();
    
    // Known system sheets are not AM tabs
    const systemSheets = ['setup', 'statcore', 'distro', 'refresh', 'kh_feedback', 'manager lens'];
    if (systemSheets.includes(sheetName.toLowerCase())) {
      return { isAMTab: false, sheetName: sheetName };
    }
    
    // Check if sheet has the AM tab structure (Smart Select header in Row 2)
    const lastCol = Math.min(activeSheet.getLastColumn(), 30); // Check first 30 cols
    if (lastCol < 4) {
      return { isAMTab: false, sheetName: sheetName };
    }
    
    const row2Headers = activeSheet.getRange(2, 1, 1, lastCol).getValues()[0];
    const hasSmartSelect = row2Headers.some(h => 
      String(h).toLowerCase().replace(/\s/g, '') === 'smartselect'
    );
    
    console.log(`[checkIfAMTab] Sheet "${sheetName}" - hasSmartSelect: ${hasSmartSelect}`);
    
    return { isAMTab: hasSmartSelect, sheetName: sheetName };
    
  } catch (e) {
    console.error(`[checkIfAMTab] Error: ${e.message}`);
    return { isAMTab: false, sheetName: 'Unknown' };
  }
}

/**
 * Get the active AM context by reading B2 directly from the active sheet
 * B2 contains the AM's full name, or "ALL TEAM" for Manager Lens
 * @returns {Object} { isAMTab, fullName, isTeamView, sheetName }
 */
function getActiveAMContext() {
  const functionName = 'getActiveAMContext';
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const activeSheet = ss.getActiveSheet();
    const sheetName = activeSheet.getName();
    
    console.log(`[${functionName}] Active sheet: "${sheetName}"`);
    
    // Check if it's an AM tab (has Smart Select in Row 2)
    const tabCheck = checkIfAMTab();
    if (!tabCheck.isAMTab) {
      console.log(`[${functionName}] Not an AM tab`);
      return {
        isAMTab: false,
        fullName: null,
        isTeamView: false,
        sheetName: sheetName
      };
    }
    
    // Read B2 directly from the active sheet - this contains the AM's full name
    const b2Value = String(activeSheet.getRange('B2').getValue() || '').trim();
    
    console.log(`[${functionName}] B2 value: "${b2Value}"`);
    
    // Check if this is the Manager Lens / Team view
    if (b2Value.toUpperCase() === 'ALL TEAM') {
      console.log(`[${functionName}] Detected Manager Lens / Team view`);
      return {
        isAMTab: true,
        fullName: null,
        isTeamView: true,
        sheetName: sheetName
      };
    }
    
    // B2 contains the AM's full name
    if (b2Value) {
      console.log(`[${functionName}] ✓ Found AM: "${b2Value}"`);
      return {
        isAMTab: true,
        fullName: b2Value,
        isTeamView: false,
        sheetName: sheetName
      };
    }
    
    // B2 is empty - shouldn't happen on a valid AM tab
    console.log(`[${functionName}] ✗ B2 is empty`);
    return {
      isAMTab: true,
      fullName: null,
      isTeamView: false,
      sheetName: sheetName
    };
    
  } catch (e) {
    console.error(`[${functionName}] Error: ${e.message}`);
    return {
      isAMTab: false,
      fullName: null,
      isTeamView: false,
      sheetName: 'Unknown',
      error: e.message
    };
  }
}

/**
 * Get list of all AMs that have tabs in this workbook
 * Returns array of { firstName, fullName } objects
 * @returns {Object} { success, ams: [{firstName, fullName}], error }
 */
function getAvailableAMTabs() {
  const functionName = 'getAvailableAMTabs';
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const allSheets = ss.getSheets();
    
    // Scan each sheet to find AM tabs by checking B2
    // AM tabs have the AM's full name in B2
    // Manager Lens has "ALL TEAM" in B2
    const ams = [];
    const systemSheets = ['setup', 'statcore', 'distro', 'refresh', 'kh_feedback', 'manager lens'];
    
    for (const sheet of allSheets) {
      const sheetName = sheet.getName();
      
      // Skip known system sheets
      if (systemSheets.includes(sheetName.toLowerCase())) {
        continue;
      }
      
      try {
        // Check if this sheet has the AM tab structure (Smart Select header)
        const lastCol = Math.min(sheet.getLastColumn(), 10);
        if (lastCol < 2) continue;
        
        const row2Headers = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
        const hasSmartSelect = row2Headers.some(h => 
          String(h).toLowerCase().replace(/\s/g, '') === 'smartselect'
        );
        
        if (!hasSmartSelect) continue;
        
        // Read B2 to get the AM name
        const b2Value = String(sheet.getRange('B2').getValue() || '').trim();
        
        // Skip if B2 is empty or "ALL TEAM" (Manager Lens)
        if (!b2Value || b2Value.toUpperCase() === 'ALL TEAM') {
          continue;
        }
        
        ams.push({
          tabName: sheetName,
          fullName: b2Value
        });
        
      } catch (sheetError) {
        // Skip sheets that can't be read
        console.log(`[${functionName}] Skipping sheet "${sheetName}": ${sheetError.message}`);
      }
    }
    
    console.log(`[${functionName}] Found ${ams.length} AM tabs`);
    
    return {
      success: true,
      ams: ams.sort((a, b) => a.fullName.localeCompare(b.fullName))
    };
    
  } catch (e) {
    console.error(`[${functionName}] Error: ${e.message}`);
    return { success: false, ams: [], error: e.message };
  }
}

/**
 * Activate a specific sheet by name
 * Used for programmatic tab switching from the sidebar
 * @param {string} sheetName - The name of the sheet to activate
 * @returns {Object} { success, error }
 */
function activateSheet(sheetName) {
  const functionName = 'activateSheet';
  console.log(`[${functionName}] Request to activate sheet: "${sheetName}"`);
  
  try {
    if (!sheetName) return { success: false, error: 'No sheet name provided' };
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      console.log(`[${functionName}] Sheet not found: "${sheetName}"`);
      return { success: false, error: `Sheet "${sheetName}" not found` };
    }
    
    sheet.activate();
    console.log(`[${functionName}] Successfully activated sheet: "${sheetName}"`);
    
    return { success: true, sheetName: sheetName };
    
  } catch (e) {
    console.error(`[${functionName}] Error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

/**
 * Get detailed AM data with RIDs tracked per category
 * This function returns both counts AND lists of RIDs for each category
 * Used for conversational AI to answer specific questions and enable "which rids" follow-ups
 * @param {string} amName - The full AM name to analyze
 * @returns {Object} Detailed portfolio data with RID lists
 */
function getDetailedAMData(amName) {
  const functionName = 'getDetailedAMData';
  const startTime = new Date();
  
  console.log(`[${functionName}] Getting detailed data for: "${amName}"`);
  
  try {
    if (!amName || amName.trim() === '') {
      return { success: false, error: 'No AM name provided' };
    }
    
    // Check server-side cache first (10 min TTL)
    const cache = CacheService.getScriptCache();
    const cacheKey = 'AMData_' + amName.replace(/[^a-zA-Z0-9]/g, '_');
    
    try {
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log(`[${functionName}] Cache HIT for ${amName}`);
        const cachedResult = JSON.parse(cached);
        cachedResult.fromCache = true;
        return cachedResult;
      }
    } catch (cacheErr) {
      console.log(`[${functionName}] Cache read error: ${cacheErr.message}`);
    }
    
    console.log(`[${functionName}] Cache MISS - fetching fresh data`);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const statSheet = ss.getSheetByName('STATCORE');
    const distroSheet = ss.getSheetByName('DISTRO');
    
    if (!statSheet || !distroSheet) {
      return { success: false, error: 'Missing STATCORE or DISTRO sheets' };
    }
    
    // Get headers and data
    const sHead = statSheet.getRange(2, 1, 1, statSheet.getLastColumn()).getValues()[0];
    const sData = statSheet.getRange(3, 1, statSheet.getLastRow()-2, statSheet.getLastColumn()).getValues();
    
    const dHead = distroSheet.getRange(1, 1, 1, distroSheet.getLastColumn()).getValues()[0];
    const dData = distroSheet.getRange(2, 1, distroSheet.getLastRow()-1, distroSheet.getLastColumn()).getValues();
    
    // Column mapping
    const findCol = (headers, keyword) => headers.findIndex(h => 
      String(h).toLowerCase().replace(/[^a-z0-9]/g, "").includes(keyword.toLowerCase().replace(/[^a-z0-9]/g, ""))
    );
    
    const map = {
      s_rid: findCol(sHead, "rid"),
      am: findCol(sHead, "accountmanager"),
      parent: findCol(sHead, "parentaccount"),
      accName: findCol(sHead, "accountname"),
      status: findCol(sHead, "status"),
      accStatus: findCol(sHead, "accountstatus"),
      termEnd: findCol(sHead, "termenddate"),
      metro: findCol(sHead, "metro"),
      sor: findCol(sHead, "systemofrecord"),
      sysType: findCol(sHead, "systemtype"),
      qual: findCol(sHead, "quality"),
      programs: findCol(sHead, "specialprograms"),
      pricing: findCol(sHead, "exclusivepricing"),
      ib: findCol(sHead, "instantbooking"),
      pd: findCol(sHead, "privatedining"),
      alertList: findCol(sHead, "alertlist"),
      // Meeting/Event columns (for DATA_CONTRACT_INTENTS: get_last_meeting_date, get_l90_meeting_count, etc.)
      eventDate: findCol(sHead, "eventdate"),
      eventType: findCol(sHead, "eventtype"),
      taskDate: findCol(sHead, "taskdate"),
      taskType: findCol(sHead, "tasktype"),
      l90Meetings: findCol(sHead, "l90totalmeetings"),
      lastEngaged: findCol(sHead, "lastengageddate"),
      // DISTRO columns
      d_rid: findCol(dHead, "rid"),
      subfees: findCol(dHead, "subslastmonth"),
      yield: findCol(dHead, "revyield"),
      noBook: findCol(dHead, "nobookings"),
      disco: findCol(dHead, "discocurrent"),
      mom: findCol(dHead, "discomom"),
      xp: findCol(dHead, "activexp"),
      pi: findCol(dHead, "activepi"),
      piShare: findCol(dHead, "pirevshare"),
      pos: findCol(dHead, "posmatch"),
      pf: findCol(dHead, "partnerfeed"),
      totalRev: findCol(dHead, "revenuetotallastmonth")
    };
    
    if (map.am === -1) map.am = 13;
    
    // Build DISTRO lookup
    const dMap = new Map();
    dData.forEach(row => {
      if (row[map.d_rid]) dMap.set(String(row[map.d_rid]), row);
    });
    
    // Initialize tracking objects - stores arrays of {rid, name}
    const data = {
      allRids: [],
      groups: new Set(),
      termPending: [],
      termExpired: [],
      termWarning: [],
      // Enhanced structure for system types - includes metrics aggregation
      systemTypes: {},      // { "Core": { rids: [{rid, name}], yldSum: 0, yldCnt: 0, subSum: 0, subCnt: 0 } }
      qualityTiers: {},     // { "Platinum": { rids: [{rid, name}], yldSum: 0, yldCnt: 0, subSum: 0, subCnt: 0 } }
      specialPrograms: {},  // { "VIP": [{rid, name}] }
      exclusivePricing: {}, // { "Freemium": [{rid, name}] }
      noBookingReasons: {}, // { "0-Fullbook": [{rid, name}] }
      metros: {},           // { "LA": [{rid, name}] }
      systemOfRecord: {},   // { "OT": [{rid, name}] }
      activePI: [],
      activeXP: [],
      instantBooking: [],
      privateDining: [],
      partnerFeedExcluded: [],
      // Alert flags (from STATCORE "Alert List" column)
      alertFlags: {},           // { "⚠️ 0-Fullbook": [{rid, name}], "❗Hibernated": [{rid, name}] }
      accountsWithAlerts: [],   // All accounts that have any alert flag [{rid, name, alerts: [...]}]
      // Meeting/Event tracking (for DATA_CONTRACT_INTENTS: list_unmet_accounts_l90, focus20_meetings_gap, etc.)
      // IMPORTANT: Blank cells in Event Date, Task Date, Last Engaged Date columns specifically
      // mean NO ACTIVITY in past 90 days - this rule applies ONLY to these three columns
      noMeetings90: [],         // Accounts with L90 Total Meetings = 0 OR blank Event Date [{rid, name}]
      noTasks90: [],            // Accounts with blank Task Date (no tasks logged in 90 days) [{rid, name}]
      noEngagement90: [],       // Accounts with blank Last Engaged Date (no activity at all in 90 days) [{rid, name}]
      staleEngagement90: [],    // Accounts with Last Engaged Date > 90 days ago [{rid, name, daysSince}]
      staleEngagement60: [],    // Accounts with Last Engaged Date > 60 days ago [{rid, name, daysSince}]
      staleEngagement30: [],    // Accounts with Last Engaged Date > 30 days ago [{rid, name, daysSince}]
      engagementBuckets: {      // Engagement coverage buckets
        active: [],             // <30 days
        monitor: [],            // 30-60 days
        atRisk: [],             // 60-90 days
        critical: [],           // >90 days
        noActivity: []          // Blank Last Engaged Date = no activity logged at all
      },
      // Numeric aggregations (overall)
      subSum: 0, subCnt: 0,
      yldSum: 0, yldCnt: 0,
      discoSum: 0, discoCnt: 0,
      momSum: 0, momCnt: 0,
      piShareSum: 0, piShareCnt: 0,
      posSum: 0, posCnt: 0
    };
    
    const today = new Date();
    const warnDate = new Date();
    warnDate.setDate(today.getDate() + 45);
    
    const isTrue = v => v === true || String(v).toLowerCase() === 'true' || String(v).toLowerCase() === 'yes' || v === 1;
    
    const addNum = (key, val) => {
      const n = parseFloat(val);
      if (!isNaN(n)) {
        data[key + 'Sum'] += n;
        data[key + 'Cnt']++;
      }
    };
    
    // Helper to check if value is just "Top" or "Top [Nom]" (should be excluded from important accounts)
    const isTopOnly = (val) => {
      if (!val) return false;
      const normalized = String(val).trim().toLowerCase();
      return normalized === 'top' || normalized === 'top [nom]';
    };
    
    // Simple category tracking (just RIDs)
    // skipTopOnly: if true, excludes "Top" and "Top [Nom]" values
    const addToSimpleCategory = (category, value, rid, name, skipTopOnly = false, metrics = {}) => {
      const cleanVal = String(value || '').trim();
      if (!cleanVal) return;
      // Skip "Top" or "Top [Nom]" if requested
      if (skipTopOnly && isTopOnly(cleanVal)) return;
      if (!data[category][cleanVal]) data[category][cleanVal] = [];
      
      const entry = { rid, name };
      if (metrics.rev) entry.rev = metrics.rev;
      if (metrics.yld) entry.yld = metrics.yld;
      if (metrics.sub) entry.sub = metrics.sub;
      
      data[category][cleanVal].push(entry);
    };
    
    // Enhanced category tracking with metrics (for System Types and Quality Tiers)
    // skipTopOnly: if true, excludes "Top" and "Top [Nom]" values
    const addToMetricCategory = (category, value, rid, name, yieldVal, subVal, skipTopOnly = false, metrics = {}) => {
      const cleanVal = String(value || '').trim();
      if (!cleanVal) return;
      // Skip "Top" or "Top [Nom]" if requested
      if (skipTopOnly && isTopOnly(cleanVal)) return;
      if (!data[category][cleanVal]) {
        data[category][cleanVal] = { rids: [], yldSum: 0, yldCnt: 0, subSum: 0, subCnt: 0 };
      }
      
      const entry = { rid, name };
      if (metrics.rev) entry.rev = metrics.rev;
      if (metrics.yld) entry.yld = metrics.yld; // Redundant but consistent
      if (metrics.sub) entry.sub = metrics.sub; // Redundant but consistent
      
      data[category][cleanVal].rids.push(entry);
      
      // Add metrics if available
      const yld = parseFloat(yieldVal);
      if (!isNaN(yld)) {
        data[category][cleanVal].yldSum += yld;
        data[category][cleanVal].yldCnt++;
      }
      const sub = parseFloat(subVal);
      if (!isNaN(sub)) {
        data[category][cleanVal].subSum += sub;
        data[category][cleanVal].subCnt++;
      }
    };
    
    // Process each row for this AM
    sData.forEach(row => {
      const rowAM = String(row[map.am] || "").trim();
      if (rowAM.toLowerCase() !== amName.toLowerCase().trim()) return;
      
      const rid = String(row[map.s_rid] || '');
      const name = String(row[map.accName] || 'Unknown');
      const dRow = dMap.get(rid);
      
      // Get DISTRO metrics for this RID (needed for per-category tracking)
      const yieldVal = dRow ? dRow[map.yield] : null;
      const subVal = dRow ? dRow[map.subfees] : null;
      const revVal = (dRow && map.totalRev > -1) ? dRow[map.totalRev] : null;
      const discoVal = dRow ? dRow[map.disco] : null;
      const momVal = dRow ? dRow[map.mom] : null;
      
      // Store metrics for individual account analysis (ranking, filtering)
      const metrics = {
        rev: revVal,
        yld: yieldVal,
        sub: subVal,
        disco: discoVal,
        mom: momVal
      };
      
      data.allRids.push({ rid, name, ...metrics });
      
      if (map.parent > -1 && row[map.parent]) data.groups.add(row[map.parent]);
      
      // Contract status
      if (map.termEnd > -1) {
        const d = row[map.termEnd];
        if (d instanceof Date) {
          if (d < today) data.termExpired.push({ rid, name, ...metrics });
          else if (d <= warnDate) {
            const daysUntil = Math.floor((d - today) / (1000 * 60 * 60 * 24));
            data.termWarning.push({ rid, name, daysUntil, ...metrics });
          }
        }
      }
      
      const st = String(row[map.status]||"") + String(row[map.accStatus]||"");
      if (st.toLowerCase().includes("term") || st.toLowerCase().includes("cancel")) {
        data.termPending.push({ rid, name, ...metrics });
      }
      
      // Enhanced categories - track metrics per category value
      addToMetricCategory('systemTypes', row[map.sysType], rid, name, yieldVal, subVal, false, metrics);
      addToMetricCategory('qualityTiers', row[map.qual], rid, name, yieldVal, subVal, true, metrics);  // Skip "Top" / "Top [Nom]"
      
      // Simple categories - just RID tracking
      addToSimpleCategory('specialPrograms', row[map.programs], rid, name, true, metrics);  // Skip "Top" / "Top [Nom]"
      addToSimpleCategory('exclusivePricing', row[map.pricing], rid, name, false, metrics);
      addToSimpleCategory('metros', row[map.metro], rid, name, false, metrics);
      addToSimpleCategory('systemOfRecord', row[map.sor], rid, name, false, metrics);
      
      // Features
      if (map.ib > -1 && isTrue(row[map.ib])) data.instantBooking.push({ rid, name });
      if (map.pd > -1 && isTrue(row[map.pd])) data.privateDining.push({ rid, name });
      
      // DISTRO metrics (overall aggregations)
      if (dRow) {
        addNum('sub', dRow[map.subfees]);
        addNum('yld', dRow[map.yield]);
        addNum('disco', dRow[map.disco]);
        addNum('mom', dRow[map.mom]);
        addNum('piShare', dRow[map.piShare]);
        addNum('pos', dRow[map.pos]);
        
        if (map.xp > -1 && isTrue(dRow[map.xp])) data.activeXP.push({ rid, name });
        if (map.pi > -1 && hasActivePI(dRow[map.pi])) data.activePI.push({ rid, name });
        
        const pf = String(dRow[map.pf]||"").toUpperCase();
        if (pf.includes("EXCLUDED") || pf === "FALSE") data.partnerFeedExcluded.push({ rid, name });
        
        addToSimpleCategory('noBookingReasons', dRow[map.noBook], rid, name);
      }
      
      // Process Alert List (STATCORE column) - flags are separated by line breaks
      if (map.alertList > -1) {
        const alertValue = String(row[map.alertList] || '').trim();
        if (alertValue) {
          // Split by newlines to get individual alert flags
          const alerts = alertValue.split(/[\r\n]+/).map(a => a.trim()).filter(a => a);
          if (alerts.length > 0) {
            // Track this account has alerts
            data.accountsWithAlerts.push({ rid, name, alerts: alerts });
            // Track each alert type separately
            alerts.forEach(alert => {
              if (!data.alertFlags[alert]) data.alertFlags[alert] = [];
              data.alertFlags[alert].push({ rid, name });
            });
          }
        }
      }
      
      // Meeting/Event tracking (for DATA_CONTRACT_INTENTS: list_unmet_accounts_l90, etc.)
      
      // Helper to check if value is blank/empty
      const isBlank = (val) => val === '' || val === null || val === undefined || 
                               (typeof val === 'string' && val.trim() === '');
      
      // Calculate L90 cutoff date (90 days ago from today)
      const cutoffDate = new Date();
      cutoffDate.setDate(today.getDate() - 90);

      // Track accounts with no meetings in 90 days
      // Logic: Include if Event Date is BLANK OR (Valid Date AND Older than 90 days)
      let hasNoMeetings = false;
      
      // Check Event Date (Primary Source)
      if (map.eventDate > -1) {
        const eDateVal = row[map.eventDate];
        if (isBlank(eDateVal)) {
          hasNoMeetings = true; // No date = No meeting
        } else {
          const eDate = new Date(eDateVal);
          if (!isNaN(eDate.getTime()) && eDate < cutoffDate) {
            hasNoMeetings = true; // Date exists but is older than 90 days
          }
        }
      }
      
      // Fallback/Safety: If L90 Total Meetings column explicitly says 0
      if (!hasNoMeetings && map.l90Meetings > -1) {
        const l90 = parseFloat(row[map.l90Meetings]);
        if (l90 === 0) {
          hasNoMeetings = true;
        }
      }

      if (hasNoMeetings) {
        data.noMeetings90.push({ rid, name });
      }
      
      // Track accounts with no tasks in 90 days
      // Logic: Include if Task Date is BLANK OR (Valid Date AND Older than 90 days)
      let hasNoTasks = false;
      if (map.taskDate > -1) {
        const tDateVal = row[map.taskDate];
        if (isBlank(tDateVal)) {
          hasNoTasks = true; // No date = No task
        } else {
          const tDate = new Date(tDateVal);
          if (!isNaN(tDate.getTime()) && tDate < cutoffDate) {
            hasNoTasks = true; // Date exists but is older than 90 days
          }
        }
      }
      
      if (hasNoTasks) {
        data.noTasks90.push({ rid, name });
      }
      
      // Track Last Engaged Date buckets (for engagement coverage analysis)
      // Blank Last Engaged Date = NO ACTIVITY AT ALL in 90 days (worst case)
      if (map.lastEngaged > -1) {
        if (isBlank(row[map.lastEngaged])) {
          // Blank = No engagement logged at all - this is CRITICAL
          data.engagementBuckets.noActivity.push({ rid, name });
          data.engagementBuckets.critical.push({ rid, name, daysSince: 999 }); // Also in critical
          data.noEngagement90.push({ rid, name });
          data.staleEngagement90.push({ rid, name, daysSince: 999 });
          data.staleEngagement60.push({ rid, name, daysSince: 999 });
          data.staleEngagement30.push({ rid, name, daysSince: 999 });
        } else {
          const engagedDate = new Date(row[map.lastEngaged]);
          if (!isNaN(engagedDate.getTime())) {
            const daysSince = Math.floor((today - engagedDate) / (1000 * 60 * 60 * 24));
            
            // Bucket assignment (mutual exclusive - account goes in worst bucket)
            if (daysSince > 90) {
              data.engagementBuckets.critical.push({ rid, name, daysSince });
              data.staleEngagement90.push({ rid, name, daysSince });
              data.staleEngagement60.push({ rid, name, daysSince });
              data.staleEngagement30.push({ rid, name, daysSince });
            } else if (daysSince > 60) {
              data.engagementBuckets.atRisk.push({ rid, name, daysSince });
              data.staleEngagement60.push({ rid, name, daysSince });
              data.staleEngagement30.push({ rid, name, daysSince });
            } else if (daysSince > 30) {
              data.engagementBuckets.monitor.push({ rid, name, daysSince });
              data.staleEngagement30.push({ rid, name, daysSince });
            } else {
              data.engagementBuckets.active.push({ rid, name, daysSince });
            }
          }
        }
      }
    });
    
    // Calculate averages
    const calcAvg = (sum, cnt, decimals) => cnt > 0 ? (sum / cnt).toFixed(decimals) : '0';
    
    // Format simple category to sorted list with counts
    const formatSimpleCategory = (cat) => {
      return Object.entries(cat)
        .map(([key, arr]) => ({ name: key, count: arr.length, rids: arr }))
        .sort((a, b) => b.count - a.count);
    };
    
    // Format enhanced category with metrics (System Types, Quality Tiers)
    const formatMetricCategory = (cat) => {
      return Object.entries(cat)
        .map(([key, obj]) => ({
          name: key,
          count: obj.rids.length,
          rids: obj.rids,
          avgYield: calcAvg(obj.yldSum, obj.yldCnt, 0),
          avgSubFee: calcAvg(obj.subSum, obj.subCnt, 0)
        }))
        .sort((a, b) => b.count - a.count);
    };
    
    const result = {
      success: true,
      amName: amName,
      generatedAt: new Date().toISOString(),
      
      // Core counts
      totalAccounts: data.allRids.length,
      totalGroups: data.groups.size,
      
      // Contract status with RIDs
      termPending: { count: data.termPending.length, rids: data.termPending },
      termExpired: { count: data.termExpired.length, rids: data.termExpired },
      termWarning: { count: data.termWarning.length, rids: data.termWarning },
      
      // Averages (overall)
      avgYield: calcAvg(data.yldSum, data.yldCnt, 0),
      avgSubFee: calcAvg(data.subSum, data.subCnt, 0),
      avgDisco: calcAvg(data.discoSum, data.discoCnt, 1) + '%',
      momChange: calcAvg(data.momSum, data.momCnt, 1) + '%',
      piRevShare: calcAvg(data.piShareSum, data.piShareCnt, 1) + '%',
      posMatch: calcAvg(data.posSum, data.posCnt, 0) + '%',
      
      // Features with RIDs
      activePI: { count: data.activePI.length, rids: data.activePI },
      activeXP: { count: data.activeXP.length, rids: data.activeXP },
      instantBooking: { count: data.instantBooking.length, rids: data.instantBooking },
      privateDining: { count: data.privateDining.length, rids: data.privateDining },
      partnerFeedExcluded: { count: data.partnerFeedExcluded.length, rids: data.partnerFeedExcluded },
      
      // Enhanced categories WITH per-category metrics (avgYield, avgSubFee)
      systemMix: formatMetricCategory(data.systemTypes),
      qualityTiers: formatMetricCategory(data.qualityTiers),
      
      // Simple categories (RIDs only)
      specialPrograms: formatSimpleCategory(data.specialPrograms),
      exclusivePricing: formatSimpleCategory(data.exclusivePricing),
      noBookingReasons: formatSimpleCategory(data.noBookingReasons),
      topMetros: formatSimpleCategory(data.metros),
      systemOfRecord: formatSimpleCategory(data.systemOfRecord),
      
      // Alert flags (accounts needing attention)
      alertFlags: formatSimpleCategory(data.alertFlags),
      accountsWithAlerts: { 
        count: data.accountsWithAlerts.length, 
        rids: data.accountsWithAlerts 
      },
      
      // Meeting/Event tracking (for DATA_CONTRACT_INTENTS: list_unmet_accounts_l90, focus20_meetings_gap, etc.)
      // IMPORTANT: Blank cells in Event/Task/Engagement columns specifically mean NO ACTIVITY in past 90 days
      noMeetings90: { count: data.noMeetings90.length, rids: data.noMeetings90 },  // L90=0 OR blank Event Date
      noTasks90: { count: data.noTasks90.length, rids: data.noTasks90 },            // Blank Task Date
      noEngagement90: { count: data.noEngagement90.length, rids: data.noEngagement90 }, // Blank Last Engaged Date
      
      // Engagement coverage buckets (for coverage analysis queries)
      engagementCoverage: {
        active: { count: data.engagementBuckets.active.length, rids: data.engagementBuckets.active },
        monitor: { count: data.engagementBuckets.monitor.length, rids: data.engagementBuckets.monitor },
        atRisk: { count: data.engagementBuckets.atRisk.length, rids: data.engagementBuckets.atRisk },
        critical: { count: data.engagementBuckets.critical.length, rids: data.engagementBuckets.critical },
        noActivity: { count: data.engagementBuckets.noActivity.length, rids: data.engagementBuckets.noActivity }
      },
      staleEngagement90: { count: data.staleEngagement90.length, rids: data.staleEngagement90 },
      staleEngagement60: { count: data.staleEngagement60.length, rids: data.staleEngagement60 },
      staleEngagement30: { count: data.staleEngagement30.length, rids: data.staleEngagement30 },
      
      durationMs: new Date() - startTime
    };
    
    console.log(`[${functionName}] Found ${result.totalAccounts} accounts in ${result.durationMs}ms`);
    
    // Cache result (10 min = 600 seconds) with size safety check
    try {
      const jsonStr = JSON.stringify(result);
      if (jsonStr.length < 95000) {
        cache.put(cacheKey, jsonStr, 600);
        console.log(`[${functionName}] Cached ${jsonStr.length} bytes for ${amName}`);
      } else {
        console.log(`[${functionName}] Skipped cache - payload too large: ${jsonStr.length} bytes`);
      }
    } catch (cacheErr) {
      console.log(`[${functionName}] Cache PUT failed: ${cacheErr.message}`);
    }
    
    return result;
    
  } catch (e) {
    console.error(`[${functionName}] Error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

/**
 * Normalize RID for comparison - handles number/string formatting differences
 * @param {*} rid - The RID value (could be number, string, etc.)
 * @returns {string} Normalized RID string
 */
function normalizeRID_(rid) {
  if (rid === null || rid === undefined || rid === '') return '';
  // Convert to string, remove decimals (e.g., "1234.0" -> "1234"), trim whitespace
  let str = String(rid).trim();
  // Remove trailing .0 if present (Excel/Sheets often adds this)
  if (str.match(/^\d+\.0+$/)) {
    str = str.replace(/\.0+$/, '');
  }
  return str;
}

/**
 * Check RIDs in Smart Select (Column D) on the AM's tab
 * @param {Array<string>} rids - Array of RID strings to check
 * @param {string} amName - The AM whose tab to modify (for verification)
 * @returns {Object} Result with success status
 */
function checkRIDsInSmartSelect(rids, amName) {
  const functionName = 'checkRIDsInSmartSelect';
  
  try {
    if (!rids || rids.length === 0) {
      return { success: false, error: 'No RIDs provided' };
    }
    
    console.log(`[${functionName}] Attempting to check ${rids.length} RIDs for AM: "${amName}"`);
    console.log(`[${functionName}] First few RIDs: ${rids.slice(0, 5).join(', ')}`);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const activeSheet = ss.getActiveSheet();
    const currentAM = String(activeSheet.getRange('B2').getValue() || '').trim();
    
    console.log(`[${functionName}] Current sheet B2 value: "${currentAM}"`);
    
    // Verify we're on the correct tab (if amName is provided)
    if (amName && amName.trim() !== '') {
      if (currentAM.toLowerCase() !== amName.toLowerCase()) {
        console.log(`[${functionName}] Tab mismatch: current="${currentAM}", expected="${amName}"`);
        return {
          success: false,
          wrongTab: true,
          currentTab: currentAM,
          expectedTab: amName,
          error: `You are on ${currentAM || 'an unknown tab'}'s sheet, not ${amName}'s.`
        };
      }
    }
    
    // Find RID column (Column C) and Smart Select column (Column D)
    // Note: AM tabs have headers in Row 2, data starts Row 3
    const lastRow = activeSheet.getLastRow();
    if (lastRow < 3) {
      return { success: false, error: 'Sheet appears to have no data rows' };
    }
    
    const ridCol = 3;  // Column C - RID column on AM tabs
    const smartSelectCol = 4;  // Column D
    
    // Get all RIDs from column C (starting from row 3, data starts after headers in row 2)
    const rawRids = activeSheet.getRange(3, ridCol, lastRow - 2, 1).getValues();
    const allRids = rawRids.map(r => normalizeRID_(r[0]));
    
    console.log(`[${functionName}] Found ${allRids.length} RIDs on sheet. First few: ${allRids.slice(0, 5).join(', ')}`);
    
    // Normalize RIDs to check
    const ridsToCheck = rids.map(r => normalizeRID_(r)).filter(r => r !== '');
    
    console.log(`[${functionName}] Looking for ${ridsToCheck.length} normalized RIDs`);
    
    // Find which rows to check and track the RIDs
    const rowsToCheck = [];
    const checkedRIDs = [];
    allRids.forEach((sheetRid, idx) => {
      if (sheetRid && ridsToCheck.includes(sheetRid)) {
        rowsToCheck.push(idx + 3);  // +3 because data starts at row 3
        checkedRIDs.push(sheetRid);
      }
    });
    
    console.log(`[${functionName}] Matched ${rowsToCheck.length} rows`);
    
    if (rowsToCheck.length === 0) {
      // Provide more helpful error message
      return { 
        success: false, 
        error: `None of the ${ridsToCheck.length} specified RIDs were found on this sheet. Make sure you're on the correct AM's tab.`,
        hint: `Sheet has ${allRids.length} accounts. Current tab: ${currentAM}`
      };
    }
    
    // Check the Smart Select boxes for these rows
    rowsToCheck.forEach(row => {
      activeSheet.getRange(row, smartSelectCol).setValue(true);
    });
    
    SpreadsheetApp.flush();
    
    const notFound = ridsToCheck.length - rowsToCheck.length;
    let message = `Checked ${rowsToCheck.length} account${rowsToCheck.length > 1 ? 's' : ''} in Smart Select.`;
    if (notFound > 0) {
      message += ` (${notFound} RIDs were not found on this sheet)`;
    }
    
    return {
      success: true,
      checkedCount: rowsToCheck.length,
      checkedRIDs: checkedRIDs,  // Return the RIDs that were checked for layered filtering
      notFoundCount: notFound,
      message: message
    };
    
  } catch (e) {
    console.error(`[${functionName}] Error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

/**
 * Get portfolio analysis data for a specific AM
 * Uses the same calculations as generateAMSummary but formats for chat
 * @param {string} amName - The full AM name to analyze
 * @returns {Object} Portfolio analysis data
 */
function getAMPortfolioAnalysis(amName) {
  const functionName = 'getAMPortfolioAnalysis';
  const startTime = new Date();
  
  console.log(`[${functionName}] Analyzing portfolio for: "${amName}"`);
  
  try {
    if (!amName || amName.trim() === '') {
      return { success: false, error: 'No AM name provided' };
    }
    
    // Use existing generateAMSummary function which has all the calculations
    const rawData = generateAMSummary(amName);
    
    if (!rawData || rawData.book === 0) {
      return {
        success: false,
        error: `No accounts found for "${amName}". Make sure the name matches exactly.`
      };
    }
    
    // Format the data for chat consumption
    const analysis = {
      amName: amName,
      generatedAt: new Date().toISOString(),
      
      // Core metrics
      bucket: rawData.book || 0,
      groups: rawData.groups || 0,
      
      // Contract status
      termPending: rawData.termCanc || 0,
      contractRenewal: {
        expired: rawData.termExpired || 0,
        canceling: rawData.termCanc || 0,
        warning45d: rawData.termWarn || 0
      },
      
      // Performance metrics
      avgYield: rawData.yield || '0',
      avgSubFee: rawData.subfees || '0',
      discoveryPct: rawData.disco || '0%',
      momChange: rawData.mom || '0%',
      
      // Product adoption
      activePI: rawData.pi || 0,
      activeXP: rawData.xp || 0,
      instantBooking: rawData.ib || 0,
      privateDining: rawData.pd || 0,
      partnerFeedExcluded: rawData.pfExc || 0,
      piRevShare: rawData.piRevShare || '0%',
      posMatch: rawData.posMatch || '0%',
      
      // Breakdowns (the lists)
      systemMix: rawData.sysTypeList || [],
      qualityTiers: rawData.qualityList || [],
      specialPrograms: rawData.progList || [],
      exclusivePricing: rawData.priceList || [],
      noBookingReasons: rawData.noBookList || [],
      topMetros: rawData.metroList || [],
      systemOfRecord: rawData.sorList || []
    };
    
    const duration = (new Date() - startTime) / 1000;
    console.log(`[${functionName}] Analysis complete in ${duration}s`);
    
    return {
      success: true,
      data: analysis,
      durationMs: duration * 1000
    };
    
  } catch (e) {
    console.error(`[${functionName}] Error: ${e.message}`);
    return {
      success: false,
      error: e.message,
      durationMs: new Date() - startTime
    };
  }
}

/**
 * Get aggregated portfolio analysis for all AMs (team summary)
 * @returns {Object} Aggregated team analysis data
 */
function getTeamPortfolioAnalysis() {
  const functionName = 'getTeamPortfolioAnalysis';
  const startTime = new Date();
  
  console.log(`[${functionName}] Generating team-wide analysis`);
  
  try {
    // Get list of all AMs with tabs
    const amTabsResult = getAvailableAMTabs();
    if (!amTabsResult.success || amTabsResult.ams.length === 0) {
      return { success: false, error: 'No AM tabs found' };
    }
    
    // Initialize aggregation object
    const teamAgg = {
      totalBucket: 0,
      totalGroups: 0,
      termPending: 0,
      expired: 0,
      canceling: 0,
      warning45d: 0,
      yieldSum: 0,
      yieldCount: 0,
      subFeeSum: 0,
      subFeeCount: 0,
      activePI: 0,
      activeXP: 0,
      instantBooking: 0,
      privateDining: 0,
      partnerFeedExcluded: 0,
      systemMix: {},
      qualityTiers: {},
      specialPrograms: {},
      exclusivePricing: {},
      noBookingReasons: {},
      topMetros: {},
      amCount: 0
    };
    
    const amBreakdown = [];
    
    // Aggregate data from each AM
    for (const am of amTabsResult.ams) {
      try {
        const amData = generateAMSummary(am.fullName);
        
        if (amData && amData.book > 0) {
          teamAgg.amCount++;
          teamAgg.totalBucket += amData.book || 0;
          teamAgg.totalGroups += amData.groups || 0;
          teamAgg.termPending += amData.termCanc || 0;
          teamAgg.expired += amData.termExpired || 0;
          teamAgg.canceling += amData.termCanc || 0;
          teamAgg.warning45d += amData.termWarn || 0;
          teamAgg.activePI += amData.pi || 0;
          teamAgg.activeXP += amData.xp || 0;
          teamAgg.instantBooking += amData.ib || 0;
          teamAgg.privateDining += amData.pd || 0;
          teamAgg.partnerFeedExcluded += amData.pfExc || 0;
          
          // Parse yield and subfee for averaging
          const yieldVal = parseFloat(String(amData.yield || '0').replace(/[^0-9.-]/g, ''));
          const subFeeVal = parseFloat(String(amData.subfees || '0').replace(/[^0-9.-]/g, ''));
          if (!isNaN(yieldVal) && amData.book > 0) {
            teamAgg.yieldSum += yieldVal * amData.book;
            teamAgg.yieldCount += amData.book;
          }
          if (!isNaN(subFeeVal) && amData.book > 0) {
            teamAgg.subFeeSum += subFeeVal * amData.book;
            teamAgg.subFeeCount += amData.book;
          }
          
          // Aggregate lists
          aggregateList_(teamAgg.systemMix, amData.sysTypeList);
          aggregateList_(teamAgg.qualityTiers, amData.qualityList);
          aggregateList_(teamAgg.specialPrograms, amData.progList);
          aggregateList_(teamAgg.exclusivePricing, amData.priceList);
          aggregateList_(teamAgg.noBookingReasons, amData.noBookList);
          aggregateList_(teamAgg.topMetros, amData.metroList);
          
          // Store individual AM summary for breakdown
          amBreakdown.push({
            name: am.fullName,
            bucket: amData.book || 0,
            termPending: amData.termCanc || 0,
            activePI: amData.pi || 0
          });
        }
      } catch (amError) {
        console.log(`[${functionName}] Error processing ${am.fullName}: ${amError.message}`);
      }
    }
    
    // Calculate averages and format output
    const analysis = {
      teamName: 'All Account Managers',
      generatedAt: new Date().toISOString(),
      amCount: teamAgg.amCount,
      
      // Core metrics
      bucket: teamAgg.totalBucket,
      groups: teamAgg.totalGroups,
      
      // Contract status
      termPending: teamAgg.termPending,
      contractRenewal: {
        expired: teamAgg.expired,
        canceling: teamAgg.canceling,
        warning45d: teamAgg.warning45d
      },
      
      // Performance metrics (weighted averages)
      avgYield: teamAgg.yieldCount > 0 ? (teamAgg.yieldSum / teamAgg.yieldCount).toFixed(0) : '0',
      avgSubFee: teamAgg.subFeeCount > 0 ? (teamAgg.subFeeSum / teamAgg.subFeeCount).toFixed(0) : '0',
      
      // Product adoption
      activePI: teamAgg.activePI,
      activeXP: teamAgg.activeXP,
      instantBooking: teamAgg.instantBooking,
      privateDining: teamAgg.privateDining,
      partnerFeedExcluded: teamAgg.partnerFeedExcluded,
      
      // Breakdowns
      systemMix: objectToSortedList_(teamAgg.systemMix, 10),
      qualityTiers: objectToSortedList_(teamAgg.qualityTiers, 10),
      specialPrograms: objectToSortedList_(teamAgg.specialPrograms, 10),
      exclusivePricing: objectToSortedList_(teamAgg.exclusivePricing, 10),
      noBookingReasons: objectToSortedList_(teamAgg.noBookingReasons, 10),
      topMetros: objectToSortedList_(teamAgg.topMetros, 10),
      
      // AM breakdown for comparison
      amBreakdown: amBreakdown.sort((a, b) => b.bucket - a.bucket)
    };
    
    const duration = (new Date() - startTime) / 1000;
    console.log(`[${functionName}] Team analysis complete in ${duration}s - ${teamAgg.amCount} AMs, ${teamAgg.totalBucket} total accounts`);
    
    return {
      success: true,
      data: analysis,
      durationMs: duration * 1000
    };
    
  } catch (e) {
    console.error(`[${functionName}] Error: ${e.message}`);
    return {
      success: false,
      error: e.message,
      durationMs: new Date() - startTime
    };
  }
}

/**
 * Helper: Aggregate a list into an object for team totals
 * @private
 */
function aggregateList_(targetObj, sourceList) {
  if (!sourceList || !Array.isArray(sourceList)) return;
  for (const item of sourceList) {
    if (item.label) {
      targetObj[item.label] = (targetObj[item.label] || 0) + (item.count || 0);
    }
  }
}

/**
 * Helper: Convert aggregation object to sorted list
 * @private
 */
function objectToSortedList_(obj, limit) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

/**
 * Get AM rankings - compare current AM against all team members
 * @param {string} targetAMName - The AM to rank (current AM)
 * @returns {Object} Rankings data with position and comparisons
 */
function getAMRankings(targetAMName) {
  const functionName = 'getAMRankings';
  const startTime = new Date();
  
  console.log(`[${functionName}] Generating rankings for: ${targetAMName}`);
  
  try {
    // Get list of all AMs with tabs
    const amTabsResult = getAvailableAMTabs();
    if (!amTabsResult.success || amTabsResult.ams.length === 0) {
      return { success: false, error: 'No AM tabs found' };
    }
    
    // Collect detailed data for each AM
    const amDataList = [];
    
    for (const am of amTabsResult.ams) {
      try {
        const amData = generateAMSummary(am.fullName);
        
        if (amData && amData.book > 0) {
          // Parse numeric values
          const yieldVal = parseFloat(String(amData.yield || '0').replace(/[^0-9.-]/g, ''));
          const subFeeVal = parseFloat(String(amData.subfees || '0').replace(/[^0-9.-]/g, ''));
          
          // Calculate PRO share from sysTypeList
          let proCount = 0;
          if (amData.sysTypeList && Array.isArray(amData.sysTypeList)) {
            const proItem = amData.sysTypeList.find(item => 
              item.label && item.label.toLowerCase().includes('pro')
            );
            if (proItem) proCount = proItem.count || 0;
          }
          
          amDataList.push({
            name: am.fullName,
            firstName: am.fullName.split(' ')[0],
            bucket: amData.book || 0,
            groups: amData.groups || 0,
            avgYield: isNaN(yieldVal) ? 0 : yieldVal,
            avgSubFee: isNaN(subFeeVal) ? 0 : subFeeVal,
            termPending: amData.termCanc || 0,
            termExpired: amData.termExpired || 0,
            termWarn: amData.termWarn || 0,
            activePI: amData.pi || 0,
            activeXP: amData.xp || 0,
            instantBooking: amData.ib || 0,
            privateDining: amData.pd || 0,
            partnerFeedExcluded: amData.pfExc || 0,
            engagedLast90: amData.engagedLast90 || 0,
            proCount: proCount,
            // Calculate percentages
            piPercent: amData.book > 0 ? ((amData.pi || 0) / amData.book * 100).toFixed(1) : 0,
            termPendingPercent: amData.book > 0 ? ((amData.termCanc || 0) / amData.book * 100).toFixed(1) : 0,
            proPercent: amData.book > 0 ? (proCount / amData.book * 100).toFixed(1) : 0,
            engagedPercent: amData.book > 0 ? ((amData.engagedLast90 || 0) / amData.book * 100).toFixed(1) : 0
          });
        }
      } catch (amError) {
        console.log(`[${functionName}] Error processing ${am.fullName}: ${amError.message}`);
      }
    }
    
    if (amDataList.length === 0) {
      return { success: false, error: 'No AM data found' };
    }
    
    // Find the target AM
    const targetAM = amDataList.find(am => 
      am.name.toLowerCase() === targetAMName.toLowerCase()
    );
    
    if (!targetAM) {
      return { success: false, error: `AM "${targetAMName}" not found in team data` };
    }
    
    const totalAMs = amDataList.length;
    
    // Calculate rankings for each metric (higher is better for most)
    const rankings = {};
    
    // Metrics where higher is better
    const higherBetter = ['bucket', 'groups', 'avgSubFee', 'activePI', 'activeXP', 'instantBooking', 'privateDining', 'proPercent', 'engagedPercent'];
    
    // Metrics where lower is better
    const lowerBetter = ['termPending', 'termExpired', 'termWarn', 'partnerFeedExcluded', 'termPendingPercent'];
    
    for (const metric of higherBetter) {
      const sorted = [...amDataList].sort((a, b) => b[metric] - a[metric]);
      const rank = sorted.findIndex(am => am.name === targetAM.name) + 1;
      rankings[metric] = {
        rank: rank,
        total: totalAMs,
        value: targetAM[metric],
        topAM: sorted[0].name !== targetAM.name ? { name: sorted[0].firstName, value: sorted[0][metric] } : null,
        teamAvg: (amDataList.reduce((sum, am) => sum + am[metric], 0) / totalAMs).toFixed(1)
      };
    }
    
    for (const metric of lowerBetter) {
      const sorted = [...amDataList].sort((a, b) => a[metric] - b[metric]); // Lower is better
      const rank = sorted.findIndex(am => am.name === targetAM.name) + 1;
      rankings[metric] = {
        rank: rank,
        total: totalAMs,
        value: targetAM[metric],
        bestAM: sorted[0].name !== targetAM.name ? { name: sorted[0].firstName, value: sorted[0][metric] } : null,
        teamAvg: (amDataList.reduce((sum, am) => sum + am[metric], 0) / totalAMs).toFixed(1)
      };
    }
    
    // Build full leaderboard for key metrics
    const leaderboards = {
      bucketSize: [...amDataList].sort((a, b) => b.bucket - a.bucket).map((am, i) => ({
        rank: i + 1,
        name: am.firstName,
        value: am.bucket,
        isTarget: am.name === targetAM.name
      })),
      proShare: [...amDataList].sort((a, b) => parseFloat(b.proPercent) - parseFloat(a.proPercent)).map((am, i) => ({
        rank: i + 1,
        name: am.firstName,
        value: am.proPercent + '%',
        isTarget: am.name === targetAM.name
      })),
      engagedLast90: [...amDataList].sort((a, b) => parseFloat(b.engagedPercent) - parseFloat(a.engagedPercent)).map((am, i) => ({
        rank: i + 1,
        name: am.firstName,
        value: am.engagedPercent + '%',
        isTarget: am.name === targetAM.name
      })),
      avgSubFee: [...amDataList].sort((a, b) => b.avgSubFee - a.avgSubFee).map((am, i) => ({
        rank: i + 1,
        name: am.firstName,
        value: '$' + am.avgSubFee.toFixed(0),
        isTarget: am.name === targetAM.name
      })),
      piAdoption: [...amDataList].sort((a, b) => parseFloat(b.piPercent) - parseFloat(a.piPercent)).map((am, i) => ({
        rank: i + 1,
        name: am.firstName,
        value: am.piPercent + '%',
        isTarget: am.name === targetAM.name
      })),
      termPendingRisk: [...amDataList].sort((a, b) => a.termPending - b.termPending).map((am, i) => ({
        rank: i + 1,
        name: am.firstName,
        value: am.termPending,
        isTarget: am.name === targetAM.name
      }))
    };
    
    const duration = (new Date() - startTime) / 1000;
    console.log(`[${functionName}] Rankings complete in ${duration}s - ${totalAMs} AMs compared`);
    
    return {
      success: true,
      data: {
        targetAM: {
          name: targetAM.name,
          firstName: targetAM.firstName,
          metrics: targetAM
        },
        totalAMs: totalAMs,
        rankings: rankings,
        leaderboards: leaderboards,
        generatedAt: new Date().toISOString()
      },
      durationMs: duration * 1000
    };
    
  } catch (e) {
    console.error(`[${functionName}] Error: ${e.message}`);
    return {
      success: false,
      error: e.message,
      durationMs: new Date() - startTime
    };
  }
}

// =============================================================
// SECTION 8: DAILY JUMP START
// =============================================================

/**
 * Maps account status/programs to emoji for visual display
 * @param {Array<string>} statuses - Array of status strings (e.g., ['Freemium', 'Visa'])
 * @returns {string} Combined emoji string (e.g., '💸💳')
 */
function mapStatusToEmoji_(statuses) {
  if (!statuses || !Array.isArray(statuses)) return '';
  
  const emojiMap = {
    'freemium': '💸',
    'ayce': '🍽️',
    'visa': '💳',
    'chase': '🔵',
    'uber': '🚗',
    'icon': '⭐',
    'icons': '⭐',
    'elite': '👑',
    'elites': '👑',
    'vip': '👑',
    'platinum': '💎',
    'gold': '🥇',
    'silver': '🥈',
    'bronze': '🥉'
  };
  
  let result = '';
  const seen = new Set();
  
  for (const status of statuses) {
    if (!status) continue;
    const normalized = String(status).toLowerCase().trim();
    
    // Skip "Top" or "Top [Nom]" as these are non-informative
    if (normalized === 'top' || normalized === 'top [nom]') continue;
    
    // Check each key in the map
    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (normalized.includes(key) && !seen.has(emoji)) {
        result += emoji;
        seen.add(emoji);
        break;
      }
    }
  }
  
  return result;
}

/**
 * Maps account status/programs to emoji with labels for UI display
 * Returns array of {emoji, label} for individual tooltip display
 * @param {Array<string>} statuses - Array of status strings (e.g., ['Freemium', 'Visa'])
 * @returns {Array<{emoji: string, label: string}>} Array of emoji objects with labels
 */
function mapStatusToEmojiWithLabels_(statuses) {
  if (!statuses || !Array.isArray(statuses)) return [];
  
  const emojiMap = {
    'freemium': { emoji: '💸', label: 'Freemium' },
    'ayce': { emoji: '🍽️', label: 'AYCE' },
    'visa': { emoji: '💳', label: 'Visa' },
    'chase': { emoji: '🔵', label: 'Chase' },
    'uber': { emoji: '🚗', label: 'Uber' },
    'icon': { emoji: '⭐', label: 'Icon' },
    'icons': { emoji: '⭐', label: 'Icon' },
    'elite': { emoji: '👑', label: 'Elite/VIP' },
    'elites': { emoji: '👑', label: 'Elite/VIP' },
    'vip': { emoji: '👑', label: 'Elite/VIP' },
    'platinum': { emoji: '💎', label: 'Platinum' },
    'gold': { emoji: '🥇', label: 'Gold' },
    'silver': { emoji: '🥈', label: 'Silver' },
    'bronze': { emoji: '🥉', label: 'Bronze' }
  };
  
  const result = [];
  const seen = new Set();
  
  for (const status of statuses) {
    if (!status) continue;
    const normalized = String(status).toLowerCase().trim();
    
    // Skip "Top" or "Top [Nom]" as these are non-informative
    if (normalized === 'top' || normalized === 'top [nom]') continue;
    
    // Check each key in the map
    for (const [key, emojiObj] of Object.entries(emojiMap)) {
      if (normalized.includes(key) && !seen.has(emojiObj.emoji)) {
        result.push({ emoji: emojiObj.emoji, label: emojiObj.label });
        seen.add(emojiObj.emoji);
        break;
      }
    }
  }
  
  return result;
}

/**
 * Get Jump Start data for Daily Jump Start panel
 * Returns 5 sections with account lists formatted for UI display
 * @param {string} amName - The AM's full name (optional, will detect from active tab if not provided)
 * @returns {Object} Jump Start sections with account arrays
 */
function getJumpStartData(amName) {
  const functionName = 'getJumpStartData';
  const startTime = new Date();
  
  console.log(`[${functionName}] Starting for AM: "${amName || '(auto-detect)'}"`);
  
  try {
    // If no AM name provided, detect from active tab
    if (!amName || amName.trim() === '') {
      const context = getActiveAMContext();
      if (context.isAMTab && context.fullName) {
        amName = context.fullName;
        console.log(`[${functionName}] Auto-detected AM: "${amName}"`);
      } else {
        return { 
          success: false, 
          error: 'Could not detect AM. Please navigate to an AM tab.' 
        };
      }
    }
    
    // Get detailed AM data (existing function)
    const data = getDetailedAMData(amName);
    if (!data.success) {
      return { success: false, error: data.error || 'Failed to load account data' };
    }
    
    console.log(`[${functionName}] Loaded ${data.totalAccounts} accounts for ${amName}`);
    
    // Get additional per-account data for highPIRevenue filter
    const highPIAccounts = filterHighPIRevenue_(amName);
    
    // Get accounts with booking issues (0-Fullbook or similar) - now returns {accounts, subsections}
    const bookingIssuesData = filterBookingIssues_(data.noBookingReasons);
    
    // Get accounts with non-OpenTable System of Record
    const nonOTAccounts = filterNonOTSystemOfRecord_(data.systemOfRecord);
    
    // Build sections
    const sections = {
      termPending: {
        id: 'termPending',
        title: 'Term Pending',
        priority: 'high',
        priorityDot: '🔴',
        count: data.termPending.count,
        accounts: formatAccountsForUI_(data.termPending.rids, data)
      },
      contractsExpiring: {
        id: 'contractsExpiring',
        title: 'Contracts Expiring',
        priority: 'high',
        priorityDot: '🔴',
        count: data.termWarning.count,
        accounts: formatAccountsForUI_(data.termWarning.rids, data)
      },
      noEngagement60: {
        id: 'noEngagement60',
        title: 'No Engagement 60d',
        priority: 'medium',
        priorityDot: '🟡',
        count: data.staleEngagement60.count,
        accounts: formatAccountsForUI_(data.staleEngagement60.rids, data)
      },
      noBookings30: {
        id: 'noBookings30',
        title: 'No Bookings >30 Days',
        priority: 'medium',
        priorityDot: '🟡',
        count: bookingIssuesData.accounts.length,
        accounts: bookingIssuesData.accounts,
        subsections: bookingIssuesData.subsections  // Array of {flag, count, accounts}
      },
      nonOTSystem: {
        id: 'nonOTSystem',
        title: 'Non-OT System of Record',
        priority: 'medium',
        priorityDot: '🟡',
        count: nonOTAccounts.length,
        accounts: nonOTAccounts
      },
      highPIRevenue: {
        id: 'highPIRevenue',
        title: 'High PI + Revenue',
        priority: 'opportunity',
        priorityDot: '🟢',
        count: highPIAccounts.length,
        accounts: highPIAccounts
      }
    };
    
    const duration = new Date() - startTime;
    console.log(`[${functionName}] Completed in ${duration}ms`);
    
    // Generate strategic insights based on portfolio data
    const strategicInsights = {
      suggestions: getStrategicSuggestions_(data, sections),
      recommendedPrompts: getRecommendedPrompts_(data, sections)
    };
    
    return {
      success: true,
      amName: amName,
      generatedAt: new Date().toISOString(),
      sections: sections,
      totalAccounts: data.totalAccounts,
      strategicInsights: strategicInsights,
      durationMs: duration
    };
    
  } catch (e) {
    console.error(`[${functionName}] Error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

/**
 * Format account RIDs for UI display with emoji status
 * @param {Array} rids - Array of {rid, name, ...} objects
 * @param {Object} data - Full data object from getDetailedAMData
 * @returns {Array} Formatted accounts [{rid, name, emoji}, ...]
 */
function formatAccountsForUI_(rids, data) {
  if (!rids || !Array.isArray(rids)) return [];
  
  // Build lookup for exclusive pricing and special programs
  const pricingMap = {};
  const programsMap = {};
  
  if (data.exclusivePricing) {
    data.exclusivePricing.forEach(item => {
      if (item.rids) {
        item.rids.forEach(acc => {
          if (!pricingMap[acc.rid]) pricingMap[acc.rid] = [];
          pricingMap[acc.rid].push(item.name);
        });
      }
    });
  }
  
  if (data.specialPrograms) {
    data.specialPrograms.forEach(item => {
      if (item.rids) {
        item.rids.forEach(acc => {
          if (!programsMap[acc.rid]) programsMap[acc.rid] = [];
          programsMap[acc.rid].push(item.name);
        });
      }
    });
  }
  
  return rids.map(acc => {
    const rid = acc.rid;
    const statuses = [
      ...(pricingMap[rid] || []),
      ...(programsMap[rid] || [])
    ];
    
    return {
      rid: rid,
      name: acc.name || 'Unknown',
      emoji: mapStatusToEmoji_(statuses),
      emojiTags: mapStatusToEmojiWithLabels_(statuses),  // Array of {emoji, label} for hover tooltips
      daysSince: acc.daysSince || null,  // For engagement tracking
      daysUntil: acc.daysUntil || null   // For contract expiration tracking
    };
  });
}

/**
 * Filter accounts with booking issues (0-Fullbook, etc.)
 * Uses noBookingReasons from getDetailedAMData
 * @param {Array} noBookingReasons - Array of {name, count, rids} from data
 * @returns {Array} Formatted accounts with booking issues
 */
function filterBookingIssues_(noBookingReasons) {
  if (!noBookingReasons || !Array.isArray(noBookingReasons)) {
    return { accounts: [], subsections: [] };
  }
  
  // Keywords that indicate booking problems
  const issueKeywords = ['0-fullbook', 'no booking', 'inactive', 'zero', 'none'];
  
  const allAccounts = [];
  const subsections = [];
  const seen = new Set();
  
  noBookingReasons.forEach(category => {
    const categoryName = String(category.name || '').toLowerCase();
    const displayName = category.name || 'Unknown Flag';
    
    // Check if this category indicates a booking issue
    const isIssue = issueKeywords.some(kw => categoryName.includes(kw));
    
    if (isIssue && category.rids && category.rids.length > 0) {
      const subsectionAccounts = [];
      
      category.rids.forEach(acc => {
        const account = {
          rid: acc.rid,
          name: acc.name || 'Unknown',
          emoji: '📉',  // Booking issue indicator
          reason: displayName
        };
        
        subsectionAccounts.push(account);
        
        // Also add to allAccounts if not already seen
        if (!seen.has(acc.rid)) {
          seen.add(acc.rid);
          allAccounts.push(account);
        }
      });
      
      // Add subsection with this flag's accounts
      subsections.push({
        flag: displayName,
        count: subsectionAccounts.length,
        accounts: subsectionAccounts
      });
    }
  });
  
  // Sort subsections by count (descending)
  subsections.sort((a, b) => b.count - a.count);
  
  console.log(`[filterBookingIssues_] Found ${allAccounts.length} accounts across ${subsections.length} flag types`);
  
  return { accounts: allAccounts, subsections: subsections };
}

/**
 * Filter accounts with high PI revenue share AND high total revenue
 * Criteria: piRevShare > 30% AND (subfees + yield) > $1,200
 * @param {string} amName - The AM's full name
 * @returns {Array} Formatted accounts meeting criteria
 */
function filterHighPIRevenue_(amName) {
  const functionName = 'filterHighPIRevenue_';
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const statSheet = ss.getSheetByName('STATCORE');
    const distroSheet = ss.getSheetByName('DISTRO');
    
    if (!statSheet || !distroSheet) {
      console.log(`[${functionName}] Missing sheets`);
      return [];
    }
    
    // Get STATCORE data
    const sHead = statSheet.getRange(2, 1, 1, statSheet.getLastColumn()).getValues()[0];
    const sData = statSheet.getRange(3, 1, statSheet.getLastRow()-2, statSheet.getLastColumn()).getValues();
    
    // Get DISTRO data
    const dHead = distroSheet.getRange(1, 1, 1, distroSheet.getLastColumn()).getValues()[0];
    const dData = distroSheet.getRange(2, 1, distroSheet.getLastRow()-1, distroSheet.getLastColumn()).getValues();
    
    // Column mapping helper
    const findCol = (headers, keyword) => headers.findIndex(h => 
      String(h).toLowerCase().replace(/[^a-z0-9]/g, "").includes(keyword.toLowerCase().replace(/[^a-z0-9]/g, ""))
    );
    
    // STATCORE columns
    const s_ridIdx = findCol(sHead, "rid");
    const s_amIdx = findCol(sHead, "accountmanager");
    const s_nameIdx = findCol(sHead, "accountname");
    
    // DISTRO columns
    const d_ridIdx = findCol(dHead, "rid");
    const d_piShareIdx = findCol(dHead, "pirevshare");
    const d_subfeesIdx = findCol(dHead, "subslastmonth");
    const d_yieldIdx = findCol(dHead, "revyield");
    const d_piIdx = findCol(dHead, "activepi");
    
    if (s_amIdx === -1) {
      console.log(`[${functionName}] Could not find AM column`);
      return [];
    }
    
    // Build DISTRO lookup map
    const dMap = new Map();
    dData.forEach(row => {
      const rid = String(row[d_ridIdx] || '');
      if (rid) dMap.set(rid, row);
    });
    
    // Filter accounts
    const highPIAccounts = [];
    
    sData.forEach(row => {
      const rowAM = String(row[s_amIdx] || '').trim();
      if (rowAM.toLowerCase() !== amName.toLowerCase().trim()) return;
      
      const rid = String(row[s_ridIdx] || '');
      const name = String(row[s_nameIdx] || 'Unknown');
      const dRow = dMap.get(rid);
      
      if (!dRow) return;
      
      // Check if has active PI
      const hasPI = hasActivePI(dRow[d_piIdx]);
      if (!hasPI) return;
      
      // Get PI revenue share (percentage)
      const piShare = parseFloat(String(dRow[d_piShareIdx] || '0').replace('%', '')) || 0;
      
      // Get Rev Yield - Total Last Month (the revenue metric for this filter)
      const yieldVal = parseFloat(dRow[d_yieldIdx]) || 0;
      
      // Apply filters: PI share > 30% AND Rev Yield - Total Last Month > $1,200
      if (piShare > 30 && yieldVal > 1200) {
        highPIAccounts.push({
          rid: rid,
          name: name,
          emoji: '💰',
          piShare: piShare.toFixed(1) + '%',
          revenue: '$' + yieldVal.toFixed(0)
        });
      }
    });
    
    console.log(`[${functionName}] Found ${highPIAccounts.length} high PI revenue accounts`);
    return highPIAccounts;
    
  } catch (e) {
    console.error(`[${functionName}] Error: ${e.message}`);
    return [];
  }
}

/**
 * Filter accounts with non-OpenTable System of Record
 * Uses systemOfRecord from getDetailedAMData
 * @param {Array} systemOfRecordData - Array of {name, count, rids} from data
 * @returns {Array} Formatted accounts with non-OT SOR
 */
function filterNonOTSystemOfRecord_(systemOfRecordData) {
  if (!systemOfRecordData || !Array.isArray(systemOfRecordData)) return [];
  
  // SOR values that indicate OpenTable (should be excluded)
  const otKeywords = ['ot', 'opentable', 'open table'];
  
  const accounts = [];
  const seen = new Set();
  
  systemOfRecordData.forEach(category => {
    const categoryName = String(category.name || '').toLowerCase().trim();
    
    // Skip empty or OT-related categories
    if (!categoryName) return;
    const isOT = otKeywords.some(kw => categoryName === kw || categoryName.includes(kw));
    if (isOT) return;
    
    // Add accounts from non-OT categories
    if (category.rids && Array.isArray(category.rids)) {
      category.rids.forEach(acc => {
        const rid = acc.rid || acc;
        if (seen.has(rid)) return;
        seen.add(rid);
        
        accounts.push({
          rid: rid,
          name: acc.name || 'Unknown',
          emoji: '⚠️',
          sorType: category.name  // Show the SOR type (Resy, SevenRooms, etc.)
        });
      });
    }
  });
  
  console.log(`[filterNonOTSystemOfRecord_] Found ${accounts.length} non-OT SOR accounts`);
  return accounts;
}

/**
 * Generate strategic suggestions based on portfolio data
 * Returns 3 contextual suggestions based on current portfolio state
 * @param {Object} data - Full data object from getDetailedAMData
 * @param {Object} sections - The built sections object
 * @returns {Array} Array of 3 suggestion strings
 */
function getStrategicSuggestions_(data, sections) {
  const suggestions = [];
  const total = data.totalAccounts || 0;
  
  // Suggestion 1: Renewal phase focus
  const termPendingCount = sections.termPending?.count || 0;
  const contractsExpiringCount = sections.contractsExpiring?.count || 0;
  const renewalTotal = termPendingCount + contractsExpiringCount;
  
  if (renewalTotal > 0) {
    if (termPendingCount > 0) {
      suggestions.push(`${termPendingCount} accounts in Term Pending status — run the Renewal Lifecycle checklist (Phase 3: Run & Close)`);
    } else {
      suggestions.push(`${contractsExpiringCount} contracts expiring soon — start building value stories (Phase 2)`);
    }
  } else {
    suggestions.push('No immediate renewals — great time to focus on engagement and upsells');
  }
  
  // Suggestion 2: System type opportunities
  const systemTypes = data.systemTypes || [];
  const basicCount = systemTypes.find(s => (s.name || '').toLowerCase().includes('basic'))?.count || 0;
  const coreCount = systemTypes.find(s => (s.name || '').toLowerCase().includes('core'))?.count || 0;
  
  if (basicCount > 3) {
    suggestions.push(`${basicCount} accounts on BASIC — consider Operational Relief Play to demonstrate PRO value`);
  } else if (coreCount > 5) {
    suggestions.push(`${coreCount} accounts on CORE — check for IT constraints limiting adoption`);
  } else {
    // Cascading priority: most actionable insight first
    const pfExcluded = data.partnerFeedExcluded?.count || 0;
    const proCount = systemTypes.find(s => (s.name || '').toLowerCase().includes('pro'))?.count || 0;
    const activeXP = data.activeXP?.count || 0;
    const activePI = data.activePI?.count || 0;
    const avgDisco = parseFloat(String(data.avgDisco || '0').replace('%', '')) || 0;
    
    if (pfExcluded > 0) {
      // Priority 1: Partner Feed issues - most urgent visibility problem
      suggestions.push(`${pfExcluded} account${pfExcluded > 1 ? 's' : ''} with PartnerFeed excluded — potential visibility issue affecting covers`);
    } else if (proCount > 5 && activeXP < proCount * 0.3) {
      // Priority 2: PRO underutilization - paying for features not used
      const proWithoutXP = proCount - activeXP;
      suggestions.push(`${proWithoutXP} PRO account${proWithoutXP > 1 ? 's' : ''} without Active XP — paying for features they're not using`);
    } else {
      const activeXPPct = total > 0 ? Math.round((activeXP / total) * 100) : 0;
      const activePIPct = total > 0 ? Math.round((activePI / total) * 100) : 0;
      
      if (activeXPPct < 25) {
        // Priority 3: XP adoption - concrete product pitch
        suggestions.push(`Only ${activeXPPct}% of accounts have Active XP — pitch Experiences for incremental covers`);
      } else if (avgDisco < 35) {
        // Priority 4: Discovery growth opportunity
        suggestions.push(`Portfolio at ${avgDisco.toFixed(0)}% Discovery — room to grow network channel with availability optimization`);
      } else if (activePIPct < 30) {
        // Priority 5: PI adoption (fixed - using .count)
        suggestions.push(`Only ${activePIPct}% of accounts have Active PI — opportunity to pitch promoted inventory`);
      } else {
        // Healthy adoption - celebrate
        suggestions.push(`${activePIPct}% PI adoption rate — above average! Focus on high performers`);
      }
    }
  }
  
  // Suggestion 3: Engagement or risk-based
  const noEngagementCount = sections.noEngagement60?.count || 0;
  const noBookingsCount = sections.noBookings30?.count || 0;
  
  if (noEngagementCount > 5) {
    suggestions.push(`${noEngagementCount} accounts with 60+ day engagement gap — prioritize quick check-ins to prevent silent churn`);
  } else if (noBookingsCount > 3) {
    suggestions.push(`${noBookingsCount} accounts with booking issues — investigate 0-Fullbook and availability settings`);
  } else {
    // Healthy portfolio suggestion
    suggestions.push('Portfolio health looks good — consider proactive QBRs with top revenue accounts');
  }
  
  return suggestions.slice(0, 3);  // Ensure max 3 suggestions
}

/**
 * Generate recommended prompts based on portfolio data
 * Returns 2-3 contextual prompts the user can click to explore
 * @param {Object} data - Full data object from getDetailedAMData
 * @param {Object} sections - The built sections object
 * @returns {Array} Array of prompt strings
 */
function getRecommendedPrompts_(data, sections) {
  const prompts = [];
  
  // Always include a high-value prompt
  prompts.push('Which accounts have the highest revenue but declining disco?');
  
  // Context-specific prompts based on portfolio
  const termPendingCount = sections.termPending?.count || 0;
  const contractsExpiringCount = sections.contractsExpiring?.count || 0;
  
  if (termPendingCount > 0 || contractsExpiringCount > 0) {
    prompts.push('Show me accounts approaching renewal in the next 30 days');
  }
  
  const noEngagementCount = sections.noEngagement60?.count || 0;
  if (noEngagementCount > 0) {
    prompts.push('Which stale accounts have the highest revenue at risk?');
  }
  
  // Feature adoption prompt
  const activePI = data.activePI?.count || 0;
  const total = data.totalAccounts || 0;
  if (activePI < total * 0.5) {
    prompts.push('Find PRO accounts without Active PI');
  }
  
  // Pricing prompt
  prompts.push('Which accounts might benefit from the Stability Play?');
  
  return prompts.slice(0, 3);  // Max 3 prompts
}