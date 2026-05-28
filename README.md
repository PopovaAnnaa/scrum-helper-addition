# Google Summer of Code 2026 – Final Report

**Project Title:** Scrum Helper

**Organization:** FOSSASIA

**Contributors:** *[Hryhorenko-Yeluzaveta](https://github.com/Hryhorenko-Yeluzaveta),* *[Popova-Anna](https://github.com/PopovaAnnaa),* *[Shkuratovska-Daria](https://github.com/witch1110),* 

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

## ✅ Completed Goals By Shkuratovska Daria

My objective was to design and implement customizable filtering layers that allow users to exclude irrelevant repositories and isolate specific tasks based on metadata:

| Goal | Status |
|---|---|
| **Clean & Readable UI** for filters inside `popup.html` | ✅ Done |
| **Dynamic Repository Loader** (Fetches user's active repos into select dropdown) | ✅ Done |
| **Stage 1: Repository Exclusion** (Removes specific projects from the final report) | ✅ Done |
| **Stage 2: Label Filtering** (Matches official GitHub Labels like `bug`, `ui`) | ✅ Done |
| **Stage 2: Keyword Filtering** (Case-insensitive title/body scan) | ✅ Done |
| **State persistence** via `chrome.storage.local` | ✅ Done |
| **Combined Filtering Architecture** (Logical AND/OR combination for flexible search) | ✅ Done |

---

## 🛠️ Work Completed

### Filter 1: Repository Exclusion System (Stage 1)

**What it does:** Allows users to explicitly select and block specific Git repositories from appearing in the final scrum report. This is crucial for developers who commit to minor or secondary projects but don't want them in their main daily standup report.

#### Implementation breakdown:
- **UI Integration:** Built a sleek dropdown selector (`<select>`) that dynamically populates with the user's actual available repositories, accompanied by an "Add" action button and an active visual blocklist (`<ul>`).
- **Storage Logic:** The list of excluded repositories is securely written to and read from `chrome.storage.local`, ensuring settings persist when the popup closes.
- **Filtering Engine:** Enhanced `filterEvents()` in `scrumHelper.js`. It extracts the full name of the repository from `item.repository_url` and drops the item immediately if it matches the blocklist.

### Filter 2: Metadata & Content Filter (Stage 2)

**What it does:** Fine-tunes the report by filtering tasks via official labels (e.g., `bug`, `documentation`) or specific keywords in the title/description (e.g., `fix`, `refactor`). If enabled, only matching tasks pass through.

#### Implementation breakdown:
- **UI Refactoring:** Designed a dedicated, high-contrast configuration card inside `popup.html`. Removed noisy icons for maximum readability, upgrading input controls to standard typography (`text-sm`) with responsive saving indicators.
- **Label Matching Engine:** Implemented `hasRequiredLabels()` to parse GitHub's nested array of label objects. It sanitizes inputs using `.trim().toLowerCase()` to prevent casing errors.
- **Keyword Scan Engine:** Implemented `hasRequiredKeywords()`, executing a deep case-insensitive search across both `item.title` and `item.body` (handling null text safety).
- **Logical Integration:** Engineered an advanced fallback mechanism. If both labels and keywords are provided, they operate on an **OR** basis, ensuring vital cross-referenced tasks are never lost.

---

## ✅ Completed Goals By Popova Anna

My objective was to introduce an intelligent AI layer to the extension, enabling users to securely use their own API keys to automatically summarize raw Git activity into polished, stylized scrum reports using Gemini/OpenAI.

| Goal | Status |
| --- | --- |
| **Secure UI Integration** for API keys and configuration | ✅ Done |
| **Encrypted State Persistence** via `chrome.storage` | ✅ Done |
| **Robust API Service Class** with error handling and retry logic | ✅ Done |
| **Data Preparation Adapter** with text cleaning and token trimming | ✅ Done |
| **Persona-Driven Prompt Engineering** (Official vs. Concise tones) | ✅ Done |
| **Asynchronous Generation Workflow** with loading states and UX indicators | ✅ Done |
| **Interactive Live Editing** and report regeneration | ✅ Done |

---

## 🛠️ Work Completed

### Feature: AI-Powered Report Summarization

**What it does:** Allows users to transform dense, cluttered lists of commits, PRs, and issues into cohesive, human-readable summaries. Users can provide their own API key, choose a preferred reporting tone, and review/edit the AI's output before finalizing their report.

#### Implementation breakdown:

**Stage 1: UI & Settings Architecture** 

* **Layout & Styling (`popup.html`):** Designed and integrated a high-contrast UI component featuring secure fields for API key input, a dropdown selector for report tone (Official/Concise), and a master "AI Summary" toggle switch styled to blend with the native extension layout.
* **Secure Storage (`main.js`):** Implemented data lifecycle logic to securely read/write configuration states to `chrome.storage`. Added front-end security measures including key masking and input obfuscation.
* **Validation Layer:** Engineered real-time input validation to verify key formats and handle configuration errors gracefully before executing network requests.

**Stage 2: AI Core & Data Adaptation** 

* **API Service Layer (`aiService.js`):** Developed a modular, standalone class to orchestrate asynchronous HTTP queries to external LLM APIs (Gemini/OpenAI). Integrated robust handling for HTTP error codes and intelligent re-query/backoff logic.
* **Data Preparation Adapter:** Created a formatting adapter that sanitizes raw Git JSON data—stripping out automated merge noise and "garbage" text—and structures it efficiently to stay well within API token windows.
* **Prompt Engineering:** Crafted, benchmarked, and optimized targeted system prompts that enforce structural rules based on the user's selected tone preference (e.g., highly technical for "Official", ultra-scannable for "Concise").

**Stage 3: Workflow Integration & UX** 

* **Core Integration (`scrumHelper.js`):** Intercepted the legacy `allIncluded` data pipeline. Added conditional routing logic: if the AI toggle is active, data branches to the `aiService` pipeline; otherwise, it falls back gracefully to the legacy markdown generator.
* **UX Enhancements:** Introduced responsive loading states, text alerts, and spinner indicators to keep the popup interface highly interactive and prevent perceived browser freezes during generation.
* **Live Editing & Iteration:** Exposed a mutable text box for manual post-generation edits alongside a "Try again" regeneration action button.

---

## 📝 Summary

The **Scrum Helper** extension has been successfully elevated from a raw data-fetching tool into a highly customizable, intelligent reporting workspace. Through a collaborative effort, the team addressed the critical issue of report noise by introducing advanced filtering mechanisms, custom repository controls, and an AI-driven summarization layer.

### Key Achievements

* **Granular Activity Filtering:** Users can now filter reports strictly by merged pull requests and closed issues within specific date ranges, reducing noise for highly active contributors.
* **Metadata & Repository Controls:** Added a dynamic repository exclusion blocklist alongside case-insensitive label and keyword scanning engines to isolate critical tasks instantly.
* **AI-Powered Automation:** Integrated a secure, persona-driven LLM layer (Gemini) that transforms cluttered technical logs into polished, human-readable standup summaries with official or concise tones.
* **Seamless UX & Cross-Browser Stability:** Maintained a clean user interface featuring secure storage persistence (`chrome.storage.local`), multilingual support (i18n), comprehensive Jest test coverage, and smooth fallback architectures.

With these upgrades, Scrum Helper significantly reduces the manual friction of daily standup preparation, empowering developers across Chrome, Firefox, Edge, Brave, and Opera to generate precise, professional scrum reports in seconds.
