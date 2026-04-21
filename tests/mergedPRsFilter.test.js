function shouldIncludeWithFilters(item, flags, platform) {
	const { onlyIssues, onlyPRs, onlyMergedPRs, onlyClosedIssues, onlyRevPRs } = flags;
	const isAnyFilterActive = onlyIssues || onlyPRs || onlyRevPRs || onlyMergedPRs || onlyClosedIssues;

	const isMR = platform === 'gitlab'
		? (!!item.iid && !!item.project_id && !item.issue_type)
		: !!item.pull_request;

	if (!isAnyFilterActive) return { include: true, isMR };

	if (isMR && !onlyPRs && !onlyMergedPRs) {
		return { include: false, isMR, reason: 'PR skipped – no PR filter active' };
	}
	if (!isMR && !onlyIssues && !onlyClosedIssues) {
		return { include: false, isMR, reason: 'Issue skipped – no issue filter active' };
	}

	return { include: true, isMR };
}

function filterMergedPR(item, onlyMergedPRs, platform = 'github') {
	if (!onlyMergedPRs) return true;

	let merged;
	if (platform === 'gitlab') {
		merged = item.state === 'merged';
	} else {
		merged = item._merged;
	}

	if (merged !== true) return false;
	return true;
}

function normalizeMutualExclusivity(flags) {
	const result = { ...flags };
	if (result.onlyIssues && result.onlyPRs) result.onlyPRs = false;
	if (result.onlyIssues && result.onlyMergedPRs) result.onlyMergedPRs = false;
	if (result.onlyClosedIssues && result.onlyPRs) result.onlyPRs = false;
	if (result.onlyClosedIssues && result.onlyMergedPRs) result.onlyMergedPRs = false;
	return result;
}

function makeIssue(overrides = {}) {
	return {
		number: 42,
		title: 'Test issue',
		state: 'open',
		html_url: 'https://github.com/org/repo/issues/42',
		repository_url: 'https://api.github.com/repos/org/repo',
		created_at: '2026-04-15T10:00:00Z',
		updated_at: '2026-04-15T12:00:00Z',
		...overrides,
	};
}

function makePR(overrides = {}) {
	return {
		number: 100,
		title: 'Test PR',
		state: 'open',
		html_url: 'https://github.com/org/repo/pull/100',
		repository_url: 'https://api.github.com/repos/org/repo',
		pull_request: { url: 'https://api.github.com/repos/org/repo/pulls/100' },
		created_at: '2026-04-15T10:00:00Z',
		updated_at: '2026-04-15T12:00:00Z',
		_merged: false,
		...overrides,
	};
}

function makeGitLabIssue(overrides = {}) {
	return {
		iid: 10,
		project_id: 1,
		issue_type: 'issue',
		title: 'GL Issue',
		state: 'opened',
		web_url: 'https://gitlab.com/org/repo/-/issues/10',
		created_at: '2026-04-15T10:00:00Z',
		...overrides,
	};
}

function makeGitLabMR(overrides = {}) {
	return {
		iid: 20,
		project_id: 1,
		title: 'GL MR',
		state: 'opened',
		web_url: 'https://gitlab.com/org/repo/-/merge_requests/20',
		created_at: '2026-04-15T10:00:00Z',
		...overrides,
	};
}

describe('onlyMergedPRs filter – item inclusion (shouldIncludeWithFilters)', () => {
	const noFilters = {
		onlyIssues: false, onlyPRs: false, onlyRevPRs: false,
		onlyMergedPRs: false, onlyClosedIssues: false,
	};

	test('no filters active → all items included', () => {
		expect(shouldIncludeWithFilters(makeIssue(), noFilters, 'github').include).toBe(true);
		expect(shouldIncludeWithFilters(makePR(), noFilters, 'github').include).toBe(true);
	});

	test('onlyMergedPRs active → PRs pass inclusion, issues excluded', () => {
		const flags = { ...noFilters, onlyMergedPRs: true };
		const issue = makeIssue();
		const pr = makePR({ _merged: true });

		expect(shouldIncludeWithFilters(pr, flags, 'github').include).toBe(true);
		expect(shouldIncludeWithFilters(issue, flags, 'github').include).toBe(false);
	});

	test('onlyMergedPRs active → MRs in GitLab pass, issues excluded', () => {
		const flags = { ...noFilters, onlyMergedPRs: true };
		const mr = makeGitLabMR({ state: 'merged' });
		const issue = makeGitLabIssue();

		expect(shouldIncludeWithFilters(mr, flags, 'gitlab').include).toBe(true);
		expect(shouldIncludeWithFilters(issue, flags, 'gitlab').include).toBe(false);
	});
});

