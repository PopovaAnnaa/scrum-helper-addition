const enableToggleElement = document.getElementById('enable');
const platformUsernameElement = document.getElementById('platformUsername');
const githubTokenElement = document.getElementById('githubToken');
const gitlabTokenElement = document.getElementById('gitlabToken');
const cacheInputElement = document.getElementById('cacheInput');
const projectNameElement = document.getElementById('projectName');
const yesterdayContributionElement = document.getElementById('yesterdayContribution');
const startingDateElement = document.getElementById('startingDate');
const endingDateElement = document.getElementById('endingDate');
const showOpenLabelElement = document.getElementById('showOpenLabel');
const aiSummaryElement = document.getElementById('aiSummary');
const aiToneElement = document.getElementById('aiTone');
const aiApiKeyElement = document.getElementById('aiApiKey');
const generateReportButton = document.getElementById('generateReport');

const userReasonElement = null;

const showCommitsElement = document.getElementById('showCommits');

function handleBodyOnLoad() {
    // Migration: Handle existing users with old platformUsername storage
    chrome.storage.local.get(['platform', 'platformUsername'], (result) => {
        if (result.platformUsername && result.platform) {
            // Migrate old platformUsername to platform-specific storage
            const platformUsernameKey = `${result.platform}Username`;
            chrome.storage.local.set({ [platformUsernameKey]: result.platformUsername });
            // Remove the old key
            chrome.storage.local.remove(['platformUsername']);
            console.log(`[MIGRATION] Migrated platformUsername to ${platformUsernameKey}`);
        }
    });

    chrome.storage.local.get(
        [
            'platform',
            'githubUsername',
            'gitlabUsername',
            'projectName',
            'enableToggle',
            'startingDate',
            'endingDate',
            'showOpenLabel',

            'userReason',

            'yesterdayContribution',
            'cacheInput',
            'githubToken',
            'gitlabToken',
            'showCommits',
            'aiSummary',
            'aiTone',
            'aiApiKey',
        ],
        (items) => {
            // Load platform-specific username
            const platform = items.platform || 'github';
            const platformUsernameKey = `${platform}Username`;
            if (items[platformUsernameKey]) {
                platformUsernameElement.value = items[platformUsernameKey];
            }

            if (items.githubToken && githubTokenElement) {
                githubTokenElement.value = items.githubToken;
            }
            if (items.gitlabToken && gitlabTokenElement) {
                gitlabTokenElement.value = items.gitlabToken;
            }
            if (items.projectName) {
                projectNameElement.value = items.projectName;
            }
            if (items.cacheInput) {
                cacheInputElement.value = items.cacheInput;
            }
            if (items.enableToggle) {
                enableToggleElement.checked = items.enableToggle;
            } else if (items.enableToggle !== false) {
                // undefined
                enableToggleElement.checked = true;
                handleEnableChange();
            }
            if (items.endingDate) {
                endingDateElement.value = items.endingDate;
            }
            if (items.startingDate) {
                startingDateElement.value = items.startingDate;
            }
            if (items.showOpenLabel) {
                showOpenLabelElement.checked = items.showOpenLabel;
            } else if (items.showOpenLabel !== false) {
                // undefined
                showOpenLabelElement.checked = true;
                handleOpenLabelChange();
            }

            if (items.yesterdayContribution) {
                yesterdayContributionElement.checked = items.yesterdayContribution;
                handleYesterdayContributionChange();
            } else if (items.yesterdayContribution !== false) {
                yesterdayContributionElement.checked = true;
                handleYesterdayContributionChange();
            }
            if (items.showCommits) {
                showCommitsElement.checked = items.showCommits;
            } else {
                showCommitsElement.checked = false;
                handleShowCommitsChange();
            }

            if (items.aiSummary !== undefined && aiSummaryElement) {
                aiSummaryElement.checked = items.aiSummary;
            }
            if (items.aiTone && aiToneElement) {
                aiToneElement.value = items.aiTone;
            }
            if (items.aiApiKey && aiApiKeyElement) {
                aiApiKeyElement.value = decryptApiKey(items.aiApiKey);
            }
        },
    );
}

document.getElementById('refreshCache').addEventListener('click', async (e) => {
    const button = e.currentTarget;
    button.classList.add('loading');
    button.disabled = true;

    setTimeout(() => {
        button.classList.remove('loading');
        button.disabled = false;
    }, 500);
});

function handleEnableChange() {
    const value = enableToggleElement.checked;
    chrome.storage.local.set({ enableToggle: value });
}
function handleStartingDateChange() {
    const value = startingDateElement.value;
    chrome.storage.local.set({ startingDate: value });
}
function handleEndingDateChange() {
    const value = endingDateElement.value;
    chrome.storage.local.set({ endingDate: value });
}

function handleYesterdayContributionChange() {
    const value = yesterdayContributionElement.checked;
    const labelElement = document.querySelector("label[for='yesterdayContribution']");

    if (value) {
        startingDateElement.readOnly = true;
        endingDateElement.readOnly = true;
        endingDateElement.value = getToday();
        startingDateElement.value = getYesterday();
        handleEndingDateChange();
        handleStartingDateChange();
        labelElement.classList.add('selectedLabel');
        labelElement.classList.remove('unselectedLabel');
    } else {
        startingDateElement.readOnly = false;
        endingDateElement.readOnly = false;
        labelElement.classList.add('unselectedLabel');
        labelElement.classList.remove('selectedLabel');
    }
    chrome.storage.local.set({ yesterdayContribution: value });
}

