# Setting Up Cursor for Your InTouch GAS Project

## Step 1: Add the Rules File

1. In your project folder (where your `.gs` and `.html` files are), create a new file called `.cursorrules`
2. Copy the entire contents of the `.cursorrules` artifact into this file
3. Save it

**That's it!** Cursor will automatically read this file and use it to understand your project.

---

## Step 2: Configure Cursor Settings (Optional but Recommended)

Open Cursor Settings (`Cmd/Ctrl + ,`) and add these to your workspace settings:

```json
{
  "files.associations": {
    "*.gs": "javascript"
  },
  "editor.formatOnSave": false,
  "editor.tabSize": 2
}
```

This tells Cursor to treat `.gs` files as JavaScript.

---

## Step 3: How to Talk to Claude/Gemini in Cursor

### For Bug Fixes
```
I'm getting this error in [filename]:
[paste error message]

Here's the function:
[paste function or let Cursor include it]
```

### For New Features
```
I want to add [feature description].

It should:
- [requirement 1]
- [requirement 2]

Which files need to change?
```

### For Understanding Code
```
Explain what this function does step by step:
[paste function name or code]
```

### For Sidebar Work
```
I need to add a new button to BI_Sidebar.html that:
- [what it should do]
- Calls [server function name] 

Show me both the HTML and the .gs changes needed.
```

---

## Quick Command Reference

### Common Prompts for Your Project

| What You Want | What to Say |
|---------------|-------------|
| Fix a timeout | "This function times out on large data. Add batch processing and flush patterns." |
| Add logging | "Add Pattern 6 logging to this function" |
| Debug a sidebar | "The button doesn't work. Show me how to add console.log debugging." |
| Add a column lookup | "Find the column named 'Status' using the fuzzy match pattern" |
| Create a new menu item | "Add a new menu item that runs [function name]" |

---

## Your Project's Key Concepts (Beginner Summary)

### What is GAS?
Google Apps Script - JavaScript that runs inside Google Workspace. It can:
- Add menus to Sheets/Docs
- Create sidebar UIs
- Read/write spreadsheet data
- Create Slides presentations
- Run on schedules (triggers)

### Your Project Structure

```
📁 Your Project
├── Main.js           ← Menus and triggers start here
├── Admin.js          ← "Backend" operations
├── STATCORE.js       ← Syncs data from other sheets
├── AiOpsFunctions.js ← Powers the sidebar
├── DynamicNotes.js   ← Creates sticky notes
├── BizInsights.js    ← Makes slide decks
├── FleetCommander.js ← Copies sheets to other files
├── BI_Sidebar.html   ← The main sidebar UI
├── AdminSidebar.html ← Admin tools sidebar
└── appsscript.json   ← Project settings
```

### The Two Worlds

1. **Server Side (.gs files)**
   - Runs on Google's servers
   - Can access Sheets, Drive, etc.
   - Use `Logger.log()` to debug

2. **Client Side (.html files)**
   - Runs in the browser
   - Can't directly access Google services
   - Use `console.log()` to debug
   - Talks to server via `google.script.run`

---

## Troubleshooting Checklist

When something breaks:

- [ ] Did I save all files?
- [ ] Did I push with clasp? (`npm run push:master`)
- [ ] Did I refresh the Google Sheet?
- [ ] Check Apps Script logs (View → Executions)
- [ ] Check browser console (F12) for sidebar errors
- [ ] Is the sheet name spelled correctly?
- [ ] Does the column header match exactly?

---

## Learning Path

1. **Week 1**: Understand `Main.js` - how menus and triggers work
2. **Week 2**: Study `AiOpsFunctions.js` - how sidebar gets data
3. **Week 3**: Explore `STATCORE.js` - how data syncs
4. **Week 4**: Try modifying `BI_Sidebar.html` - add a simple feature

**Pro Tip**: Use Claude/Gemini in Cursor to explain any function:
```
Explain this function line by line for a beginner:
[paste function]
```
