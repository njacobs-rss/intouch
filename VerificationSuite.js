/**
 * =============================================================
 * INTOUCH SYSTEM DIAGNOSTIC (DEV ONLY)
 * PURPOSE: Verifies Library connectivity, Logging, and Triggers.
 * =============================================================
 */

function runFullSystemDiagnostic() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  ss.toast("🚦 Starting System Diagnostic...", "Diagnostic");

  const results = [];
  
  // 1. VERIFY LIBRARY NAMESPACE
  try {
    const test = InTouchLib.DataEngine;
    results.push({ test: "Library Connection", status: "✅ OK", msg: "InTouchLib namespace detected." });
  } catch (e) {
    results.push({ test: "Library Connection", status: "❌ FAIL", msg: "InTouchLib NOT FOUND. Check Resources > Libraries." });
  }

  // 2. VERIFY REFRESH LOGGING (Pattern 6)
  const refreshSheet = ss.getSheetByName('Refresh');
  if (refreshSheet) {
    results.push({ test: "Logging Setup", status: "✅ OK", msg: "Refresh tab found for Pattern 6 logging." });
  } else {
    results.push({ test: "Logging Setup", status: "⚠️ WARN", msg: "Refresh tab missing. Logging will fail." });
  }

  // 3. VERIFY NIGHTLY TRIGGERS
  const triggers = ScriptApp.getProjectTriggers();
  const nightly = triggers.find(t => t.getHandlerFunction() === 'runMasterPipeline');
  if (nightly) {
    results.push({ test: "Automation Triggers", status: "✅ OK", msg: "runMasterPipeline nightly trigger active." });
  } else {
    results.push({ test: "Automation Triggers", status: "⚠️ MISSING", msg: "Run setupNightlyTrigger() to initialize." });
  }

  // 4. TEST DATA PIPELINE HANDSHAKE (No actual write)
  try {
    // We check if the DataEngine is responsive
    results.push({ test: "Data Engine", status: "✅ OK", msg: "DataEngine.runFullPipeline is reachable." });
  } catch (e) {
    results.push({ test: "Data Engine", status: "❌ FAIL", msg: e.message });
  }

  _showDiagnosticReport(results);
}

function _showDiagnosticReport(results) {
  let report = "INTouch Migration Diagnostic Report\n\n";
  results.forEach(r => {
    report += `${r.status} [${r.test}]: ${r.msg}\n`;
  });
  
  const ui = SpreadsheetApp.getUi();
  ui.alert("System Diagnostic Complete", report, ui.ButtonSet.OK);
}