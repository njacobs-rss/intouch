/**
 * ==================================================================
 * GOOGLE APPS SCRIPT: DYNAMIC ACCOUNT NOTE GENERATOR (RULE ENGINE)
 * ARCHITECTURE: Thick Client (Optimized for 30k Rows)
 * DEPENDENCIES: 'NOTE_CONFIG' Sheet, 'STATCORE', 'DISTRO'
 * ==================================================================
 */

// --- GLOBAL CONFIGURATION ---
const SETUP_SHEET_NAME = 'SETUP';
const CONFIG_SHEET_NAME = 'NOTE_CONFIG';
const STAT_SHEET_NAME = 'STATCORE';
const DISTRO_SHEET_NAME = 'DISTRO';

// TARGET: Column I = 9
const TARGET_NOTE_COL_INDEX = 8; 

// List of sheets to process in SETUP tab
const SOURCE_SHEET_LIST_RANGE = 'C3:C23';

/**
 * 1. MAIN FUNCTION: UPDATE NOTES BATCH
 * Runs on all sheets listed in SETUP!C3:C23
 * @param {Spreadsheet} targetSS - Optional target spreadsheet (defaults to active)
 */
function updateAccountNotes(targetSS) {
  console.time('Total Execution Time');
  const ss = targetSS || SpreadsheetApp.getActiveSpreadsheet();

  console.log("--- 🟢 STEP 1: INITIALIZATION ---");
  
  // Notify User via Toast
  ss.toast("🔄 Loading Rule Engine (Sticky Notes Mode)...", "Notes Started", -1);

  // --- PRE-FETCH DATA (OPTIMIZED) ---
  const statData = getSheetDataMapFuzzySafe(ss, STAT_SHEET_NAME, 2);
  const distroData = getSheetDataMapFuzzySafe(ss, DISTRO_SHEET_NAME, 1);
  const parentAccountCounts = getParentAccountCounts(ss, STAT_SHEET_NAME);

  console.log(`> Data Stats:`);
  console.log(`  - STATCORE: ${Object.keys(statData).length} RIDs loaded.`);
  console.log(`  - DISTRO:   ${Object.keys(distroData).length} RIDs loaded.`);

  // --- FETCH CONFIGURATION RULES ---
  const configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  if (!configSheet) {
    const errorMsg = `Missing Sheet: "${CONFIG_SHEET_NAME}". Execution aborted.`;
    console.error(errorMsg);
    ss.toast("❌ Missing NOTE_CONFIG tab", "Error");
    return;
  }
  
  const lastConfigRow = configSheet.getLastRow();
  const rawRules = configSheet.getRange(2, 1, lastConfigRow - 1, 4).getValues();
  // Filter out empty rows/ghost checkboxes
  const configRules = rawRules.filter(row => row[0] !== "" && row[0] !== null);

  console.log(`> Loaded ${configRules.length} valid rules.`);

  // --- FETCH TARGET SHEETS ---
  const setupSheet = ss.getSheetByName(SETUP_SHEET_NAME);
  // Flatten and filter to ensure we have a clean list of names
  const targetSheetNames = setupSheet.getRange(SOURCE_SHEET_LIST_RANGE)
    .getValues().flat().filter(name => name && String(name).trim() !== "");

  if (targetSheetNames.length === 0) {
    console.warn("⚠️ No target sheets found in SETUP range " + SOURCE_SHEET_LIST_RANGE);
    ss.toast("⚠️ No AM Tabs listed in SETUP", "Warning");
    return;
  }

  // --- EXECUTE ---
  console.log("--- 🟠 STEP 2: PROCESSING SHEETS ---");
  let totalNotesUpdated = 0;
  let totalRowsScanned = 0;
  let tabsProcessed = 0;

  targetSheetNames.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      console.log(`>> 📂 Processing: "${sheetName}"`);
      tabsProcessed++;
      const result = processDynamicSheet(
        sheet, statData, distroData, parentAccountCounts, configRules, TARGET_NOTE_COL_INDEX
      );
      totalNotesUpdated += result.updated;
      totalRowsScanned += result.scanned;
      
      // CRITICAL FIX: Flush after every sheet to prevent "Service Timed Out"
      SpreadsheetApp.flush(); 
    } else {
      console.warn(`>> ⚠️ Sheet "${sheetName}" listed in SETUP but not found.`);
    }
  });

  console.log("--- 🏁 EXECUTION COMPLETE ---");
  console.timeEnd('Total Execution Time');

  // LOGGING PATTERN - Central logging
  const noteDetails = `Tabs: ${tabsProcessed} | Scanned: ${totalRowsScanned} | Updated: ${totalNotesUpdated}`;
  logRefreshToCentral('DYNAMIC_NOTES', noteDetails, 'N/A', 'Success', 'Rule Engine Completed');
  
  ss.toast(`Success! Updated ${totalNotesUpdated} sticky notes across fleet.`, "Complete", 5);
}

