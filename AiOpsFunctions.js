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