describe('onlyMergedPRs – mutual exclusivity normalization', () => {
	test('onlyMergedPRs + onlyIssues → onlyMergedPRs disabled', () => {
		const result = normalizeMutualExclusivity({
			onlyIssues: true, onlyPRs: false, onlyRevPRs: false,
			onlyMergedPRs: true, onlyClosedIssues: false,
		});
		expect(result.onlyIssues).toBe(true);
		expect(result.onlyMergedPRs).toBe(false);
	});

	test('onlyMergedPRs + onlyClosedIssues → onlyMergedPRs disabled', () => {
		const result = normalizeMutualExclusivity({
			onlyIssues: false, onlyPRs: false, onlyRevPRs: false,
			onlyMergedPRs: true, onlyClosedIssues: true,
		});
		expect(result.onlyClosedIssues).toBe(true);
		expect(result.onlyMergedPRs).toBe(false);
	});

	test('onlyMergedPRs alone → no side effects', () => {
		const input = {
			onlyIssues: false, onlyPRs: false, onlyRevPRs: false,
			onlyMergedPRs: true, onlyClosedIssues: false,
		};
		expect(normalizeMutualExclusivity(input)).toEqual(input);
	});

	test('onlyMergedPRs + onlyPRs → both remain active (no conflict rule)', () => {
		const input = {
			onlyIssues: false, onlyPRs: true, onlyRevPRs: false,
			onlyMergedPRs: true, onlyClosedIssues: false,
		};
		expect(normalizeMutualExclusivity(input)).toEqual(input);
	});
});

describe('onlyMergedPRs – end-to-end filtering pipeline (GitHub)', () => {
	function runPipeline(items, flags) {
		const normalized = normalizeMutualExclusivity(flags);
		return items.filter((item) => {
			const { include, isMR } = shouldIncludeWithFilters(item, normalized, 'github');
			if (!include) return false;
			if (isMR) {
				return filterMergedPR(item, normalized.onlyMergedPRs, 'github');
			}
			return true;
		});
	}

	test('mixed items with onlyMergedPRs → only merged PRs survive', () => {
		const items = [
			makeIssue({ number: 1 }),
			makePR({ number: 2, state: 'open', _merged: false }),
			makePR({ number: 3, state: 'closed', _merged: true }),
			makePR({ number: 4, state: 'closed', _merged: false }),
			makePR({ number: 5, state: 'closed', _merged: null }),
		];
		const flags = {
			onlyIssues: false, onlyPRs: false, onlyRevPRs: false,
			onlyMergedPRs: true, onlyClosedIssues: false,
		};
		const result = runPipeline(items, flags);
		expect(result.map((i) => i.number)).toEqual([3]);
	});

	test('no filters → all items pass', () => {
		const items = [
			makeIssue(),
			makePR({ _merged: false }),
			makePR({ _merged: true }),
		];
		const flags = {
			onlyIssues: false, onlyPRs: false, onlyRevPRs: false,
			onlyMergedPRs: false, onlyClosedIssues: false,
		};
		expect(runPipeline(items, flags)).toHaveLength(3);
	});

	test('onlyMergedPRs + onlyIssues conflict → onlyMergedPRs suppressed, only issues remain', () => {
		const items = [
			makeIssue({ number: 1 }),
			makePR({ number: 2, state: 'closed', _merged: true }),
		];
		const flags = {
			onlyIssues: true, onlyPRs: false, onlyRevPRs: false,
			onlyMergedPRs: true, onlyClosedIssues: false,
		};
		const result = runPipeline(items, flags);
		expect(result.map((i) => i.number)).toEqual([1]);
	});
});

describe('onlyMergedPRs filter – GitLab state === "merged"', () => {
	test('GitLab MR with state "merged" → included', () => {
		const mr = makeGitLabMR({ state: 'merged' });
		expect(filterMergedPR(mr, true, 'gitlab')).toBe(true);
	});

	test('GitLab MR with state "opened" → excluded', () => {
		const mr = makeGitLabMR({ state: 'opened' });
		expect(filterMergedPR(mr, true, 'gitlab')).toBe(false);
	});

	test('GitLab MR with state "closed" → excluded (closed but not merged)', () => {
		const mr = makeGitLabMR({ state: 'closed' });
		expect(filterMergedPR(mr, true, 'gitlab')).toBe(false);
	});
});

describe('onlyMergedPRs – GitLab end-to-end pipeline', () => {
	function runPipeline(items, flags) {
		const normalized = normalizeMutualExclusivity(flags);
		return items.filter((item) => {
			const { include, isMR } = shouldIncludeWithFilters(item, normalized, 'gitlab');
			if (!include) return false;
			if (isMR) {
				return filterMergedPR(item, normalized.onlyMergedPRs, 'gitlab');
			}
			return true;
		});
	}

	test('mixed GitLab items → only merged MRs survive', () => {
		const items = [
			makeGitLabIssue({ iid: 1 }),
			makeGitLabMR({ iid: 2, state: 'opened' }),
			makeGitLabMR({ iid: 3, state: 'merged' }),
			makeGitLabMR({ iid: 4, state: 'closed' }),
		];
		const flags = {
			onlyIssues: false, onlyPRs: false, onlyRevPRs: false,
			onlyMergedPRs: true, onlyClosedIssues: false,
		};
		const result = runPipeline(items, flags);
		expect(result.map((i) => i.iid)).toEqual([3]);
	});

	test('onlyMergedPRs + onlyClosedIssues conflict → onlyMergedPRs suppressed', () => {
		const items = [
			makeGitLabMR({ iid: 1, state: 'merged' }),
			makeGitLabIssue({ iid: 2, state: 'closed', closed_at: '2026-04-15T12:00:00Z' }),
		];
		const flags = {
			onlyIssues: false, onlyPRs: false, onlyRevPRs: false,
			onlyMergedPRs: true, onlyClosedIssues: true,
		};
		const result = runPipeline(items, flags);
		expect(result.map((i) => i.iid)).toEqual([2]);
	});
});
