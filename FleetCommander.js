// =============================================================
// FILE: FleetCommander.gs
// PURPOSE: External file management (Copy, Update, Delete)
// ARCHITECTURE: Thick Client (Local Execution)
// =============================================================

// --- SECURITY GUARDRAIL ---
function assertAdminAccess() {
  // List authorized emails here (lowercase)
  var AUTHORIZED_USERS = [
    'njacobs@opentable.com' 
    // 'backup.admin@opentable.com' // Add others here if needed
  ];
  
  var currentUser = Session.getActiveUser().getEmail().toLowerCase();
  
  if (!AUTHORIZED_USERS.includes(currentUser)) {
    throw new Error("⛔ ACCESS DENIED: User '" + currentUser + "' is not authorized to run Fleet Commands.");
  }
}

// CONFIGURATION
var TARGET_FOLDER_ID = '1oqbXf4CPouogLMvlB5rzZipOwiGZyRwE'; 
var TARGET_PHRASE = 'iQ'; 

/**
 * UI TRIGGER: Open the Admin Sidebar
 */
function showSidebar() {
  var html = HtmlService.createTemplateFromFile('AdminSidebar')
    .evaluate()
    .setTitle('Fleet Commander')
    .setWidth(400); 
  SpreadsheetApp.getUi().showSidebar(html);
}

// --- HELPER FOR SIDEBAR ---
function getFilteredSheetNames() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var allSheets = ss.getSheets().map(s => s.getName());
  var setupSheet = ss.getSheetByName('Setup');
  
  // Default exclusions (Safety Net)
  var excludedNames = ['Setup', 'STATCORE', 'DISTRO', 'AdminSidebar', 'BI_Sidebar'];
  
  // Whitelist: These sheets should ALWAYS appear in dropdown, even if found in Setup columns
  var whitelistedNames = ['Manager Lens'];

  if (setupSheet && setupSheet.getLastRow() > 2) {
    // Reads Columns A (1), B (2), and C (3) to catch ALL exclusion lists
    // This covers System Lists (often Col A) and Employee Lists (Col B)
    var data = setupSheet.getRange(3, 1, setupSheet.getLastRow() - 2, 3).getValues();
    
    var sheetExclusions = data.flat()
      .map(n => n ? n.toString().trim() : '')
      .filter(n => n !== ''); // Remove empty cells
      
    excludedNames = excludedNames.concat(sheetExclusions);
  }

  // Return sheets that are NOT in the exclusion list, OR are whitelisted
  return allSheets.filter(function(sheetName) {
    var trimmedName = sheetName.trim();
    return whitelistedNames.includes(trimmedName) || !excludedNames.includes(trimmedName);
  });
}

// --- BATCH OPERATIONS ---

/**
 * SAFE UPDATE: Replaces a specific sheet in all fleet files
 * Preserves formulas by using a rename-and-replace strategy
 */
function runUpdateSheetSafe(sheetName, hideSheet) {
  assertAdminAccess(); // Global function - requires admin
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast("Scanning fleet files for '" + sheetName + "'...", "🚀 Safe Update Started", -1);

  var sourceTemplate = ss.getSheetByName(sheetName);
  var sourceFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  var files = sourceFolder.getFiles();
  var logs = [];

  if (!sourceTemplate) {
    throw new Error("Source sheet '" + sheetName + "' not found in this spreadsheet.");
  }

  var sourceProtections = sourceTemplate.getProtections(SpreadsheetApp.ProtectionType.RANGE);

  while (files.hasNext()) {
    var file = files.next();
    
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS && 
        file.getId() !== ss.getId() && 
        file.getName().includes(TARGET_PHRASE)) {
      
      try {
        var targetSS = SpreadsheetApp.openById(file.getId());
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

          // 5. Update formulas in the whole spreadsheet to point to the new sheet name 
          // (Redundant but safe if any formulas latched onto the _OLD name)
          targetSS.createTextFinder(tempName).matchFormulaText(true).replaceAllWith(sheetName);
          
          // 6. Delete the old sheet
          targetSS.deleteSheet(oldSheet);
          
          logs.push({ status: 'Success', file: file.getName(), msg: 'Updated & Reconnected' });
        } else {
           logs.push({ status: 'Skipped', file: file.getName(), msg: 'Sheet not found in target' });
        }
      } catch (e) {
        logs.push({ status: 'Error', file: file.getName(), msg: e.toString() });
      }
    }
  }
  
  ss.toast("Update Complete. check logs.", "✅ Done", 5);
  return logs;
}

/**
 * COPY NEW: Pushes a new sheet to all fleet files
 */
