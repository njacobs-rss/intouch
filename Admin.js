// =============================================================
// FILE: Admin.gs (Final Optimized)
// PURPOSE: Internal logic (AM Tabs, Focus20 Tagging, Data Refresh)
// =============================================================

// =============================================================
// SECTION: ORCHESTRATION & AUTOMATION
// =============================================================

function runMasterPipeline() {
  const functionName = 'runMasterPipeline';
  const startTime = new Date();
  console.log(`[${functionName}] 🚀 Starting Nightly Master Pipeline...`);

  try {
    console.log(`[${functionName}] 1/2 Executing Data Pipeline (STATCORE)...`);
    updateSTATCORE(); 
    
    console.log(`[${functionName}] 2/2 Executing Notes Refresh...`);
    updateAccountNotes();

    // REMOVED: Step 3 Kicking Zombie Formulas (forcePortfolioRecalc)

    const duration = (new Date() - startTime) / 1000;
    console.log(`[${functionName}] ✅ Pipeline Complete in ${duration}s`);
    logRefreshStatus("MASTER_PIPELINE", duration, "Success");

  } catch (error) {
    console.error(`[${functionName}] 🔥 CRITICAL FAILURE:`, error);
    logRefreshStatus("MASTER_PIPELINE", 0, "Fail", error.message);
    throw error;
  }
}

function logRefreshStatus(processName, duration, result, errorMessage = "") {
  try {
    logRefreshToCentral(processName, 'ALL', duration, result, errorMessage);
  } catch (e) {
    console.error("Failed to write to Refresh log", e);
  }
}

function setupNightlyTrigger() {
  const functionName = 'runMasterPipeline';
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === functionName) ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger(functionName)
    .timeBased().everyDays(1).atHour(1).inTimezone(Session.getScriptTimeZone()).create();
  SpreadsheetApp.getActiveSpreadsheet().toast("✅ Nightly Trigger Set (1am-2am)", "System Admin");
}

// =============================================================
// SECTION: SHEET EVENT HANDLERS (OPTIMIZED - NO DEDUPE)
// =============================================================

function handleIntouchEdits(e) {
  if (!e || !e.range) return; // Fast fail

  var sheet = e.source.getActiveSheet();
  var range = e.range;
  var row = range.getRow();
  var col = range.getColumn();
  
  // 1. BATCH TIMESTAMPING (Only updates Date, doesn't scan for duplicates)
  if (col === 2 && row > 1) {
    var lastUpdatedColumn = getColumnIndexByName(sheet, 'Last Updated');
    if (lastUpdatedColumn) {
      var values = range.getValues();
      var timestampUpdates = values.map(r => [r[0] !== '' ? new Date() : null]);
      sheet.getRange(row, lastUpdatedColumn, values.length, 1).setValues(timestampUpdates);
    }
  }

  // 2. "DEFAULT" SETS LOGIC
  if (range.getA1Notation() === 'F1' && range.getValue() === 'Default') {
    var setsSheet = e.source.getSheetByName('Sets');
    if (setsSheet) {
      var setsData = setsSheet.getDataRange().getValues();
      var defaultRow = setsData.findIndex(r => r[0] === 'Default');
      if (defaultRow > -1) {
        var sourceVals = setsSheet.getRange(defaultRow + 1, 8, 1, 20).getValues();
        sheet.getRange(2, 8, 1, 20).setValues(sourceVals);
      }
    }
  }

  // 3. "SMART SELECT" LOGIC (Focus 20)
  var smartSelectColumnIndex = getColumnIndexByName(sheet, 'Smart Select');
  if (smartSelectColumnIndex && col === smartSelectColumnIndex) {
     var values = range.getValues();
     // Only trigger if at least one 'TRUE' exists
     if (values.some(r => r[0] === true || String(r[0]).toUpperCase() === 'TRUE')) {
       moveTrueAccountsToFocus20();
     }
  }
}

// =============================================================
// SECTION: AM TAB MANAGEMENT
// =============================================================

