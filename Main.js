/**
 * =============================================================
 * FILE: Main.gs (Robust UI Launchers)
 * =============================================================
 */

const SESSION_LOG_CONFIG_ = {
  LOG_SHEET_NAME: 'Log',
  HEADER: ['username', 'session timestamp', 'Worksheet Name'],
  MAX_ROWS: 20000,
  THROTTLE_SECONDS: 1800
};

// --- TRIGGERS ---

function onOpen(e) {
  const ui = SpreadsheetApp.getUi();
  
  // 1. InTouch AI Menu (User Facing)
  const mainMenu = ui.createMenu('InTouch✔ai')
    .addItem('🧠 Open Intouch AI Panel', 'BI_openSidebar')
    .addSeparator() // Visual separation
    .addItem('Export AM Summaries', 'exportAllAMSummariesToSheet'); // 🟢 NEW ITEM
  
  // 2. Admin Menu (Backend/Ops)
  const adminMenu = ui.createMenu('Admin Functions')
    .addItem('🚀 Open Fleet Commander', 'openAdminPanel')   
    .addSeparator();

  const amTabsSubMenu = ui.createMenu('AM Tabs')
    .addItem('Create All From Setup', 'createEmployeeTabs')
    .addItem('Delete All From Setup', 'deleteEmployeeTabs')
    .addItem('Create Single Tab (from F2)', 'createSingleEmployeeTab');
  
  const focus20SubMenu = ui.createMenu('Focus20')
    .addItem('Add RIDs from Smart Select', 'moveTrueAccountsToFocus20')
    .addItem('Remove RIDs from Smart Select', 'removeTrueAccountsFromFocus20Optimized');

  adminMenu.addSubMenu(amTabsSubMenu)
           .addSubMenu(focus20SubMenu)
           .addSeparator()
           .addItem('Update Notes Only', 'manualUpdateNotesOnly')
           .addItem('Force Master Pipeline', 'runMasterPipeline')
           .addSeparator()
           .addItem('⚡ Reset Nightly Trigger', 'setupNightlyTrigger');

  // 3. Render Menus
  mainMenu.addToUi();
  adminMenu.addToUi();
}

function onEdit(e) {
  handleIntouchEdits(e); 
}

function installableOnOpen() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  logSession_(ss);
  console.log("[installableOnOpen] ⚡ Preloading Sidebar Data...");
  refreshSidebarCache(); 
}

// --- UI LAUNCHERS (ROBUST SWITCHING) ---

function BI_openSidebar() {
  // Capture UI reference FIRST (before any other operation)
  const ui = SpreadsheetApp.getUi();
  
  try {
    // Force any pending spreadsheet operations to complete
    SpreadsheetApp.flush();
    
    // Build HTML 
    const html = HtmlService.createTemplateFromFile('BI_Sidebar').evaluate()
      .setTitle('InTouch AI')
      .setWidth(450);
    
    // Longer pause - gives browser time to fully close any existing sidebar
    Utilities.sleep(500); 
    
    // Use cached UI reference
    ui.showSidebar(html);
    
  } catch (e) {
    console.error("[BI_openSidebar] Error:", e.message, e.stack);
    ui.alert("❌ Failed to launch AI Sidebar:\n" + e.message);
  }
}

function openAdminPanel() {
  // Capture UI reference FIRST (before any other operation)
  const ui = SpreadsheetApp.getUi();
  
  try {
    // Force any pending spreadsheet operations to complete
    SpreadsheetApp.flush();
    
    // Build HTML
    const html = HtmlService.createTemplateFromFile('AdminSidebar').evaluate()
      .setTitle('🚀 Fleet Commander')
      .setWidth(300);
    
    // Longer pause - gives browser time to fully close any existing sidebar
    Utilities.sleep(500); 
    
    // Use cached UI reference
    ui.showSidebar(html);

  } catch (e) {
    console.error("[openAdminPanel] Error:", e.message, e.stack);
    ui.alert("❌ Failed to launch Admin Sidebar:\n" + e.message);
  }
}

// --- LOGGING ENGINE ---

function logSession_(ss, meta = {}) {
  try {
    const userEmail = meta.userEmail || Session.getActiveUser().getEmail();
    const cache = CacheService.getUserCache();
    const lastLogKey = `LAST_LOG_${ss.getId()}`; 
    if (cache.get(lastLogKey)) return;

    const fileName = ss.getName(); 
    const lock = LockService.getDocumentLock();
    if (!lock.tryLock(5000)) return; 

    try {
      const logSheet = getOrCreateLogSheet_(ss, SESSION_LOG_CONFIG_);
      if (!logSheet) return;
      logSheet.appendRow([userEmail, new Date(), fileName]);
      if (logSheet.getLastRow() > SESSION_LOG_CONFIG_.MAX_ROWS) logSheet.deleteRow(2); 
      cache.put(lastLogKey, 'true', SESSION_LOG_CONFIG_.THROTTLE_SECONDS);
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    console.error(`[logSession] failed: ${err.message}`);
  }
}

function getOrCreateLogSheet_(ss, cfg) {
  let sh = ss.getSheetByName(cfg.LOG_SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(cfg.LOG_SHEET_NAME);
    sh.hideSheet(); 
  }
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, cfg.HEADER.length).setValues([cfg.HEADER]);
    sh.setFrozenRows(1);
  }
  return sh;
}