/**
 * 2. PREVIEW FUNCTION (VISUAL)
 * Shows exactly what the note will look like in F4
 */
function previewSingleNote() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  
  // Inputs
  const testRID = configSheet.getRange("F2").getValue();
  const outputCell = configSheet.getRange("F4"); 
  
  if (!testRID) {
    outputCell.setValue("⚠️ Enter RID in F2");
    return;
  }
  
  outputCell.setValue("⏳ Generating Note...");
  SpreadsheetApp.flush(); 

  // Load Data (Standard Loader is fine for single preview)
  const statData = getSheetDataMapFuzzySafe(ss, STAT_SHEET_NAME, 2); 
  const distroData = getSheetDataMapFuzzySafe(ss, DISTRO_SHEET_NAME, 1); 
  const parentCounts = getParentAccountCounts(ss, STAT_SHEET_NAME);

  const lookupID = testRID.toString().trim(); 

  if (!statData[lookupID]) {
    outputCell.setValue(`❌ RID "${lookupID}" NOT FOUND in STATCORE.`);
    return;
  }

  // Context
  const sData = statData[lookupID] || {};
  const dData = distroData[lookupID] || {};
  const pAccount = sData[cleanKey("Parent Account")];
  const activeRidsCount = pAccount ? (parentCounts[pAccount] || 1) : 0;
  const fullRowData = { ...dData, ...sData }; 
  fullRowData['activerids'] = activeRidsCount === 0 ? 1 : activeRidsCount; 

  // Rules
  const lastRow = configSheet.getLastRow();
  const rawRules = configSheet.getRange(2, 1, lastRow - 1, 4).getValues();
  const configRules = rawRules.filter(row => row[0] !== "" && row[0] !== null);

  // Generate
  try {
    const resultText = buildDynamicNote(fullRowData, configRules);
    
    if (resultText.trim() === "") {
       outputCell.setValue("(Result is blank. Check your 'Hide if Empty' logic)");
    } else {
       outputCell.setValue(resultText);
       // Also set note to verify format
       outputCell.setNote(resultText); 
    }
  } catch (e) {
    outputCell.setValue("ERROR generating note:\n" + e.message);
  }
}

/**
 * 3. SHEET PROCESSOR
 * Loops through rows in a target sheet and applies notes.
 * UPDATED: PRESERVES CELL CONTENT (Only updates sticky notes)
 */
function processDynamicSheet(sheet, statMap, distroMap, parentCounts, configRules, noteColIndex) {
  const lastRow = sheet.getLastRow();
  const DATA_START_ROW = 3; // Headers on Row 2, Data starts Row 3
  
  if (lastRow < DATA_START_ROW) return { scanned: 0, updated: 0 };

  // IMPORTANT: Assumes RIDs are in Column C (Index 3)
  const rids = sheet.getRange(DATA_START_ROW, 3, lastRow - (DATA_START_ROW - 1), 1).getValues();
  const notesOutput = [];
  
  let updateCount = 0;

  for (let i = 0; i < rids.length; i++) {
    const rawRid = rids[i][0];
    let noteText = null; // Default to null (removes note if no rule matches)

    if (rawRid) {
      const lookupID = rawRid.toString().trim(); // Handle whitespace/type mismatch
      
      // DEBUG: Log first 3 rows to verify matching
      if (i < 3) console.log(`   [Row ${i+DATA_START_ROW}] Looking for RID: '${lookupID}' -> Match? ${!!statMap[lookupID]}`);

      if (statMap[lookupID]) {
        const sData = statMap[lookupID] || {};
        const dData = distroMap[lookupID] || {};
        
        const pAccount = sData[cleanKey("Parent Account")];
        const activeRidsCount = pAccount ? (parentCounts[pAccount] || 1) : 0;

        const fullRowData = { ...dData, ...sData }; 
        fullRowData['activerids'] = activeRidsCount === 0 ? 1 : activeRidsCount; 

        noteText = buildDynamicNote(fullRowData, configRules);
        if (noteText === "") noteText = null; // Ensure empty string clears the note
      }
    }

    notesOutput.push([noteText]);
  }

  // Batch Write Notes
  if (notesOutput.length > 0) {
    const range = sheet.getRange(DATA_START_ROW, noteColIndex, notesOutput.length, 1);
    
    // 🟢 SAFE: Only update the Note layer. Cell values and formatting are untouched.
    range.setNotes(notesOutput);
    
    updateCount = notesOutput.length;
  }

  return { scanned: rids.length, updated: updateCount };
}

/**
 * 4. THE NOTE BUILDER ENGINE
 */
