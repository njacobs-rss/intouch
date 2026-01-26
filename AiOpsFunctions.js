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

    // Distro Metrics
    if (dRow) {
      addNum(agg, 'sub', dRow[map.subfees]);
      addNum(agg, 'yld', dRow[map.yield]);
      addNum(agg, 'disco', dRow[map.disco]);
      addNum(agg, 'mom', dRow[map.mom]);
      addNum(agg, 'piShare', dRow[map.piShare]);
      addNum(agg, 'pos', dRow[map.pos]);

      if (map.xp > -1 && isTrue(dRow[map.xp])) agg.xp++;
      if (map.pi > -1 && isTrue(dRow[map.pi])) agg.pi++;
      
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
  const headers = sheet.getRange(config.headerRow, 1, 1, sheet.getLastColumn()).getValues()[0];
  const normalize = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  
  const keyIdx = headers.findIndex(h => normalize(h).includes(normalize(config.keyCol)));
  if (keyIdx === -1) return null;

  const data = sheet.getRange(config.headerRow + 1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  const row = data.find(r => String(r[keyIdx]).trim() == String(targetRid).trim());
  
  if (!row) return null;
  
  const result = {};
  config.extract.forEach(field => {
    const idx = headers.findIndex(h => normalize(h).includes(normalize(field)));
    if (idx > -1) {
        let val = row[idx];
        if (val instanceof Date) val = val.toDateString();
        result[field] = val;
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
 * DYNAMIC COLUMN MAPPING - Maps metrics to their available columns
 * Used by AI to offer column visualization (LEGACY - kept for compatibility)
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
  'Last Engaged Date': 'J', 'Current Term End Date': 'J', 'Focus20': 'J',
  'Customer Since': 'J', 'Contract Alerts': 'J',
  
  // Columns M-O - Account + Status Info
  'Status': 'M', 'System Status': 'M', 'System Type': 'M', 
  'No Bookings >30 Days': 'M', 'System of Record': 'M',
  
  // Columns P-R - System Stats
  'Active PI': 'P', 'Active XP': 'P', 'AutoTags Active - Last 30': 'P',
  'CHRM-CC Req Min': 'P', 'CHRM-Days in Advance': 'P', 'CHRM-Max Party': 'P',
  'Email Integration': 'P', 'Exclusive Pricing': 'P', 'HEALTH FLAGS - LM': 'P',
  'Instant Booking': 'P', 'Integrations Total': 'P', 'PartnerFeed EXCLUDED': 'P',
  'Payment Method': 'P', 'POS Type': 'P', 'Previous AM': 'P', 'Private Dining': 'P',
  'PRO-Last Sent': 'P', 'Rest. Quality': 'P', 'Shift w/MAX CAP': 'P',
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
 * Checks if the active sheet is an AM tab (has Smart Select column)
 * @returns {Object} {isAMTab: boolean, sheetName: string}
 */
function checkIfAMTab() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet();
    const sheetName = sheet.getName();
    
    // Check if Row 2 has "Smart Select" header
    const lastCol = Math.min(sheet.getLastColumn(), 30); // Check first 30 cols
    if (lastCol < 4) return { isAMTab: false, sheetName: sheetName };
    
    const headers = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
    const hasSmartSelect = headers.some(h => 
      String(h).toLowerCase().replace(/\s/g, '') === 'smartselect'
    );
    
    return { isAMTab: hasSmartSelect, sheetName: sheetName };
  } catch (e) {
    console.error('checkIfAMTab error:', e);
    return { isAMTab: false, sheetName: 'Unknown' };
  }
}

/**
 * Sets a dynamic column header value on the active AM sheet
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
 */
function columnLetterToIndex_(letters) {
  let result = 0;
  for (let i = 0; i < letters.length; i++) {
    result = result * 26 + (letters.toUpperCase().charCodeAt(i) - 64);
  }
  return result;
}

/**
 * System instruction encoding InTouch domain knowledge for the AI
 * This is the "brain" that makes the AI understand InTouch
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
- The frontend handles column rotation - you just specify the category and metric`;

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
  ]
};

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
  
  // 8. Check for "how to see/find/show" + known value patterns
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
  
  // 9. Check for direct metric lookups: "where is [metric]" or "show me [metric]"
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
  
  // No match - fall through to Gemini
  return null;
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
    
    // STEP 2: Fall through to Gemini for complex/novel questions
    console.log('[askInTouchGuide] No scripted match, calling Gemini API');
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
    
    // Add current user query
    contents.push({
      role: 'user',
      parts: [{ text: userQuery }]
    });
    
    const payload = {
      systemInstruction: {
        parts: [{ text: INTOUCH_SYSTEM_INSTRUCTION }]
      },
      contents: contents,
      generationConfig: {
        maxOutputTokens: 1024,
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
      durationMs: durationMs
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
// SECTION 6: KNOWLEDGE HUB - FEEDBACK SYSTEM
// =============================================================
// All feedback from sidebars and webapps goes to the master KH_Feedback sheet
// =============================================================

/**
 * Feedback logging sheet configuration
 */
const KH_FEEDBACK_CONFIG = {
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
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(KH_FEEDBACK_CONFIG.SHEET_NAME);
    
    // Create feedback sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(KH_FEEDBACK_CONFIG.SHEET_NAME);
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
    
    // Determine source based on spreadsheet name or default to Sidebar
    let source = 'Sidebar';
    try {
      const ssName = ss.getName();
      if (ssName) source = ssName.substring(0, 30); // Truncate long names
    } catch (e) {}
    
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
    
    console.log('KH Feedback logged: ' + feedback.rating + (feedback.correction ? ' + correction' : ''));
    
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
 * @returns {Array} Array of feedback entries needing review
 */
function getKHFeedbackForReview() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(KH_FEEDBACK_CONFIG.SHEET_NAME);
    
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