function createSingleEmployeeTab() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var setupSheet = ss.getSheetByName("Setup");
  var launcherSheet = ss.getSheetByName("Launcher");

  if (!setupSheet || !launcherSheet) throw new Error('Missing Setup or Launcher sheet');

  var employeeName = setupSheet.getRange("F2").getValue().trim();
  if (employeeName === "") return ui.alert('Error: No employee name found in SETUP!F2.');

  var firstName = employeeName.split(' ')[0];
  var uniqueName = getUniqueSheetName(ss, firstName);
  var sheetCopy = launcherSheet.copyTo(ss).setName(uniqueName);

  sheetCopy.getRange("B2").setValue(employeeName);
  ss.setActiveSheet(sheetCopy);
  ss.moveActiveSheet(1);

  var targetRange = setupSheet.getRange("B3:B22");
  var values = targetRange.getValues();
  var added = false;
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === "") {
      targetRange.getCell(i + 1, 1).setValue(employeeName);
      added = true;
      break;
    }
  }

  if (!added) return ui.alert('Error: No available row in SETUP!B3:B22.');
  setupSheet.getRange("F2").clearContent();
  ss.toast("Tab created. Updating notes & running refresh pipeline...", "Success");
  
  manualUpdateNotesOnly();
  runMasterPipeline();
  // REMOVED: forcePortfolioRecalc();
}

/**
 * Creates employee tabs based on names in SETUP!B3:B
 * @param {Spreadsheet} targetSS - Optional target spreadsheet (defaults to active)
 */
function createEmployeeTabs(targetSS) {
  var ss = targetSS || SpreadsheetApp.getActiveSpreadsheet();
  var isActiveSpreadsheet = !targetSS; // Only do UI ops if running on active spreadsheet
  
  // GLOBAL MODE: First deploy fresh Launcher from master to target
  if (!isActiveSpreadsheet) {
    var masterSS = SpreadsheetApp.getActiveSpreadsheet();
    deploySheetToTarget_(masterSS, ss, "Launcher", false); // false = don't hide
  }
  
  var setupSheet = ss.getSheetByName("Setup");
  var launcherSheet = ss.getSheetByName("Launcher");
  if (!setupSheet || !launcherSheet) throw new Error('Missing Setup or Launcher sheet');

  var employeeNames = setupSheet.getRange("B3:B" + setupSheet.getLastRow()).getValues()
    .map(r => r[0].trim()).filter(name => name && name !== "Manager Lens"); 

  var firstNames = employeeNames.map(n => n.split(' ')[0]);
  ss.getSheets().forEach(s => { if (firstNames.includes(s.getName())) ss.deleteSheet(s); });

  firstNames.forEach((name, i) => {
    var copy = launcherSheet.copyTo(ss).setName(getUniqueSheetName(ss, name));
    copy.getRange("B2").setValue(employeeNames[i]);
    if (isActiveSpreadsheet) {
      ss.setActiveSheet(copy);
      ss.moveActiveSheet(1);
    }
  });

  if (isActiveSpreadsheet) {
    ss.setActiveSheet(setupSheet);
  }
  
  // Call updateAccountNotes with targetSS for fleet compatibility
  updateAccountNotes(ss);
  // REMOVED: forcePortfolioRecalc(); 
  
  return "Tabs created successfully.";
}

/**
 * HELPER: Deploys a sheet from source to target spreadsheet (safe update)
 * Uses rename-and-replace strategy to preserve formula references
 * @param {Spreadsheet} sourceSS - Source spreadsheet with the template
 * @param {Spreadsheet} targetSS - Target spreadsheet to update
 * @param {string} sheetName - Name of the sheet to deploy
 * @param {boolean} hideSheet - Whether to hide the sheet after deployment
 */