function runCopySheet(sourceSheetName, newSheetName, hideSheet) {
  assertAdminAccess(); // Global function - requires admin
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sourceSheet = ss.getSheetByName(sourceSheetName);
  var sourceFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  var files = sourceFolder.getFiles();
  var logs = [];
  var protections = sourceSheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);

  while (files.hasNext()) {
    var file = files.next();
    
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS && 
        file.getId() !== ss.getId() && 
        file.getName().includes(TARGET_PHRASE)) {
      
      try {
        var targetSS = SpreadsheetApp.openById(file.getId());
        if (targetSS.getSheetByName(newSheetName)) {
           logs.push({ status: 'Skipped', file: file.getName(), msg: 'Sheet already exists' });
           continue;
        }
        var newSheet = sourceSheet.copyTo(targetSS).setName(newSheetName);

        if (hideSheet === true) {
          newSheet.hideSheet();
        } else {
          newSheet.showSheet();
        }

        for (var i = 0; i < protections.length; i++) {
            var p = protections[i];
            newSheet.getRange(p.getRange().getA1Notation()).protect().setDescription(p.getDescription());
        }
        logs.push({ status: 'Success', file: file.getName(), msg: 'Sheet Copied' });
      } catch (e) {
        logs.push({ status: 'Error', file: file.getName(), msg: e.toString() });
      }
    }
  }
  return logs;
}

/**
 * DELETE: Removes a sheet from all fleet files
 */
function runDeleteSheet(sheetToDelete) {
  assertAdminAccess(); // Global function - requires admin
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sourceFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  var files = sourceFolder.getFiles();
  var logs = [];

  while (files.hasNext()) {
    var file = files.next();
    
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS && 
        file.getName().includes(TARGET_PHRASE)) {
      
      try {
        var targetSS = SpreadsheetApp.openById(file.getId());
        var sheet = targetSS.getSheetByName(sheetToDelete);
        if (sheet) {
          targetSS.deleteSheet(sheet);
          logs.push({ status: 'Success', file: file.getName(), msg: 'Deleted ' + sheetToDelete });
        } else {
          logs.push({ status: 'Skipped', file: file.getName(), msg: 'Sheet not found' });
        }
      } catch (e) {
        logs.push({ status: 'Error', file: file.getName(), msg: e.toString() });
      }
    }
  }
  return logs;
}

/**
 * CONFIG UPDATE: Updates Template IDs in SETUP tab
 */
function runUpdateSheet() {
  assertAdminAccess(); // Global function - requires admin
  var TEMPLATE_FOLDER_ID = '1lt4n-LZe8ufMqCkNSU-tGRs4DysEKySs'; 
  var logs = [];
  try {
    const TEMPLATE_FOLDER = DriveApp.getFolderById(TEMPLATE_FOLDER_ID);
    const TARGET_FOLDER = DriveApp.getFolderById(TARGET_FOLDER_ID);
    let SHEETS_TEMPLATE_ID, SLIDES_TEMPLATE_ID;
    
    const templateFiles = TEMPLATE_FOLDER.getFiles();
    while (templateFiles.hasNext()) {
      const file = templateFiles.next();
      if (file.getName() === "BI_Prod_Sheet") SHEETS_TEMPLATE_ID = file.getId();
      if (file.getName() === "BI_Prod_Slides") SLIDES_TEMPLATE_ID = file.getId();
    }
    
    const targetFiles = TARGET_FOLDER.getFiles();
    while (targetFiles.hasNext()) {
      const file = targetFiles.next();
      if (file.getMimeType() === MimeType.GOOGLE_SHEETS && 
          file.getName().includes(TARGET_PHRASE)) {
        try {
          const spreadsheet = SpreadsheetApp.openById(file.getId());
          const sheet = spreadsheet.getSheetByName('SETUP');
          if (sheet) {
            if (SLIDES_TEMPLATE_ID) sheet.getRange('G10').setValue(SLIDES_TEMPLATE_ID);
            if (SHEETS_TEMPLATE_ID) sheet.getRange('G11').setValue(SHEETS_TEMPLATE_ID);
            logs.push({ status: 'Success', file: file.getName(), msg: 'IDs Updated' });
          } else {
            logs.push({ status: 'Skipped', file: file.getName(), msg: 'SETUP sheet not found' });
          }
        } catch (e) {
          logs.push({ status: 'Error', file: file.getName(), msg: e.message });
        }
      }
    }
  } catch (e) {
    logs.push({ status: 'Error', file: 'Config Process', msg: e.message });
  }
  return logs;
}

/**
 * FLEET DATA REFRESH: Full Pipeline - STATCORE → SYSCORE → DAGCORE
 * Iterates through all fleet files and runs the complete data pipeline
 * @param {boolean} updateNotes - If true, also runs updateAccountNotes() after data refresh
 */