function getYesterday() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
}
function getToday() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

function handlePlatformUsernameChange() {
    const value = platformUsernameElement.value;
    chrome.storage.local.get(['platform'], (result) => {
        const platform = result.platform || 'github';
        const platformUsernameKey = `${platform}Username`;
        chrome.storage.local.set({ [platformUsernameKey]: value });
    });
}
function handleGithubTokenChange() {
    const value = githubTokenElement.value;
    chrome.storage.local.set({ githubToken: value });
}
function handleGitlabTokenChange() {
    const value = gitlabTokenElement.value;
    chrome.storage.local.set({ gitlabToken: value });
}
function handleProjectNameChange() {
    const value = projectNameElement.value;
    chrome.storage.local.set({ projectName: value });
}
function handleCacheInputChange() {
    const value = cacheInputElement.value;
    chrome.storage.local.set({ cacheInput: value });
}
function handleOpenLabelChange() {
    const value = showOpenLabelElement.checked;
    const labelElement = document.querySelector("label[for='showOpenLabel']");

    if (value) {
        labelElement.classList.add('selectedLabel');
        labelElement.classList.remove('unselectedLabel');
    } else {
        labelElement.classList.add('unselectedLabel');
        labelElement.classList.remove('selectedLabel');
    }

    chrome.storage.local.set({ showOpenLabel: value });
}

function handleShowCommitsChange() {
    const value = showCommitsElement.checked;
    chrome.storage.local.set({ showCommits: value });
}

function handleAiSummaryChange() {
    chrome.storage.local.set({ aiSummary: aiSummaryElement.checked });
}

function handleAiToneChange() {
    chrome.storage.local.set({ aiTone: aiToneElement.value });
}

function handleAiApiKeyChange(event) {
    const rawKey = event.target.value.trim();
    if (rawKey) {
        const encryptedKey = window.encryptApiKey(rawKey);
        chrome.storage.local.set({ aiApiKey: encryptedKey });
    } else {
        chrome.storage.local.remove('aiApiKey');
    }
}

async function validateAiSettings() {
    if (!aiSummaryElement.checked) return true;

    const storage = await chrome.storage.local.get(['aiApiKey']);
    const encryptedKey = storage.aiApiKey;
    
    if (!encryptedKey) {
        alert("To use AI Summary, you must specify the AI API Key in the settings.");
        return false;
    }

    const originalBtnText = generateReportButton.innerHTML;
    const scrumReportElement = document.getElementById('scrumReport');

    try {
        generateReportButton.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Checking key...';
        generateReportButton.disabled = true;

        await verifyApiKeyWithProvider(encryptedKey);
        
        return true; 
    } catch (error) {
        if (scrumReportElement) {
            scrumReportElement.innerHTML = `<div class="text-red-600 font-medium p-2 bg-red-50 rounded-lg border border-red-200">Error: ${error.message}</div>`;
        } else {
            alert(error.message);
        }
        return false;
    } finally {
        generateReportButton.innerHTML = originalBtnText;
        generateReportButton.disabled = false;
    }
}

if (generateReportButton) {
    generateReportButton.addEventListener('click', async (e) => {
        const isValid = await validateAiSettings();
        if (!isValid) return;

        console.log("Validation passed! Starting report generation...");
        
        const reportElement = document.getElementById('scrumReport'); 
        
        let currentText = '';
        if (reportElement) {
            currentText = (reportElement.value !== undefined ? reportElement.value : reportElement.innerText) || '';
            currentText = currentText.trim();
        }

        const isDraft = currentText.includes('COMPLETED WORK:') || currentText.includes('YESTERDAY:');

        if (isDraft) {
            console.log("Existing draft detected! Sending draft to AI for rewrite...");
            
            const updateReportText = (newText) => {
                if (reportElement.value !== undefined) {
                    reportElement.value = newText;
                } else {
                    reportElement.innerText = newText;
                }
            };

            updateReportText("Rewriting your draft with AI...\n\n" + currentText);

            const newReport = await window.enhanceReportWithAI(currentText);
            
            updateReportText(newReport);
            
        } else {
            console.log("No draft found. Running full Scrum report generation...");
            
            if (typeof window.generateScrumReport === 'function') {
                window.generateScrumReport(); 
            } else {
                console.error("The generateScrumReport function was not found.");
            }
        }
    });
}

enableToggleElement.addEventListener('change', handleEnableChange);
platformUsernameElement.addEventListener('keyup', handlePlatformUsernameChange);
if (githubTokenElement) {
    githubTokenElement.addEventListener('keyup', handleGithubTokenChange);
}
if (gitlabTokenElement) {
    gitlabTokenElement.addEventListener('keyup', handleGitlabTokenChange);
}
cacheInputElement.addEventListener('keyup', handleCacheInputChange);
projectNameElement.addEventListener('keyup', handleProjectNameChange);
startingDateElement.addEventListener('change', handleStartingDateChange);
showCommitsElement.addEventListener('change', handleShowCommitsChange);
endingDateElement.addEventListener('change', handleEndingDateChange);
yesterdayContributionElement.addEventListener('change', handleYesterdayContributionChange);
showOpenLabelElement.addEventListener('change', handleOpenLabelChange);

document.addEventListener('DOMContentLoaded', handleBodyOnLoad);

if (aiSummaryElement) aiSummaryElement.addEventListener('change', handleAiSummaryChange);
if (aiToneElement) aiToneElement.addEventListener('change', handleAiToneChange);
if (aiApiKeyElement) aiApiKeyElement.addEventListener('input', handleAiApiKeyChange);