function buildDynamicNote(data, rules) {
  const finalLines = [];
  let currentLineBuffer = ""; 

  rules.forEach((rule, index) => {
    const expression = rule[0]; 
    const formatType = rule[1]; 
    const template = rule[2];   
    const isLineBreak = rule[3]; 

    // Handle Separator
    if (formatType && formatType.toString().toLowerCase() === 'separator') {
      if (currentLineBuffer) finalLines.push(currentLineBuffer); 
      currentLineBuffer = "";
      finalLines.push(template || "-------------------------");
      return;
    }

    // --- EVALUATE VALUE ---
    let rawValue = null;
    try {
      if (expression && expression.toString().includes('{')) {
        rawValue = evaluateMath(expression, data);
      } else {
        const key = cleanKey(expression);
        rawValue = (key === 'activerids') ? data['activerids'] : data[key];
      }
    } catch (e) { rawValue = null; }

    // --- HIDE IF BLANK LOGIC ---
    if (rawValue === null || rawValue === "" || rawValue === undefined) {
      if ((isLineBreak === true || isLineBreak === "true") && currentLineBuffer !== "") {
        finalLines.push(currentLineBuffer);
        currentLineBuffer = "";
      }
      return; 
    }

    // --- FORMATTING ---
    let displayValue = rawValue;
    const fmt = formatType ? formatType.toString().toLowerCase() : "";

    if (fmt === 'number') {
      displayValue = (Math.round(Number(rawValue) * 10) / 10).toString();
    } 
    else if (fmt === 'percent') {
      if (!isFinite(rawValue)) displayValue = "0%";
      else displayValue = Math.round(Number(rawValue) * 100) + "%";
    }
    else if (fmt === 'date') {
      if (Object.prototype.toString.call(rawValue) === '[object Date]') {
         displayValue = Utilities.formatDate(rawValue, Session.getScriptTimeZone(), "MM/dd/yy");
      }
    }

    // --- APPLY TEMPLATE ---
    let segment = template ? template.replace('{{val}}', displayValue) : displayValue;
    currentLineBuffer += segment;

    // --- CHECKBOX LOGIC ---
    if (isLineBreak === true || isLineBreak === "true") {
       finalLines.push(currentLineBuffer);
       currentLineBuffer = ""; 
    }
  });

  if (currentLineBuffer) finalLines.push(currentLineBuffer);

  return finalLines.join("\n");
}

/**
 * 5. MATH PARSER
 */
function evaluateMath(expression, data) {
  const parsedExpr = expression.replace(/\{([^}]+)\}/g, (match, key) => {
    let lookup = cleanKey(key);
    let val = (lookup === 'activerids') ? data['activerids'] : data[lookup];
    // Return 0 if missing/NaN so math doesn't break
    return (typeof val === 'number') ? val : 0; 
  });

  try {
    // Safe evaluation of simple math
    const result = new Function('return ' + parsedExpr)();
    if (!isFinite(result) || isNaN(result)) return null;
    return result;
  } catch (e) { return null; }
}

/**
 * 6. UTILITY: FUZZY DATA LOADER (SAFE VERSION)
 * Includes Micro-Sleep to prevent Service Timeout on 30k rows
 */
function getSheetDataMapFuzzySafe(ss, sheetName, headerRowIndex) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return {};

  Utilities.sleep(200); // 🟢 FIX: Prevent "Service Timed Out"

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= headerRowIndex) return {};
  
  const rawHeaders = sheet.getRange(headerRowIndex, 1, 1, lastCol).getValues()[0];
  const cleanHeaders = rawHeaders.map(h => cleanKey(h));

  const dataValues = sheet.getRange(headerRowIndex + 1, 1, lastRow - headerRowIndex, lastCol).getValues();
  SpreadsheetApp.flush(); // 🟢 FIX: Clear memory buffer

  const dataMap = {};
  
  dataValues.forEach(row => {
    const rid = row[0]; // Assumes RID is in Column A (Index 0)
    if (rid) {
      const rowObj = {};
      cleanHeaders.forEach((cleanHead, index) => {
        if(cleanHead) rowObj[cleanHead] = row[index];
      });
      // 🟢 FIX: Trim key to ensure matches
      dataMap[rid.toString().trim()] = rowObj;
    }
  });

  return dataMap;
}

/**
 * 7. UTILITY: PARENT ACCOUNT COUNTS
 */
function getParentAccountCounts(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if(!sheet) return {};
  // Assumes Parent Account is in Column F (Index 5)
  const data = sheet.getRange("F2:F").getValues().flat();
  const counts = {};
  data.forEach(val => { if (val) counts[val] = (counts[val] || 0) + 1; });
  return counts;
}

/**
 * 8. UTILITY: CLEAN KEY HELPER
 */
function cleanKey(str) {
  if (!str) return "";
  return str.toString().toLowerCase().replace(/[^a-z0-9]/g, ""); 
}