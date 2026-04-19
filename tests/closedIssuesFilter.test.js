
function shouldIncludeWithFilters(item, flags, platform) {
	const { onlyIssues, onlyPRs, onlyMergedPRs, onlyClosedIssues, onlyRevPRs } = flags;
	const isAnyFilterActive = onlyIssues || onlyPRs || onlyRevPRs || onlyMergedPRs || onlyClosedIssues;

	const isMR = platform === 'gitlab'
		? (!!item.iid && !!item.project_id && !item.issue_type)
		: !!item.pull_request;

	if (!isAnyFilterActive) return { include: true, isMR };

	if (isMR && !onlyPRs && !onlyMergedPRs) {
		return { include: false, isMR, reason: 'PR skipped – onlyPRs/onlyMergedPRs not active' };
	}
	if (!isMR && !onlyIssues && !onlyClosedIssues) {
		return { include: false, isMR, reason: 'Issue skipped – onlyIssues/onlyClosedIssues not active' };
	}

	return { include: true, isMR };
}

function filterClosedIssue(item, onlyClosedIssues, startDateFilter, endDateFilter) {
	if (!onlyClosedIssues) return true;

	if (item.state !== 'closed') return false;

	if (item.closed_at) {
		const closedDate = new Date(item.closed_at);
		if (isNaN(closedDate.getTime())) return true;
		if (closedDate < startDateFilter || closedDate > endDateFilter) return false;
	}

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

describe('onlyClosedIssues filter – item inclusion (shouldIncludeWithFilters)', () => {
	const noFilters = {
		onlyIssues: false, onlyPRs: false, onlyRevPRs: false,
		onlyMergedPRs: false, onlyClosedIssues: false,
	};

	test('no filters active → all items included', () => {
		const issue = makeIssue();
		const pr = makePR();
		expect(shouldIncludeWithFilters(issue, noFilters, 'github').include).toBe(true);
		expect(shouldIncludeWithFilters(pr, noFilters, 'github').include).toBe(true);
	});

	test('onlyClosedIssues active → issues included, PRs excluded', () => {
		const flags = { ...noFilters, onlyClosedIssues: true };
		const issue = makeIssue({ state: 'closed', closed_at: '2026-04-15T14:00:00Z' });
		const pr = makePR();

		const issueResult = shouldIncludeWithFilters(issue, flags, 'github');
		const prResult = shouldIncludeWithFilters(pr, flags, 'github');

		expect(issueResult.include).toBe(true);
		expect(prResult.include).toBe(false);
	});
});

describe('onlyClosedIssues filter – closed_at date range (filterClosedIssue)', () => {
	const start = new Date('2026-04-10T00:00:00Z');
	const end = new Date('2026-04-17T23:59:59Z');

	test('filter disabled → all issues pass', () => {
		const openIssue = makeIssue({ state: 'open' });
		expect(filterClosedIssue(openIssue, false, start, end)).toBe(true);
	});

	test('open issue rejected when filter active', () => {
		const openIssue = makeIssue({ state: 'open' });
		expect(filterClosedIssue(openIssue, true, start, end)).toBe(false);
	});

	test('closed issue within date range → included', () => {
		const issue = makeIssue({
			state: 'closed',
			closed_at: '2026-04-15T14:00:00Z',
		});
		expect(filterClosedIssue(issue, true, start, end)).toBe(true);
	});

	test('closed issue BEFORE date range → excluded', () => {
		const issue = makeIssue({
			state: 'closed',
			closed_at: '2026-04-09T23:59:59Z',
		});
		expect(filterClosedIssue(issue, true, start, end)).toBe(false);
	});

	test('closed issue AFTER date range → excluded', () => {
		const issue = makeIssue({
			state: 'closed',
			closed_at: '2026-04-18T00:00:01Z',
		});
		expect(filterClosedIssue(issue, true, start, end)).toBe(false);
	});

	test('closed issue exactly at start boundary → included', () => {
		const issue = makeIssue({
			state: 'closed',
			closed_at: '2026-04-10T00:00:00Z',
		});
		expect(filterClosedIssue(issue, true, start, end)).toBe(true);
	});

	test('closed issue exactly at end boundary → included', () => {
		const issue = makeIssue({
			state: 'closed',
			closed_at: '2026-04-17T23:59:59Z',
		});
		expect(filterClosedIssue(issue, true, start, end)).toBe(true);
	});
});

describe('onlyClosedIssues – mutual exclusivity normalization', () => {
	test('onlyClosedIssues + onlyPRs → onlyPRs disabled', () => {
		const result = normalizeMutualExclusivity({
			onlyIssues: false, onlyPRs: true, onlyRevPRs: false,
			onlyMergedPRs: false, onlyClosedIssues: true,
		});
		expect(result.onlyClosedIssues).toBe(true);
		expect(result.onlyPRs).toBe(false);
	});

	test('onlyClosedIssues + onlyPRs + onlyMergedPRs → both PR flags disabled', () => {
		const result = normalizeMutualExclusivity({
			onlyIssues: false, onlyPRs: true, onlyRevPRs: false,
			onlyMergedPRs: true, onlyClosedIssues: true,
		});
		expect(result.onlyClosedIssues).toBe(true);
		expect(result.onlyPRs).toBe(false);
		expect(result.onlyMergedPRs).toBe(false);
	});

	test('no conflicts → nothing changes', () => {
		const input = {
			onlyIssues: false, onlyPRs: true, onlyRevPRs: false,
			onlyMergedPRs: false, onlyClosedIssues: false,
		};
		const result = normalizeMutualExclusivity(input);
		expect(result).toEqual(input);
	});
});

describe('onlyClosedIssues – end-to-end filtering pipeline', () => {
	const start = new Date('2026-04-10T00:00:00Z');
	const end = new Date('2026-04-17T23:59:59Z');

	function runPipeline(items, flags, platform = 'github') {
		const normalized = normalizeMutualExclusivity(flags);
		return items.filter((item) => {
			const { include, isMR } = shouldIncludeWithFilters(item, normalized, platform);
			if (!include) return false;
			if (!isMR) {
				return filterClosedIssue(item, normalized.onlyClosedIssues, start, end);
			}
			return true;
		});
	}

	test('mixed items with onlyClosedIssues → only closed issues in range survive', () => {
		const items = [
			makePR({ number: 1 }),
			makeIssue({ number: 2, state: 'open' }),
			makeIssue({ number: 3, state: 'closed', closed_at: '2026-04-12T08:00:00Z' }),
			makeIssue({ number: 4, state: 'closed', closed_at: '2026-04-01T08:00:00Z' }),
			makeIssue({ number: 5, state: 'closed', closed_at: '2026-04-17T23:59:58Z' }), 
		];
		const flags = {
			onlyIssues: false, onlyPRs: false, onlyRevPRs: false,
			onlyMergedPRs: false, onlyClosedIssues: true,
		};
		const result = runPipeline(items, flags);
		expect(result.map((i) => i.number)).toEqual([3, 5]);
	});

	test('no filters → all items pass', () => {
		const items = [makePR(), makeIssue(), makeIssue({ state: 'closed', closed_at: '2026-04-12T08:00:00Z' })];
		const flags = {
			onlyIssues: false, onlyPRs: false, onlyRevPRs: false,
			onlyMergedPRs: false, onlyClosedIssues: false,
		};
		const result = runPipeline(items, flags);
		expect(result).toHaveLength(3);
	});

	test('onlyClosedIssues + onlyPRs conflict → onlyPRs suppressed, only closed issues remain', () => {
		const items = [
			makePR({ number: 1 }),
			makeIssue({ number: 2, state: 'closed', closed_at: '2026-04-15T12:00:00Z' }),
		];
		const flags = {
			onlyIssues: false, onlyPRs: true, onlyRevPRs: false,
			onlyMergedPRs: false, onlyClosedIssues: true,
		};
		const result = runPipeline(items, flags);
		expect(result.map((i) => i.number)).toEqual([2]);
	});
});
