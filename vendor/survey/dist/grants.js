import { z } from 'zod';
// Portable form data: hosts resolve optional external IDs; this package never writes funding records.
const key = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/).refine(value => !['__proto__', 'constructor', 'prototype'].includes(value));
const label = z.object({ en: z.string().trim().min(1).max(255), fr: z.string().trim().min(1).max(255) }).strict();
const externalId = z.string().regex(/^[1-9]\d{0,18}$/);
export const grantOptionSchema = z.object({ id: key, label, gcsId: externalId.optional() }).strict();
const unique = (values) => new Set(values.map(value => value.id)).size === values.length;
const options = z.array(grantOptionSchema).max(200).refine(unique, 'Option IDs must be unique');
export const grantSourceSchema = z.object({
    mode: z.enum(['custom', 'stream']),
    agencyId: externalId.optional(), streamId: externalId.optional(), capturedAt: z.iso.datetime().optional()
}).strict().refine(source => source.mode !== 'stream' || Boolean(source.agencyId && source.streamId && source.capturedAt), 'Stream snapshots need source identity and capture time');
const calculation = z.object({
    mode: z.enum(['manual', 'category', 'all_other']), sourceCategoryId: key.nullable(),
    percentage: z.number().min(0).max(100).refine(value => /^\d+(?:\.\d{1,2})?$/.test(String(value))).nullable(),
    allowOverride: z.boolean()
}).strict().refine(value => value.mode === 'manual'
    ? value.sourceCategoryId === null && value.percentage === null && !value.allowOverride
    : value.percentage !== null && (value.mode === 'category') === (value.sourceCategoryId !== null), 'Invalid calculation settings');