function runUpdateSTATCORE(updateNotes) {
  assertAdminAccess();
  var logs = [];
  var sourceFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  var files = sourceFolder.getFiles();
  var processedCount = 0;
  var startTime = new Date();
  
  while (files.hasNext()) {
    var file = files.next();
    
    // Check for timeout risk (5 min safety margin from 6 min limit)
    if ((new Date() - startTime) / 1000 > 300) {
      logs.push({ status: 'Warning', file: 'SYSTEM', msg: 'Timeout risk - stopped at ' + processedCount + ' files. Run again to continue.' });
      break;
    }
    
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS && 
        file.getName().includes(TARGET_PHRASE)) {
      
      try {
        var targetSS = SpreadsheetApp.openById(file.getId());
        
        // Run full pipeline with skipChain=false (let it chain naturally)
        var result = updateSTATCORE(targetSS, false);
        
        // Optionally update notes
        if (updateNotes === true) {
          updateAccountNotes(targetSS);
        }
        
        var msg = result.result === 'Success' 
          ? 'Full Pipeline: ' + result.records + ' records' + (updateNotes ? ' + Notes' : '')
          : result.error;
        
        logs.push({ status: result.result, file: file.getName(), msg: msg });
        processedCount++;
        
        Utilities.sleep(500); // Breathing room between files
        
      } catch (e) {
        logs.push({ status: 'Error', file: file.getName(), msg: e.toString() });
      }
    }
  }
  
  if (logs.length === 0) {
    logs.push({ status: 'Warning', file: 'SYSTEM', msg: 'No fleet files found matching criteria' });
  }
  
  return logs;
}

/**
 * FLEET DATA REFRESH: SYSCORE + DAGCORE (skips base STATCORE)
 * Iterates through all fleet files
 * @param {boolean} updateNotes - If true, also runs updateAccountNotes() after data refresh
 */
function runUpdateSYSCOREWithDAGCORE(updateNotes) {
  assertAdminAccess();
  var logs = [];
  var sourceFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  var files = sourceFolder.getFiles();
  var processedCount = 0;
  var startTime = new Date();
  
  while (files.hasNext()) {
    var file = files.next();
    
    if ((new Date() - startTime) / 1000 > 300) {
      logs.push({ status: 'Warning', file: 'SYSTEM', msg: 'Timeout risk - stopped at ' + processedCount + ' files. Run again to continue.' });
      break;
    }
    
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS && 
        file.getName().includes(TARGET_PHRASE)) {
      
      try {
        var targetSS = SpreadsheetApp.openById(file.getId());
        
        // Run SYSCORE (will chain to DAGCORE)
        var result = runSYSCOREUpdates(false, targetSS);
        
        if (updateNotes === true) {
          updateAccountNotes(targetSS);
        }
        
        var msg = result.result === 'Success' 
          ? 'SYSCORE+DAGCORE: ' + result.records + ' matched' + (updateNotes ? ' + Notes' : '')
          : result.error;
        
        logs.push({ status: result.result, file: file.getName(), msg: msg });
        processedCount++;
        
        Utilities.sleep(500);
        
      } catch (e) {
        logs.push({ status: 'Error', file: file.getName(), msg: e.toString() });
      }
    }
  }
  
  if (logs.length === 0) {
    logs.push({ status: 'Warning', file: 'SYSTEM', msg: 'No fleet files found matching criteria' });
  }
  
  return logs;
}

/**
 * FLEET DATA REFRESH: SYSCORE Only (skips DAGCORE)
 * Iterates through all fleet files
 * @param {boolean} updateNotes - If true, also runs updateAccountNotes() after data refresh
 */
function runUpdateSYSCOREOnly(updateNotes) {
  assertAdminAccess();
  var logs = [];
  var sourceFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  var files = sourceFolder.getFiles();
  var processedCount = 0;
  var startTime = new Date();
  
  while (files.hasNext()) {
    var file = files.next();
    
    if ((new Date() - startTime) / 1000 > 300) {
      logs.push({ status: 'Warning', file: 'SYSTEM', msg: 'Timeout risk - stopped at ' + processedCount + ' files. Run again to continue.' });
      break;
    }
    
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS && 
        file.getName().includes(TARGET_PHRASE)) {
      
      try {
        var targetSS = SpreadsheetApp.openById(file.getId());
        
        // Run SYSCORE with skipDagcore=true
        var result = runSYSCOREUpdates(true, targetSS);
        
        if (updateNotes === true) {
          updateAccountNotes(targetSS);
        }
        
        var msg = result.result === 'Success' 
          ? 'SYSCORE Only: ' + result.records + ' matched' + (updateNotes ? ' + Notes' : '')
          : result.error;
        
        logs.push({ status: result.result, file: file.getName(), msg: msg });
        processedCount++;
        
        Utilities.sleep(500);
        
      } catch (e) {
        logs.push({ status: 'Error', file: file.getName(), msg: e.toString() });
      }
    }
  }
  
  if (logs.length === 0) {
    logs.push({ status: 'Warning', file: 'SYSTEM', msg: 'No fleet files found matching criteria' });
  }
  
  return logs;
}

