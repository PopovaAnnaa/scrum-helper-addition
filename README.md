# Google Summer of Code 2026 – Final Report

**Project Title:** Scrum Helper

**Organization:** FOSSASIA

**Contributors:** *[Hryhorenko-Yeluzaveta](https://github.com/Hryhorenko-Yeluzaveta),*

**Project Repo:** *https://github.com/fossasia/scrum_helper*

---

## 🏢 About the Project
 
[Scrum Helper](https://github.com/fossasia/scrum_helper) is a Chrome extension developed under FOSSASIA that simplifies writing daily development reports by auto-filling content based on Git activity. Users enter their GitHub username, select a date range, and choose their preferences — the extension then automatically fetches commits, pull requests, issues, and code reviews via the GitHub/GitLab API and generates a pre-filled report that can be edited before sending.
 
The extension integrates directly with compose windows in **Google Groups, Gmail, Yahoo Mail, and Outlook**, and also provides a standalone popup interface with a live preview and rich-text clipboard export. It supports Chrome, Firefox, Opera, Edge, and Brave.

---

## 🎯 Goals of the Project
 
Despite generating reports automatically, the extension had **no way to filter which items appeared in the report**. All fetched activity - open PRs, closed PRs, all issues regardless of status - ended up in the report. For active contributors working across multiple repositories, this produced noisy, hard-to-read reports.

The [original issue](https://github.com/fossasia/scrum_helper/issues/276) proposed introducing optional filtering controls:
 
- Include only merged pull requests
- Include only issues closed within the selected date range
- Exclude activity from specific repositories
- Include activity matching specific labels or keywords

---

## ✅ Completed Goals By Hryhorenko Yelyzaveta

My task was to introduce **optional filtering controls** that let users fine-tune what appears in their scrum report:

- **MergedPRsFilter** – include only merged Pull Requests / Merge Requests
- **ClosedIssuesFilter** – include only issues closed within the selected date range

| Goal | Status |
|---|---|
| UI controls for both filters (checkboxes with tooltips) | ✅ Done |
| i18n support (English, Russian, Ukrainian) | ✅ Done |
| Filter persistence via `chrome.storage.local` | ✅ Done |
| GitHub filtering logic | ✅ Done |
| GitLab filtering logic | ✅ Done |
| Mutual exclusivity between conflicting filters | ✅ Done |
| Date-range validation for closed issues | ✅ Done |
| Empty-state message when no activity matches | ✅ Done |
| Jest test suite for both filters (528+ lines) | ✅ Done |

## 🛠️ Work Completed

### Filter 1: MergedPRsFilter

**What it does:** When enabled, only Pull Requests / Merge Requests that have been successfully merged appear in the scrum report. Open and closed-but-not-merged PRs are excluded.

#### Implementation breakdown

**UI & i18n** (`src/popup.html`, `src/_locales/*/messages.json`)
- Added a checkbox `onlyMergedPRs` with an accessible tooltip
- Added i18n strings `onlyMergedPRsLabel` and `onlyMergedPRsTooltip` in English, Russian, and Ukrainian locales

**State persistence** (`src/scripts/popup.js`)
- Reads the checkbox state from `chrome.storage.local` on popup open
- Attaches a `change` listener to save the preference immediately on toggle

**GitLab support** (`src/scripts/gitlabHelper.js`, `src/scripts/scrumHelper.js`)
- Extended GitLab MR objects to expose the `state` field
- Filter checks `item.state === 'merged'` for GitLab items

**Mutual exclusivity** (`src/scripts/popup.js`)
- Enabling `onlyMergedPRs` automatically unchecks `onlyIssues` and `onlyClosedIssues`
- The reverse logic applies: enabling either of those unchecks `onlyMergedPRs`

### Filter 2: ClosedIssuesFilter

**What it does:** When enabled, only issues with `state: closed` appear in the report - and only if their `closed_at` timestamp falls within the user-selected date range.

#### Implementation breakdown

**UI & i18n** (`src/popup.html`, `src/_locales/ru/messages.json`)
- Added a checkbox `onlyClosedIssues` with a tooltip
- Added corresponding i18n strings

**State persistence & mutual exclusivity** (`src/scripts/popup.js`)
- Mirroring the MergedPRsFilter approach
- Enabling `onlyClosedIssues` automatically unchecks `onlyPRs` and `onlyMergedPRs`

**GitHub filtering logic** (`src/scripts/scrumHelper.js`)
- Skips issues whose `state` is not `closed`
- Parses `item.closed_at`, compares it against `startDateFilter` / `endDateFilter`
- If `closed_at` is missing or unparseable, logs a warning and skips the item

**GitLab support** (`src/scripts/gitlabHelper.js`)
- Extended GitLab issue objects to pass through `closed_at`
- Filter logic is identical: `state === 'closed'` + date-range check

### Additional improvements (shipped alongside the filters)

| Improvement | Description |
|---|---|
| **API pagination** | `fetchAllGithubPages()` for GitHub; equivalent pagination for GitLab - ensures large activity sets are fully fetched |
| **Empty state** | When filters exclude everything, the report shows `📭 No activity found for this period` instead of a blank list |

Both filters have comprehensive Jest test suites. Because the extension runs in a browser context without a module system, the filter functions are extracted and duplicated inside the test files - no imports needed.

---

## 📝 Summary

In progress...