function deploySheetToTarget_(sourceSS, targetSS, sheetName, hideSheet) {
  var sourceTemplate = sourceSS.getSheetByName(sheetName);
  if (!sourceTemplate) {
    throw new Error("Source sheet '" + sheetName + "' not found in master spreadsheet.");
  }

  var sourceProtections = sourceTemplate.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  var oldSheet = targetSS.getSheetByName(sheetName);

  if (oldSheet) {
    // 1. Rename old sheet to preserve formula references temporarily
    var tempName = sheetName + "_OLD_" + new Date().getTime();
    oldSheet.setName(tempName);

    // 2. Copy new sheet in
    var newSheet = sourceTemplate.copyTo(targetSS).setName(sheetName);

    // 3. Handle Visibility
    if (hideSheet === true) {
      newSheet.hideSheet();
    } else {
      newSheet.showSheet();
    }

    // 4. Restore Protections
    for (var i = 0; i < sourceProtections.length; i++) {
      var p = sourceProtections[i];
      newSheet.getRange(p.getRange().getA1Notation()).protect().setDescription(p.getDescription());
    }

    // 5. Update formulas to point to the new sheet name
    targetSS.createTextFinder(tempName).matchFormulaText(true).replaceAllWith(sheetName);

    // 6. Delete the old sheet
    targetSS.deleteSheet(oldSheet);
  } else {
    // Sheet doesn't exist in target - just copy it fresh
    var newSheet = sourceTemplate.copyTo(targetSS).setName(sheetName);
    if (hideSheet === true) {
      newSheet.hideSheet();
    }
    for (var i = 0; i < sourceProtections.length; i++) {
      var p = sourceProtections[i];
      newSheet.getRange(p.getRange().getA1Notation()).protect().setDescription(p.getDescription());
    }
  }
}

function deleteEmployeeTabs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var names = ss.getSheetByName("Setup").getRange("B3:B").getValues()
    .map(r => r[0].trim()).filter(name => name && name !== "Manager Lens"); 

  var firstNames = names.map(n => n.split(' ')[0]);
  ss.getSheets().forEach(s => { if (firstNames.includes(s.getName())) ss.deleteSheet(s); });
  return "Employee tabs deleted.";
}

// =============================================================
// SECTION: FOCUS 20 LOGIC (STATCORE TAGGING)
// =============================================================

// --- WRAPPER FUNCTIONS (Required for Menu & Triggers) ---
function moveTrueAccountsToFocus20() { tagFocus20Status(true); }
function removeTrueAccountsFromFocus20Optimized() { tagFocus20Status(false); }

/**
 * CORE ENGINE: Reads RIDs from Active Sheet (Smart Select), 
 * finds them in STATCORE, and updates the 'Focus20' column.
 * * @param {boolean} isAdding - true = Add Date; false = Clear Cell
 */