/**
 * FLEET DATA REFRESH: DAGCORE Only - Refreshes DISTRO sheet
 * Iterates through all fleet files (fastest option)
 * @param {boolean} updateNotes - If true, also runs updateAccountNotes() after data refresh
 */
function runUpdateDAGCOREOnly(updateNotes) {
  assertAdminAccess();
  var logs = [];
  var sourceFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  var files = sourceFolder.getFiles();
  var processedCount = 0;
  var startTime = new Date();
  
  while (files.hasNext()) {
    var file = files.next();
    
    if ((new Date() - startTime) / 1000 > 300) {
      logs.push({ status: 'Warning', file: 'SYSTEM', msg: 'Timeout risk - stopped at ' + processedCount + ' files. Run again to continue.' });
      break;
    }
    
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS && 
        file.getName().includes(TARGET_PHRASE)) {
      
      try {
        var targetSS = SpreadsheetApp.openById(file.getId());
        
        // Run DAGCORE only
        var result = runDAGCOREUpdates(targetSS);
        
        if (updateNotes === true) {
          updateAccountNotes(targetSS);
        }
        
        var msg = result.result === 'Success' 
          ? 'DAGCORE: ' + result.records + ' records' + (updateNotes ? ' + Notes' : '')
          : result.error;
        
        logs.push({ status: result.result, file: file.getName(), msg: msg });
        processedCount++;
        
        Utilities.sleep(500);
        
      } catch (e) {
        logs.push({ status: 'Error', file: file.getName(), msg: e.toString() });
      }
    }
  }
  
  if (logs.length === 0) {
    logs.push({ status: 'Warning', file: 'SYSTEM', msg: 'No fleet files found matching criteria' });
  }
  
  return logs;
}

/**
 * REFRESH EMPLOYEE TABS: Recreates AM tabs in all fleet files
 * Reads employee names from Setup sheet, deletes old tabs, creates fresh ones from Launcher
 */
function runCreateEmployeeTabs() {
  assertAdminAccess(); // Global function - requires admin
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sourceFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  var files = sourceFolder.getFiles();
  var logs = [];

  while (files.hasNext()) {
    var file = files.next();
    
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS && 
        file.getId() !== ss.getId() && 
        file.getName().includes(TARGET_PHRASE)) {
      
      try {
        var targetSS = SpreadsheetApp.openById(file.getId());
        var setupSheet = targetSS.getSheetByName("Setup");
        var launcherSheet = targetSS.getSheetByName("Launcher");
        
        if (!setupSheet || !launcherSheet) {
          logs.push({ status: 'Skipped', file: file.getName(), msg: 'Missing Setup or Launcher sheet' });
          continue;
        }

        // 1. Get employee names from Setup B3:B
        var employeeNames = setupSheet.getRange("B3:B" + setupSheet.getLastRow()).getValues()
          .map(function(r) { return r[0] ? r[0].toString().trim() : ''; })
          .filter(function(name) { return name && name !== "Manager Lens"; });

        if (employeeNames.length === 0) {
          logs.push({ status: 'Skipped', file: file.getName(), msg: 'No employees in Setup' });
          continue;
        }

        // 2. Get first names for tab naming
        var firstNames = employeeNames.map(function(n) { return n.split(' ')[0]; });

        // 3. Delete existing employee tabs
        var sheetsToDelete = targetSS.getSheets().filter(function(s) { 
          return firstNames.includes(s.getName()); 
        });
        sheetsToDelete.forEach(function(s) { targetSS.deleteSheet(s); });

        // 4. Create new tabs from Launcher template
        firstNames.forEach(function(name, i) {
          var uniqueName = getUniqueSheetName_(targetSS, name);
          var copy = launcherSheet.copyTo(targetSS).setName(uniqueName);
          copy.getRange("B2").setValue(employeeNames[i]);
          targetSS.setActiveSheet(copy);
          targetSS.moveActiveSheet(1);
        });

        // 5. Set Setup as active sheet
        targetSS.setActiveSheet(setupSheet);
        
        logs.push({ status: 'Success', file: file.getName(), msg: 'Created ' + employeeNames.length + ' tabs' });
        
      } catch (e) {
        logs.push({ status: 'Error', file: file.getName(), msg: e.toString() });
      }
    }
  }
  return logs;
}

/**
 * Helper: Get unique sheet name for a target spreadsheet
 * (Mirrors getUniqueSheetName from Admin.gs but works on any SS)
 */
function getUniqueSheetName_(ss, baseName) {
  var name = baseName, idx = 1;
  while (ss.getSheetByName(name)) { name = baseName + " (" + idx++ + ")"; }
  return name;
}