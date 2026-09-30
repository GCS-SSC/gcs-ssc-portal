import { computed, toValue } from 'vue';
import { calculateBudget, grantIssues, newActivityRow, newBudgetRow, readActivityAnswer, readBudgetAnswer } from './grants.js';
import { activityFields, budgetFields, budgetTotals, fundingFields } from './grant-fields.js';
/** Host-controlled structured entry. No persistence, theme, or host translation dependency. */
export const useGrantElement = (options) => {
    const question = computed(() => toValue(options.question));
    const rows = computed(() => question.value.type === 'budget'
        ? readBudgetAnswer(toValue(options.value))?.rows ?? [] : readActivityAnswer(toValue(options.value))?.rows ?? []);
    const issues = computed(() => toValue(options.showErrors) ? grantIssues(question.value, toValue(options.value)) : []);
    const error = (index, path) => issues.value.find(issue => issue.path === `rows.${index}.${path}`
        || issue.path === `rows.${index}.${path.replace(/\.(en|fr)$/, '')}`)?.code;
    const emit = (next) => {
        if (toValue(options.disabled))
            return;
        if (question.value.type === 'budget') {
            try {
                next = calculateBudget(question.value.config, next);
            }
            catch {
                next = next.map(row => 'costItemId' in row && question.value.type === 'budget'
                    && question.value.config.costItems.find(item => item.id === row.costItemId)?.calculation.mode !== 'manual'
                    ? { ...row, programFunding: '' } : row);
            }
        }
        options.onChange(JSON.stringify({ version: 1, rows: next }));
    };
    const add = () => {
        if (rows.value.length >= question.value.config.maxRows)
            return;
        emit([...rows.value, question.value.type === 'budget' ? newBudgetRow(options.createId(), question.value.config) : newActivityRow(options.createId())]);
    };
    const remove = (id) => emit(rows.value.filter(row => row.id !== id));
    const assign = (target, path, value) => {
        const parts = path.split('.');
        let current = target;
        for (const part of parts.slice(0, -1))
            current = current[part];
        current[parts[parts.length - 1]] = value;
    };
    const change = (id, path, value) => {
        const next = structuredClone(rows.value);
        const row = next.find(item => item.id === id);
        if (!row)
            return;
        const fields = question.value.type === 'budget' ? budgetFields(question.value.config, row, toValue(options.locale))
            : activityFields(question.value.config, row, toValue(options.locale));
        if (!fields.some(field => field.path === path && !field.readonly))
            return;
        assign(row, path, value);
        if (path === 'costItemId' && 'percentage' in row) {
            row.percentage = '';
            row.programFunding = '';
        }
        emit(next);
    };
    const toggle = (id, path, value, selected) => {
        if (question.value.type !== 'activities')
            return;
        const next = structuredClone(rows.value);
        const row = next.find(item => item.id === id);
        if (!row)
            return;
        row[path] = selected ? [...new Set([...row[path], value])] : row[path].filter(item => item !== value);
        emit(next);
    };
    const addFunding = (id) => {
        if (question.value.type !== 'budget' || !question.value.config.fundingSubtypes.length)
            return;
        const next = structuredClone(rows.value);
        const row = next.find(item => item.id === id);
        if (!row || row.otherFunding.length >= 50)
            return;
        row.otherFunding.push({ id: options.createId(), subtypeId: '', amount: '', description: { en: '', fr: '' } });
        emit(next);
    };
    const changeFunding = (id, fundingId, path, value) => {
        if (question.value.type !== 'budget')
            return;
        const next = structuredClone(rows.value);
        const source = next.find(item => item.id === id)?.otherFunding.find(item => item.id === fundingId);
        if (!source || !fundingFields(question.value.config, source, toValue(options.locale)).some(field => field.path === path))
            return;
        assign(source, path, value);
        emit(next);
    };
    const removeFunding = (id, fundingId) => {
        const next = structuredClone(rows.value);
        const row = next.find(item => item.id === id);
        if (!row)
            return;
        row.otherFunding = row.otherFunding.filter(item => item.id !== fundingId);
        emit(next);
    };
    const fields = (row) => question.value.type === 'budget'
        ? budgetFields(question.value.config, row, toValue(options.locale))
        : activityFields(question.value.config, row, toValue(options.locale));
    const totals = computed(() => {
        if (question.value.type !== 'budget')
            return [];
        try {
            return budgetTotals(question.value.config, rows.value);
        }
        catch {
            return [];
        }
    });
    const categoryTotals = computed(() => {
        if (question.value.type !== 'budget')
            return [];
        try {
            return budgetTotals(question.value.config, rows.value, 'category');
        }
        catch {
            return [];
        }
    });
    return { rows, issues, error, fields, totals, categoryTotals, add, remove, change, toggle, addFunding, changeFunding, removeFunding };
};
