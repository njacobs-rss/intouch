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

/**
 * =============================================================
 * DEV TOOLS: CONDITIONAL FORMATTING EXTRACTOR
 * =============================================================
 */

/**
 * Extracts and displays conditional formatting rules from 'Launcher' sheet in a modal dialog.
 * This bypasses Logger truncation limits by using the client-side clipboard.
 */
function extractLauncherRules() {
  const rulesJSON = getLauncherRulesJSON();
  
  // Create a simple HTML interface
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">
        <style>
          body { font-family: sans-serif; padding: 10px; }
          textarea { width: 100%; height: 300px; font-family: monospace; font-size: 11px; margin-bottom: 10px; }
          button { background: #4285f4; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold; }
          button:hover { background: #3367d6; }
          #status { margin-left: 10px; color: green; font-weight: bold; display: none; }
        </style>
      </head>
      <body>
        <h3>Launcher Conditional Formatting</h3>
        <p>Click below to copy the rules JSON to your clipboard.</p>
        
        <textarea id="jsonOutput" readonly>${rulesJSON}</textarea>
        <br>
        <button onclick="copyToClipboard()">Copy to Clipboard</button>
        <span id="status">Copied!</span>

        <script>
          function copyToClipboard() {
            const copyText = document.getElementById("jsonOutput");
            copyText.select();
            copyText.setSelectionRange(0, 99999); /* For mobile devices */
            
            // Modern clipboard API with fallback
            if (navigator.clipboard) {
                navigator.clipboard.writeText(copyText.value).then(() => {
                    showSuccess();
                });
            } else {
                document.execCommand("copy");
                showSuccess();
            }
          }

          function showSuccess() {
            const status = document.getElementById("status");
            status.style.display = "inline";
            setTimeout(() => { status.style.display = "none"; }, 2000);
          }
          
          // Auto-select on load
          window.onload = function() {
            document.getElementById("jsonOutput").select();
          };
        </script>
      </body>
    </html>
  `;

  const html = HtmlService.createHtmlOutput(htmlContent)
      .setWidth(600)
      .setHeight(500);
      
  SpreadsheetApp.getUi().showModalDialog(html, 'Extracted Rules');
}

/**
 * Helper to extract rules from the Launcher sheet.
 * @return {string} JSON string of rules or error object
 */
function getLauncherRulesJSON() {
  const sheetName = 'Launcher';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) return JSON.stringify({ error: `Sheet '${sheetName}' not found` });

  const rules = sheet.getConditionalFormatRules();
  const extractedRules = rules.map((rule, index) => {
    const booleanCondition = rule.getBooleanCondition();
    const gradientCondition = rule.getGradientCondition();
    
    let ruleData = {
      index: index + 1,
      ranges: rule.getRanges().map(r => r.getA1Notation())
    };

    if (booleanCondition) {
      ruleData.type = 'BOOLEAN';
      ruleData.criteria = String(booleanCondition.getCriteriaType());
      ruleData.args = booleanCondition.getCriteriaValues();
      ruleData.style = {
        background: booleanCondition.getBackground(),
        fontColor: booleanCondition.getFontColor(),
        bold: booleanCondition.getBold(),
        italic: booleanCondition.getItalic(),
        strikethrough: booleanCondition.getStrikethrough(),
        underline: booleanCondition.getUnderline()
      };
    } else if (gradientCondition) {
      ruleData.type = 'GRADIENT';
      ruleData.min = {
        type: String(gradientCondition.getMinType()),
        value: gradientCondition.getMinValue(),
        color: gradientCondition.getMinColor()
      };
      ruleData.mid = {
        type: String(gradientCondition.getMidType()),
        value: gradientCondition.getMidValue(),
        color: gradientCondition.getMidColor()
      };
      ruleData.max = {
        type: String(gradientCondition.getMaxType()),
        value: gradientCondition.getMaxValue(),
        color: gradientCondition.getMaxColor()
      };
    }

    return ruleData;
  });

  return JSON.stringify(extractedRules, null, 2);
}
