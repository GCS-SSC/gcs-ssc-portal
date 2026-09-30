export const instanceKey = (id, path) => [id, ...path].join('@');
export const baseQuestionId = (key) => key.split('@', 1)[0];
export const parseList = (raw, max = 50) => {
    try {
        const rows = JSON.parse(raw ?? '[]');
        if (!Array.isArray(rows) || rows.length > max)
            return [];
        const seen = new Set();
        if (!rows.every((row) => row && typeof row === 'object' &&
            /^r_[a-zA-Z0-9_-]{1,40}$/.test(row.id) && typeof row.value === 'string' && row.value.length <= 500 &&
            !seen.has(row.id) && Boolean(seen.add(row.id))))
            return [];
        return rows;
    }
    catch {
        return [];
    }
};
export const parseTable = (raw, max = 100) => {
    try {
        const rows = JSON.parse(raw ?? '[]');
        if (!Array.isArray(rows) || rows.length > max)
            return [];
        const seen = new Set();
        if (!rows.every((row) => row && typeof row === 'object' &&
            /^r_[a-zA-Z0-9_-]{1,40}$/.test(row.id) && !seen.has(row.id) && Boolean(seen.add(row.id)) &&
            row.cells && typeof row.cells === 'object' && !Array.isArray(row.cells) &&
            Object.values(row.cells).every((cell) => typeof cell === 'string' && cell.length <= 500)))
            return [];
        return rows;
    }
    catch {
        return [];
    }
};
/** Multiple choices retain stable option IDs, never display labels. */
export const parseChoices = (raw) => {
    try {
        const value = JSON.parse(raw || '[]');
        return Array.isArray(value) && value.length <= 50 && value.every(item => typeof item === 'string')
            && new Set(value).size === value.length ? value : [];
    }
    catch {
        return [];
    }
};
export const tableTotalsMode = (question) => question.totals ?? 'none';
/** Decimal addition avoids floating-point rounding; invalid cells make the affected total unavailable. */
const sumCells = (cells) => {
    const values = cells.filter(value => value.trim());
    if (values.some(value => !/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value) || !Number.isFinite(Number(value))))
        return null;
    const scale = Math.max(0, ...values.map(value => (value.split('.')[1] ?? '').length));
    const total = values.reduce((sum, value) => {
        const negative = value.startsWith('-');
        const [whole, fraction = ''] = value.replace(/^-/, '').split('.');
        const scaled = BigInt(`${whole || '0'}${fraction.padEnd(scale, '0')}`);
        return sum + (negative ? -scaled : scaled);
    }, BigInt(0));
    const negative = total < BigInt(0);
    const digits = (negative ? -total : total).toString().padStart(scale + 1, '0');
    const result = scale ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}`.replace(/0+$/, '').replace(/\.$/, '') : digits;
    return `${negative ? '-' : ''}${result}`;
};
export const tableTotals = (question, rows) => {
    const columns = question.columns.filter(column => column.type === 'number');
    return { rows: Object.fromEntries(rows.map(row => [row.id, sumCells(columns.map(column => row.cells[column.id] ?? ''))])),
        columns: Object.fromEntries(columns.map(column => [column.id, sumCells(rows.map(row => row.cells[column.id] ?? ''))])) };
};
export const sourceKey = (id, path, active) => {
    for (let length = path.length; length >= 0; length--) {
        const key = instanceKey(id, path.slice(0, length));
        if (active.has(key))
            return key;
    }
    return undefined;
};
const valueFor = (question, key, answers) => {
    if (question.type === 'checkboxes' || question.type === 'multiselect')
        return parseChoices(answers[key]).join(', ');
    if (question.type === 'repeat') {
        const count = parseList(answers[key]).length;
        return count ? String(count) : '';
    }
    if (question.type === 'list')
        return parseList(answers[key]).map((item) => item.value).join(', ');
    if (question.type === 'budget' || question.type === 'activities') {
        try {
            return JSON.parse(answers[key] ?? '{}').rows?.length ? 'answered' : '';
        }
        catch {
            return '';
        }
    }
    return answers[key] ?? '';
};
export const computedValue = (question, path, answers, active, questions) => question.template.replace(/\{\{([a-zA-Z][a-zA-Z0-9_-]{0,63})\}\}/g, (_, id) => {
    if (!question.sourceIds.includes(id))
        return '';
    const key = sourceKey(id, path, active);
    const source = questions.get(id);
    return key && source ? valueFor(source, key, answers) : '';
});
/** Conditions in a repeated group resolve against the nearest repeated instance. */
export const matchesAdvancedCondition = (condition, path, answers, active, questions) => {
    const results = condition.conditions.map((predicate) => {
        const key = sourceKey(predicate.questionId, path, active);
        if (!key)
            return false;
        const question = questions.get(predicate.questionId);
        const value = question?.type === 'computed'
            ? computedValue(question, path, answers, active, questions)
            : question ? valueFor(question, key, answers) : '';
        if (predicate.operator === 'answered')
            return Boolean(value.trim());
        if (predicate.operator === 'notAnswered')
            return !value.trim();
        if (!value.trim())
            return false;
        switch (predicate.operator) {
            case 'equals': return value === predicate.value;
            case 'notEquals': return value !== predicate.value;
            case 'contains': return question?.type === 'checkboxes' || question?.type === 'multiselect' ? parseChoices(answers[key]).includes(predicate.value) : value.includes(predicate.value);
            case 'greaterThan': return Number.isFinite(Number(value)) && Number(value) > Number(predicate.value);
            case 'lessThan': return Number.isFinite(Number(value)) && Number(value) < Number(predicate.value);
        }
    });
    return condition.match === 'all' ? results.every(Boolean) : results.some(Boolean);
};
export const resolveAdvancedSurvey = (definition, answers) => {
    const questions = new Map(definition.questions.map((question) => [question.id, question]));
    const active = new Set();
    const pages = [];
    const visible = (when, path) => !when || matchesAdvancedCondition(when, path, answers, active, questions);
    const include = (ids, path) => ids.flatMap((id) => {
        const question = questions.get(id);
        if (!question || !visible(question.visibleWhen, path))
            return [];
        const key = instanceKey(id, path);
        active.add(key);
        return [key];
    });
    const groups = (definitions, path) => definitions.flatMap((group) => {
        if (!visible(group.visibleWhen, path))
            return [];
        const entries = group.repeatFor ? (() => {
            const key = sourceKey(group.repeatFor, path, active);
            const source = questions.get(group.repeatFor);
            return key ? parseList(answers[key], source.maxItems)
                .map((item, index) => ({ path: [...path, item.id], item: source.type === 'repeat' ? { ...item, value: String(index + 1) } : item })) : [];
        })() : [{ path, item: undefined }];
        return entries.map(({ path: currentPath, item }) => ({ ...group,
            title: item ? { en: group.title.en.replaceAll('{{item}}', item.value),
                fr: group.title.fr.replaceAll('{{item}}', item.value) } : group.title,
            instanceId: item?.id, instanceLabel: item?.value,
            questionIds: include(group.questionIds, currentPath),
            groups: groups(group.groups, currentPath)
        }));
    });
    let index = 0;
    while (index < definition.pages.length) {
        const page = definition.pages[index];
        const questionIds = include(page.questionIds, []);
        const resolvedGroups = groups(page.groups, []);
        const allIds = (nested) => nested.flatMap((group) => [...group.questionIds, ...allIds(group.groups)]);
        pages.push({ ...page, questionIds, groups: resolvedGroups, sections: [],
            activeQuestionIds: [...questionIds, ...allIds(resolvedGroups)] });
        const target = page.branches.find((branch) => visible(branch.when, []))?.destination ?? page.next;
        if (target?.kind === 'end')
            break;
        const nextIndex = target?.kind === 'page'
            ? definition.pages.findIndex((candidate) => candidate.id === target.pageId) : index + 1;
        if (nextIndex <= index)
            throw new Error('Invalid forward survey route');
        index = nextIndex;
    }
    const retained = Object.create(null);
    for (const key of active) {
        const question = questions.get(baseQuestionId(key));
        if (question?.type !== 'computed' && Object.hasOwn(answers, key))
            retained[key] = answers[key];
    }
    return { pages, questionIds: [...active], answers: retained };
};