export const budgetConfigSchema = z.object({
    source: grantSourceSchema, maxRows: z.number().int().min(1).max(100),
    categories: options, fiscalYears: options,
    currencies: z.array(z.enum(['CAD', 'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'NZD'])).min(1).max(8).refine(values => new Set(values).size === values.length),
    costItems: z.array(grantOptionSchema.extend({ categoryId: key, calculation,
        costSharingRatio: z.number().min(-999.99).max(999.99).refine(value => /^-?\d+(?:\.\d{1,2})?$/.test(String(value))).nullable().optional() }).strict()).max(200).refine(unique, 'Cost item IDs must be unique'),
    fundingTypes: z.array(grantOptionSchema.extend({ stacking: z.boolean(), costSharing: z.boolean() }).strict()).max(100).refine(unique, 'Funding type IDs must be unique'),
    fundingSubtypes: z.array(grantOptionSchema.extend({ typeId: key }).strict()).max(200).refine(unique, 'Funding subtype IDs must be unique')
}).strict().superRefine((config, ctx) => {
    const fail = (message) => ctx.addIssue({ code: 'custom', message });
    for (const item of config.costItems) {
        if (!config.categories.some(category => category.id === item.categoryId))
            fail('Unknown cost category');
        if (item.calculation.mode === 'category') {
            const source = item.calculation.sourceCategoryId;
            if (source === item.categoryId || !config.categories.some(category => category.id === source)
                || config.costItems.some(other => other.categoryId === source && other.calculation.mode !== 'manual'))
                fail('Percentage sources must be another manual category');
        }
    }
    for (const subtype of config.fundingSubtypes)
        if (!config.fundingTypes.some(type => type.id === subtype.typeId))
            fail('Unknown funding type');
});
export const activityConfigSchema = z.object({
    source: grantSourceSchema, maxRows: z.number().int().min(1).max(100),
    outcomes: options, responsibleParties: options,
    requireOutcomes: z.boolean(), requireResponsibleParties: z.boolean(), bilingual: z.boolean()
}).strict();
export const emptyBudgetConfig = () => ({
    source: { mode: 'custom' }, maxRows: 50, currencies: ['CAD'], categories: [], fiscalYears: [],
    costItems: [], fundingTypes: [], fundingSubtypes: []
});
export const emptyActivityConfig = () => ({
    source: { mode: 'custom' }, maxRows: 50, outcomes: [], responsibleParties: [],
    requireOutcomes: true, requireResponsibleParties: true, bilingual: false
});
const rowId = z.string().regex(/^r_[a-zA-Z0-9_-]{1,40}$/);
const text = z.string().max(5000);
const pair = z.object({ en: text, fr: text }).strict();
// Partial values are retained in drafts; submit checks required content separately.
const fundingRow = z.object({ id: rowId, subtypeId: z.string().max(64), amount: z.string().max(30),
    description: pair }).strict();
export const budgetAnswerSchema = z.object({ version: z.literal(1), rows: z.array(z.object({
        id: rowId, fiscalYearId: z.string().max(64), costItemId: z.string().max(64),
        subsection: z.string().max(255), description: text, currency: z.string().max(3),
        totalCost: z.string().max(30), programFunding: z.string().max(30), percentage: z.string().max(6),
        otherFunding: z.array(fundingRow).max(50).refine(unique, 'Funding row IDs must be unique')
    }).strict()).max(100).refine(unique, 'Row IDs must be unique') }).strict();
export const activityAnswerSchema = z.object({ version: z.literal(1), rows: z.array(z.object({
        id: rowId, name: pair, description: pair, expectedResults: pair,
        startDate: z.string().max(10), endDate: z.string().max(10),
        outcomeIds: z.array(z.string().max(64)).max(200).refine(values => new Set(values).size === values.length),
        responsiblePartyIds: z.array(z.string().max(64)).max(200).refine(values => new Set(values).size === values.length)
    }).strict()).max(100).refine(unique, 'Row IDs must be unique') }).strict();
export const readBudgetAnswer = (raw) => {
    try {
        return budgetAnswerSchema.parse(JSON.parse(raw));
    }
    catch {
        return null;
    }
};
export const readActivityAnswer = (raw) => {
    try {
        return activityAnswerSchema.parse(JSON.parse(raw));
    }
    catch {
        return null;
    }
};
const ZERO = BigInt(0);
export const moneyCents = (value) => {
    if (!/^-?(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value))
        throw new Error('Invalid money');
    const negative = value.startsWith('-');
    const [units = '0', fraction = ''] = (negative ? value.slice(1) : value).split('.');
    const cents = BigInt(units) * BigInt(100) + BigInt(fraction.padEnd(2, '0'));
    if (cents > BigInt('9999999999999999999'))
        throw new Error('Money exceeds numeric(19,2)');
    return negative ? -cents : cents;
};
export const centsText = (value) => {
    const negative = value < ZERO;
    const absolute = negative ? -value : value;
    return `${negative ? '-' : ''}${absolute / BigInt(100)}.${String(absolute % BigInt(100)).padStart(2, '0')}`;
};
const percentageHundredths = (value) => {
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value) || Number(value) > 100)
        throw new Error('Invalid percentage');
    return moneyCents(value);
};
/** Matches GCS: category charges first, all-other second; program funding only; nearest dollar. */
export const calculateBudget = (config, rows) => {
    const result = rows.map(row => ({ ...row, otherFunding: row.otherFunding.map(source => ({ ...source })) }));
    for (const mode of ['category', 'all_other'])
        for (const row of result) {
            const item = config.costItems.find(option => option.id === row.costItemId);
            if (!item || item.calculation.mode !== mode)
                continue;
            const group = result.filter(other => other.fiscalYearId === row.fiscalYearId && other.currency === row.currency);
            if (mode === 'all_other' && group.filter(other => config.costItems.find(option => option.id === other.costItemId)?.calculation.mode === mode).length > 1)
                throw new Error('Duplicate all-other charge');
            const sources = group.filter(other => other.id !== row.id && (mode === 'all_other'
                || config.costItems.find(option => option.id === other.costItemId)?.categoryId === item.calculation.sourceCategoryId));
            const base = sources.reduce((total, source) => total + (source.programFunding === '' ? ZERO : moneyCents(source.programFunding)), ZERO);
            const percentage = item.calculation.allowOverride && row.percentage !== '' ? row.percentage : String(item.calculation.percentage);
            const numerator = base * percentageHundredths(percentage);
            const absolute = numerator < ZERO ? -numerator : numerator;
            const rounded = ((absolute + BigInt(500000)) / BigInt(1000000)) * BigInt(100);
            const amount = numerator < ZERO ? -rounded : rounded;
            if ((amount < ZERO ? -amount : amount) > BigInt('9999999999999999999'))
                throw new Error('Calculated funding exceeds numeric(19,2)');
            row.programFunding = centsText(amount);
        }
    return result;
};
export const newBudgetRow = (id, config) => ({
    id, fiscalYearId: config.fiscalYears.length === 1 ? config.fiscalYears[0].id : '', costItemId: '',
    subsection: '', description: '', currency: config.currencies[0], totalCost: '', programFunding: '', percentage: '', otherFunding: []
});
export const newActivityRow = (id) => ({ id, name: { en: '', fr: '' },
    description: { en: '', fr: '' }, expectedResults: { en: '', fr: '' }, startDate: '', endDate: '',
    outcomeIds: [], responsiblePartyIds: [] });
const calendar = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !value.startsWith('0000-')
    && Number.isFinite(new Date(`${value}T00:00:00Z`).getTime()) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
export const grantIssues = (question, raw, mode = 'submit') => {
    const answer = raw ? question.type === 'budget' ? readBudgetAnswer(raw) : readActivityAnswer(raw) : { version: 1, rows: [] };
    if (!answer)
        return [{ path: '', code: 'choice' }];
    const issues = [];
    const add = (path, code) => issues.push({ path, code });
    if (answer.rows.length > question.config.maxRows)
        add('', 'length');
    if (mode === 'submit' && question.required && !answer.rows.length)
        add('', 'required');
    const required = (value, path, max = 5000) => {
        if (mode === 'submit' && !value.trim())
            add(path, 'required');
        if (value.length > max)
            add(path, 'length');
    };
    const choose = (value, allowed, path) => {
        if (!value) {
            if (mode === 'submit')
                add(path, 'required');
        }
        else if (!allowed.some(option => option.id === value))
            add(path, 'choice');
    };
    const money = (value, path) => {
        if (!value) {
            if (mode === 'submit')
                add(path, 'required');
            return null;
        }
        try {
            return moneyCents(value);
        }
        catch {
            add(path, 'money');
            return null;
        }
    };
    if (question.type === 'budget') {
        const config = question.config;
        const rows = answer.rows;
        let calculated = [];
        try {
            calculated = calculateBudget(config, rows);
        }
        catch {
            add('', 'calculation');
        }
        rows.forEach((row, index) => {
            const path = `rows.${index}`;
            choose(row.fiscalYearId, config.fiscalYears, `${path}.fiscalYearId`);
            choose(row.costItemId, config.costItems, `${path}.costItemId`);
            choose(row.currency, config.currencies.map(id => ({ id })), `${path}.currency`);
            required(row.subsection, `${path}.subsection`, 255);
            required(row.description, `${path}.description`);
            const total = money(row.totalCost, `${path}.totalCost`);
            const item = config.costItems.find(option => option.id === row.costItemId);
            if (row.percentage && (!item?.calculation.allowOverride || item.calculation.mode === 'manual'))
                add(`${path}.percentage`, 'choice');
            if (row.percentage)
                try {
                    percentageHundredths(row.percentage);
                }
                catch {
                    add(`${path}.percentage`, 'calculation');
                }
            const program = money(item?.calculation.mode === 'manual' || !item ? row.programFunding
                : calculated[index]?.programFunding ?? '', `${path}.programFunding`);
            if (item && item.calculation.mode !== 'manual' && row.programFunding && row.programFunding !== calculated[index]?.programFunding)
                add(`${path}.programFunding`, 'calculation');
            let other = ZERO;
            const subtypes = new Set();
            row.otherFunding.forEach((source, sourceIndex) => {
                const sourcePath = `${path}.otherFunding.${sourceIndex}`;
                choose(source.subtypeId, config.fundingSubtypes, `${sourcePath}.subtypeId`);
                if (source.subtypeId && subtypes.has(source.subtypeId))
                    add(`${sourcePath}.subtypeId`, 'choice');
                subtypes.add(source.subtypeId);
                const amount = money(source.amount, `${sourcePath}.amount`);
                if (amount !== null) {
                    if (amount < ZERO)
                        add(`${sourcePath}.amount`, 'negative');
                    other += amount;
                }
                if (source.description.en.length > 255 || source.description.fr.length > 255)
                    add(`${sourcePath}.description`, 'length');
            });
            if (total !== null && program !== null && program + other > total)
                add(`${path}.totalCost`, 'coverage');
        });
    }
    else {
        const config = question.config;
        answer.rows.forEach((row, index) => {
            const path = `rows.${index}`;
            for (const field of ['name', 'description', 'expectedResults']) {
                if (config.bilingual)
                    for (const language of ['en', 'fr'])
                        required(row[field][language], `${path}.${field}.${language}`, field === 'name' ? 255 : 5000);
                else {
                    if (mode === 'submit' && !row[field].en.trim() && !row[field].fr.trim())
                        add(`${path}.${field}`, 'required');
                    if (Object.values(row[field]).some(value => value.length > (field === 'name' ? 255 : 5000)))
                        add(`${path}.${field}`, 'length');
                }
            }
            for (const field of ['startDate', 'endDate']) {
                required(row[field], `${path}.${field}`);
                if (row[field] && !calendar(row[field]))
                    add(`${path}.${field}`, 'date');
            }
            if (calendar(row.startDate) && calendar(row.endDate) && row.endDate < row.startDate)
                add(`${path}.endDate`, 'range');
            for (const [field, choices, mandatory] of [
                ['outcomeIds', config.outcomes, config.requireOutcomes],
                ['responsiblePartyIds', config.responsibleParties, config.requireResponsibleParties]
            ]) {
                if (mode === 'submit' && mandatory && !row[field].length)
                    add(`${path}.${field}`, 'required');
                if (row[field].some(id => !choices.some(option => option.id === id)))
                    add(`${path}.${field}`, 'choice');
            }
        });
    }
    return issues;
};
/** Canonical response serialization recomputes derived money rather than trusting submitted totals. */
export const normalizeBudgetAnswer = (config, answer) => ({
    version: 1, rows: calculateBudget(config, answer.rows).map(row => ({ ...row,
        totalCost: row.totalCost === '' ? '' : centsText(moneyCents(row.totalCost)),
        programFunding: row.programFunding === '' ? '' : centsText(moneyCents(row.programFunding)),
        otherFunding: row.otherFunding.map(source => ({ ...source, amount: source.amount === '' ? '' : centsText(moneyCents(source.amount)) }))
    }))
});
export const grantConfigurationReady = (question) => question.type === 'budget'
    ? question.config.costItems.length > 0 && question.config.fiscalYears.length > 0
    : (!question.config.requireOutcomes || question.config.outcomes.length > 0)
        && (!question.config.requireResponsibleParties || question.config.responsibleParties.length > 0);