function tagFocus20Status(isAdding) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getActiveSheet();
  const targetSheet = ss.getSheetByName("STATCORE");
  
  // --- VALIDATION ---
  if (!targetSheet) {
    ss.toast("CRITICAL: 'STATCORE' sheet not found.", "System Error", 10);
    return;
  }
  if (sourceSheet.getName() === "STATCORE") {
    ss.toast("Please select accounts from a working tab, not STATCORE.", "Usage Error", 5);
    return;
  }

  // --- MAP COLUMNS ---
  const srcHeaderRow = 2;
  const srcSmartIdx = getColumnIndexByName(sourceSheet, 'Smart Select');
  const srcRidIdx = getColumnIndexByName(sourceSheet, 'RID') || 3; 

  if (!srcSmartIdx) {
    ss.toast("Column 'Smart Select' not found in Row 2.", "Config Error", 5);
    return;
  }

  const tgtHeaderRow = 2;
  const tgtRidIdx = getColumnIndexByName(targetSheet, 'RID') || 1; 
  const tgtFocusIdx = getColumnIndexByName(targetSheet, 'Focus20');
  
  if (!tgtFocusIdx) {
    ss.toast("Column 'Focus20' not found in STATCORE Row 2.", "Config Error", 10);
    return;
  }

  // --- STEP 1: READ SOURCE ---
  const srcLastRow = sourceSheet.getLastRow();
  if (srcLastRow <= srcHeaderRow) {
    ss.toast("Sheet is empty.", "System", 3);
    return;
  }

  const srcData = sourceSheet.getRange(srcHeaderRow + 1, 1, srcLastRow - srcHeaderRow, sourceSheet.getLastColumn()).getValues();
  const ridsToProcess = new Set();
  const rowsToUncheck = []; 

  srcData.forEach((row, i) => {
    const isSelected = row[srcSmartIdx - 1]; 
    const rid = row[srcRidIdx - 1];
    // Check for boolean TRUE or string "TRUE"
    if ((isSelected === true || String(isSelected).toUpperCase() === 'TRUE') && rid) {
      ridsToProcess.add(String(rid));
      rowsToUncheck.push(srcHeaderRow + 1 + i);
    }
  });

  if (ridsToProcess.size === 0) {
    ss.toast("No accounts selected. Check the 'Smart Select' box.", "Focus 20", 3);
    return;
  }

  // --- STEP 2: UPDATE STATCORE ---
  const tgtLastRow = targetSheet.getLastRow();
  const tgtRids = targetSheet.getRange(tgtHeaderRow + 1, tgtRidIdx, tgtLastRow - tgtHeaderRow, 1).getValues().flat().map(String);
  const focusRange = targetSheet.getRange(tgtHeaderRow + 1, tgtFocusIdx, tgtLastRow - tgtHeaderRow, 1);
  const focusValues = focusRange.getValues();
  
  let matchCount = 0;
  const valueToWrite = isAdding ? new Date() : ""; 

  tgtRids.forEach((rid, i) => {
    if (ridsToProcess.has(rid)) {
      focusValues[i][0] = valueToWrite;
      matchCount++;
    }
  });

  // --- STEP 3: WRITE & TOAST ---
  if (matchCount > 0) {
    focusRange.setValues(focusValues);
    rowsToUncheck.forEach(r => sourceSheet.getRange(r, srcSmartIdx).setValue(false));
    
    const verb = isAdding ? "Tagged" : "Removed";
    // SUCCESS TOAST
    ss.toast(`${verb} ${matchCount} accounts in STATCORE.`, "Success", 4);
  } else {
    // WARNING TOAST
    ss.toast("None of the selected RIDs were found in STATCORE.", "Warning", 5);
  }
}

// =============================================================
// SECTION: MANUAL TRIGGERS & UTILS
// =============================================================

function confirmUpdateTotalChain() {
  var ui = SpreadsheetApp.getUi();
  if (ui.alert('TOTAL SYSTEM REFRESH', 'Refresh Everything? (Data + Notes)', ui.ButtonSet.YES_NO) == ui.Button.YES) {
    SpreadsheetApp.getActiveSpreadsheet().toast("Initializing Pipeline...", "System");
    runMasterPipeline();
  }
}

function manualUpdateNotesOnly() {
  try { 
    SpreadsheetApp.getActiveSpreadsheet().toast("Updating Notes...", "Status"); 
    updateAccountNotes(); 
  } catch (e) { throw new Error("Error updating notes: " + e.message); }
}

function resetAndReapplyFilters() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var dataRange = sheet.getDataRange();
  var lastRow = dataRange.getLastRow();
  if (dataRange.getFilter()) { dataRange.getFilter().remove(); }
  var filterRange = sheet.getRange(2, 1, lastRow - 1, dataRange.getLastColumn());
  filterRange.createFilter();
  // Clear Smart Select column (Column D) - data starts at row 3
  if (lastRow >= 3) {
    sheet.getRange(3, 4, lastRow - 2, 1).setValue(false);
  }
}

function getUniqueSheetName(ss, baseName) {
  var name = baseName, idx = 1;
  while (ss.getSheetByName(name)) { name = baseName + " (" + idx++ + ")"; }
  return name;
}

function getColumnIndexByName(sheet, columnName) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return null;
  var headers = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
  var index = headers.indexOf(columnName);
  return index > -1 ? index + 1 : null;
}

// REMOVED: forcePortfolioRecalc() function completely per request