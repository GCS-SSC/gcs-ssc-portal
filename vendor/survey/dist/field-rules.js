import { z } from 'zod';
import { baseQuestionId, instanceKey, matchesAdvancedCondition, parseChoices, parseList, parseTable, sourceKey } from './advanced.js';
import { readActivityAnswer, readBudgetAnswer } from './grants.js';
import { compareDecimal, isCalendarDate } from './values.js';
const scalarTypes = ['text', 'textarea', 'email', 'number', 'date', 'select'];
const textTypes = ['text', 'textarea', 'email'];
const numeric = (value) => /^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value) && Number.isFinite(Number(value));
const compatible = (a, b) => a.type === b.type || textTypes.includes(a.type) && textTypes.includes(b.type);
const validLiteral = (type, value) => type === 'number' ? numeric(value) : type === 'date' ? isCalendarDate(value) : type === 'email' ? z.email().safeParse(value).success : Boolean(value.trim());
const rulesFor = (subject) => 'rules' in subject ? subject.rules ?? [] : [];
const distinct = (values) => new Set(values).size === values.length;
/** Validate rule compatibility while the model walks its canonical placement order. */
export const validateFieldRules = (question, questionIndex, scope, questions, placed, accessible, checkCondition, fail) => {
    const check = (subject, columnIndex) => {
        const isColumn = columnIndex !== undefined;
        const basePath = ['questions', questionIndex, ...(isColumn ? ['columns', columnIndex] : [])];
        const boundsByKind = new Map();
        const checkSource = (id, expectedType) => {
            const source = questions.get(id);
            return placed.has(id) && accessible(id, scope) && source && (!expectedType || source.type === expectedType);
        };
        for (const [index, rule] of rulesFor(subject).entries()) {
            const bad = (message) => fail(message, [...basePath, 'rules', index]);
            if (isColumn && !['compare', 'length', 'precision', 'format'].includes(rule.kind)) {
                bad('Table columns support comparison, length, precision and format rules');
                continue;
            }
            switch (rule.kind) {
                case 'required':
                    checkCondition(rule.when, scope);
                    break;
                case 'precision':
                    if (subject.type !== 'number')
                        bad('Precision requires a number question');
                    break;
                case 'format':
                    if (!['text', 'textarea'].includes(subject.type))
                        bad('Format rules require text');
                    break;
                case 'length':
                case 'count': {
                    let cap;
                    if (rule.kind === 'length' && ['text', 'textarea'].includes(subject.type))
                        cap = 'maxLength' in subject ? subject.maxLength : 500;
                    if (rule.kind === 'count') {
                        if (subject.type === 'list' || subject.type === 'repeat')
                            cap = 'maxItems' in subject ? subject.maxItems : undefined;
                        if (subject.type === 'table')
                            cap = 'maxRows' in subject ? subject.maxRows : undefined;
                        if (subject.type === 'checkboxes' || subject.type === 'multiselect')
                            cap = 'options' in subject ? subject.options.length : undefined;
                        if (subject.type === 'budget' || subject.type === 'activities')
                            cap = 'config' in subject ? subject.config.maxRows : undefined;
                    }
                    if (cap === undefined) {
                        bad('Rule is incompatible with this question type');
                        break;
                    }
                    if ((rule.min ?? 0) > cap || (rule.max ?? 0) > cap)
                        bad('Rule exceeds question capacity');
                    const prior = boundsByKind.get(rule.kind) ?? { min: 0, max: cap };
                    prior.min = Math.max(prior.min, rule.min ?? 0);
                    prior.max = Math.min(prior.max, rule.max ?? cap);
                    boundsByKind.set(rule.kind, prior);
                    if (prior.min > prior.max)
                        bad('Rules have contradictory bounds');
                    break;
                }
                case 'compare': {
                    if (![...textTypes, 'number', 'date'].includes(subject.type))
                        bad('Comparisons require text, email, number or date');
                    if (!['number', 'date'].includes(subject.type) && !['equals', 'notEquals'].includes(rule.operator))
                        bad('Text comparisons only support matching or differing answers');
                    if (rule.target.kind === 'value') {
                        if (!validLiteral(subject.type, rule.target.value))
                            bad('Rule requires a valid typed literal');
                    }
                    else if (rule.target.kind === 'column') {
                        const columnId = rule.target.columnId;
                        const source = question.type === 'table' ? question.columns.find(column => column.id === columnId) : undefined;
                        if (!isColumn || !source || question.type !== 'table' || question.columns.indexOf(source) >= columnIndex || !compatible(source, subject))
                            bad('Column rules need an earlier compatible column in the same row');
                    }
                    else if (rule.target.kind === 'today') {
                        if (isColumn || subject.type !== 'date')
                            bad('Today comparisons require a date question');
                    }
                    else {
                        const source = questions.get(rule.target.questionId);
                        if (isColumn || !checkSource(rule.target.questionId) || !source || !compatible(source, subject))
                            bad('Rules must reference an earlier accessible compatible question');
                        if (rule.target.offsetDays !== undefined && subject.type !== 'date')
                            bad('Day offsets require date questions');
                    }
                    break;
                }
                case 'choice': {
                    if (!['select', 'checkboxes', 'multiselect'].includes(subject.type) || !('options' in subject) || !subject.options.some(option => option.value === rule.value))
                        bad('Required choice must name an available option');
                    break;
                }
                case 'group': {
                    if (!rule.questionIds.includes(question.id))
                        bad('Answer groups must include this question');
                    for (const id of rule.questionIds) {
                        const source = questions.get(id);
                        if (id !== question.id && !checkSource(id) || !source || source.type === 'computed')
                            bad('Answer groups need current or earlier accessible editable questions');
                    }
                    break;
                }
                case 'unique': {
                    if (!['list', 'repeat', 'table'].includes(subject.type))
                        bad('Uniqueness requires a list, repeat or table');
                    if (subject.type === 'table') {
                        if (rule.questionIds || rule.columnIds && (!distinct(rule.columnIds) || !rule.columnIds.every(id => 'columns' in subject && subject.columns.some(column => column.id === id))))
                            bad('Table uniqueness needs distinct existing column IDs');
                    }
                    else if (subject.type === 'repeat') {
                        if (rule.columnIds || !rule.questionIds || !distinct(rule.questionIds))
                            bad('Repeat uniqueness needs distinct child question IDs');
                    }
                    else if (rule.columnIds || rule.questionIds)
                        bad('List uniqueness compares item values');
                    break;
                }
                case 'total': {
                    if (subject.type !== 'table' || !('columns' in subject) || !distinct(rule.columnIds) || !rule.columnIds.every(id => subject.columns.some(column => column.id === id && column.type === 'number')))
                        bad('Totals need distinct numeric table columns');
                    if (rule.target.kind === 'value' ? !numeric(rule.target.value) : !checkSource(rule.target.questionId, 'number'))
                        bad('Total target must be a decimal or earlier accessible number question');
                    break;
                }
            }
        }
        const compare = (a, b) => subject.type === 'number' ? compareDecimal(a, b) : a < b ? -1 : a > b ? 1 : 0;
        const comparisons = rulesFor(subject).filter((rule) => rule.kind === 'compare' && rule.target.kind === 'value');
        let lower, upper, equal;
        const excluded = [];
        for (const rule of comparisons) {
            if (rule.target.kind !== 'value' || !validLiteral(subject.type, rule.target.value))
                continue;
            const literal = rule.target.value;
            if (rule.operator === 'equals') {
                if (equal !== undefined && compare(equal, literal) !== 0)
                    fail('Rules have contradictory comparisons', [...basePath, 'rules']);
                equal = literal;
            }
            if (rule.operator === 'notEquals')
                excluded.push(literal);
            if (rule.operator === 'greaterThan' || rule.operator === 'greaterThanOrEqual') {
                const inclusive = rule.operator === 'greaterThanOrEqual';
                if (!lower || compare(literal, lower.value) > 0 || compare(literal, lower.value) === 0 && !inclusive)
                    lower = { value: literal, inclusive };
            }
            if (rule.operator === 'lessThan' || rule.operator === 'lessThanOrEqual') {
                const inclusive = rule.operator === 'lessThanOrEqual';
                if (!upper || compare(literal, upper.value) < 0 || compare(literal, upper.value) === 0 && !inclusive)
                    upper = { value: literal, inclusive };
            }
        }
        if (lower && upper && (compare(lower.value, upper.value) > 0 || compare(lower.value, upper.value) === 0 && (!lower.inclusive || !upper.inclusive)))
            fail('Rules have contradictory comparisons', [...basePath, 'rules']);
        if (equal !== undefined && (excluded.some(value => compare(value, equal) === 0) || lower && (compare(equal, lower.value) < 0 || compare(equal, lower.value) === 0 && !lower.inclusive) || upper && (compare(equal, upper.value) > 0 || compare(equal, upper.value) === 0 && !upper.inclusive)))
            fail('Rules have contradictory comparisons', [...basePath, 'rules']);
    };
    check(question);
    if (question.type === 'table')
        question.columns.forEach((column, index) => check(column, index));
};
/** Repeat uniqueness deliberately references child definitions, which become known after traversal. */
export const validateUniqueReferences = (questions, scopes, fail) => {
    questions.forEach((question, index) => {
        if (question.type !== 'repeat')
            return;
        for (const [ruleIndex, rule] of rulesFor(question).entries()) {
            if (rule.kind !== 'unique' || !rule.questionIds)
                continue;
            const owner = scopes.get(question.id) ?? [];
            for (const id of rule.questionIds) {
                const child = questions.find(item => item.id === id), scope = scopes.get(id);
                if (!child || !scalarTypes.includes(child.type) || !scope || scope.length !== owner.length + 1 || scope[owner.length] !== question.id || !owner.every((part, at) => scope[at] === part))
                    fail('Repeat uniqueness requires directly repeated scalar child questions', ['questions', index, 'rules', ruleIndex]);
            }
        }
    });
};
export const isConditionallyRequired = (question, key, answers, active, questions) => question.required || rulesFor(question).some(rule => rule.kind === 'required' && matchesAdvancedCondition(rule.when, key.split('@').slice(1), answers, active, questions, true));
/** Native required indicators include entry/choice requirements without changing rule error grouping. */
export const isFieldRequired = (question, key, answers, active, questions) => {
    if (isConditionallyRequired(question, key, answers, active, questions) || rulesFor(question).some(rule => rule.kind === 'choice' || rule.kind === 'count' && (rule.min ?? 0) > 0))
        return true;
    for (const owner of questions.values())
        for (const rule of rulesFor(owner)) {
            if (rule.kind !== 'group' || !rule.questionIds.includes(question.id) || !['all', 'allOrNone'].includes(rule.mode))
                continue;
            for (const ownerKey of active) {
                if (baseQuestionId(ownerKey) !== owner.id)
                    continue;
                const path = ownerKey.split('@').slice(1);
                const keys = rule.questionIds.map(id => sourceKey(id, path, active)).filter((id) => Boolean(id));
                if (keys.includes(key) && (rule.mode === 'all' || keys.some(id => answerCount(questions.get(baseQuestionId(id)), answers[id] ?? '') > 0)))
                    return true;
            }
        }
    return false;
};
const answerCount = (question, value) => {
    if (question.type === 'checkboxes' || question.type === 'multiselect')
        return parseChoices(value).length;
    if (question.type === 'list' || question.type === 'repeat')
        return parseList(value, question.maxItems).length;
    if (question.type === 'table')
        return parseTable(value, question.maxRows).length;
    if (question.type === 'budget')
        return readBudgetAnswer(value)?.rows.length ?? 0;
    if (question.type === 'activities')
        return readActivityAnswer(value)?.rows.length ?? 0;
    return value.trim() ? 1 : 0;
};
const normalize = (type, value) => {
    if (type !== 'number')
        return value.trim();
    const [whole, fraction = ''] = value.replace(/^-/, '').split('.');
    const normalized = `${(whole || '0').replace(/^0+(?=\d)/, '')}${fraction.replace(/0+$/, '') ? `.${fraction.replace(/0+$/, '')}` : ''}`;
    return `${value.startsWith('-') && normalized !== '0' ? '-' : ''}${normalized}`;
};
const matchesFormat = (value, format) => {
    if (format === 'url') {
        try {
            const url = new URL(value);
            return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password;
        }
        catch {
            return false;
        }
    }
    if (format === 'postalCode')
        return /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] ?\d[ABCEGHJ-NPRSTV-Z]\d$/i.test(value);
    if (format === 'phone')
        return /^\+?[\d ()-]+$/.test(value) && value.replace(/\D/g, '').length >= 7 && value.replace(/\D/g, '').length <= 15;
    return /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value);
};
const offsetDate = (value, days) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    const result = date.toISOString().slice(0, 10);
    return isCalendarDate(result) ? result : undefined;
};
const comparisonPasses = (operator, type, a, b) => {
    const order = type === 'number' ? compareDecimal(a, b) : a < b ? -1 : a > b ? 1 : 0;
    return { equals: order === 0, notEquals: order !== 0, greaterThan: order > 0, greaterThanOrEqual: order >= 0, lessThan: order < 0, lessThanOrEqual: order <= 0 }[operator];
};
/** One evaluator serves all hosts; it receives only values that passed the original type checks. */
export const evaluateFieldRules = (definition, answers, mode, baseErrors, active, options) => {
    const today = options.today === undefined ? new Date().toISOString().slice(0, 10) : options.today;
    if (typeof today !== 'string' || !isCalendarDate(today))
        throw new Error('Rule evaluation date must be a real YYYY-MM-DD calendar date');
    const failures = Object.create(null);
    const questions = new Map(definition.questions.map(question => [question.id, question]));
    const check = (question, key, subject, value, row) => {
        const path = key.split('@').slice(1);
        for (const rule of rulesFor(subject)) {
            const failure = { rule, type: subject.type, ...(row ? { row: row.number, columnLabel: subject.label } : {}) };
            let invalid = false;
            switch (rule.kind) {
                case 'required': break;
                case 'length':
                case 'count': {
                    const length = rule.kind === 'count' ? answerCount(question, value) : value.length;
                    if (rule.max !== undefined && length > rule.max) {
                        invalid = true;
                        failure.bound = 'max';
                    }
                    else if (mode === 'submit' && (rule.kind === 'count' || value.trim()) && rule.min !== undefined && length < rule.min) {
                        invalid = true;
                        failure.bound = 'min';
                    }
                    break;
                }
                case 'precision':
                    invalid = Boolean(value.trim()) && (value.split('.')[1] ?? '').replace(/0+$/, '').length > rule.decimalPlaces;
                    break;
                case 'format':
                    invalid = Boolean(value.trim()) && !matchesFormat(value, rule.format);
                    break;
                case 'compare': {
                    if (!value.trim())
                        break;
                    let target;
                    if (rule.target.kind === 'value')
                        target = rule.target.value;
                    if (rule.target.kind === 'today') {
                        target = offsetDate(today, rule.target.offsetDays ?? 0);
                        failure.targetLabel = { en: `today (UTC)${rule.target.offsetDays ? ` ${rule.target.offsetDays > 0 ? '+' : ''}${rule.target.offsetDays} days` : ''}`, fr: `aujourd’hui (UTC)${rule.target.offsetDays ? ` ${rule.target.offsetDays > 0 ? '+' : ''}${rule.target.offsetDays} jours` : ''}` };
                    }
                    if (rule.target.kind === 'column' && row && question.type === 'table') {
                        const columnId = rule.target.columnId;
                        const column = question.columns.find(column => column.id === columnId);
                        target = row.cells[rule.target.columnId] ?? '';
                        if (!column || !validLiteral(column.type, target))
                            break;
                        failure.targetLabel = column.label;
                    }
                    if (rule.target.kind === 'question') {
                        const targetKey = sourceKey(rule.target.questionId, path, active);
                        if (!targetKey || baseErrors[targetKey])
                            break;
                        target = answers[targetKey] ?? '';
                        if (!target.trim())
                            break;
                        if (rule.target.offsetDays !== undefined)
                            target = offsetDate(target, rule.target.offsetDays);
                        const label = questions.get(rule.target.questionId).label;
                        failure.targetLabel = rule.target.offsetDays ? { en: `${label.en} ${rule.target.offsetDays > 0 ? '+' : ''}${rule.target.offsetDays} days`, fr: `${label.fr} ${rule.target.offsetDays > 0 ? '+' : ''}${rule.target.offsetDays} jours` } : label;
                    }
                    invalid = target === undefined || Boolean(target.trim()) && !comparisonPasses(rule.operator, subject.type, value, target);
                    break;
                }
                case 'choice': {
                    if (mode === 'draft' && !answerCount(question, value))
                        break;
                    invalid = question.type === 'select' ? value !== rule.value : !parseChoices(value).includes(rule.value);
                    failure.targetLabel = 'options' in question ? question.options.find(option => option.value === rule.value)?.label : undefined;
                    break;
                }
                case 'group': {
                    const keys = rule.questionIds.map(id => sourceKey(id, path, active)).filter((id) => Boolean(id));
                    if (keys.some(id => baseErrors[id]))
                        break;
                    const count = keys.filter(id => answerCount(questions.get(baseQuestionId(id)), answers[id] ?? '') > 0).length;
                    invalid = rule.mode === 'exactlyOne' ? count > 1 || mode === 'submit' && count !== 1 : mode === 'submit' && (rule.mode === 'atLeastOne' ? count < 1 : rule.mode === 'all' ? count < keys.length : count > 0 && count < keys.length);
                    failure.targetLabel = { en: keys.map(id => questions.get(baseQuestionId(id)).label.en).join(', '), fr: keys.map(id => questions.get(baseQuestionId(id)).label.fr).join(', ') };
                    break;
                }
                case 'unique': {
                    const values = [];
                    if (question.type === 'list')
                        for (const item of parseList(value, question.maxItems))
                            if (item.value.trim())
                                values.push([item.value.trim()]);
                    if (question.type === 'table')
                        for (const item of parseTable(value, question.maxRows)) {
                            const columns = question.columns.filter(column => !rule.columnIds || rule.columnIds.includes(column.id));
                            const rowValues = columns.map(column => item.cells[column.id] ?? '');
                            if (rowValues.every(item => item.trim()))
                                values.push(rowValues.map((item, index) => normalize(columns[index].type, item)));
                        }
                    if (question.type === 'repeat')
                        for (const item of parseList(value, question.maxItems)) {
                            const keys = (rule.questionIds ?? []).map(id => instanceKey(id, [...path, item.id]));
                            if (keys.some(id => !active.has(id) || baseErrors[id] || !(answers[id] ?? '').trim()))
                                continue;
                            values.push(keys.map(id => normalize(questions.get(baseQuestionId(id)).type, answers[id])));
                        }
                    const serialized = values.map(value => JSON.stringify(value));
                    invalid = new Set(serialized).size !== serialized.length;
                    break;
                }
                case 'total': {
                    if (question.type !== 'table' || mode === 'draft' && rule.operator === 'equals')
                        break;
                    const rows = parseTable(value, question.maxRows);
                    if (!rows.length)
                        break;
                    const cells = rows.flatMap(row => rule.columnIds.map(id => row.cells[id] ?? '')).filter(cell => cell.trim());
                    if (cells.some(cell => !numeric(cell)))
                        break;
                    let target;
                    if (rule.target.kind === 'value')
                        target = rule.target.value;
                    else {
                        const targetKey = sourceKey(rule.target.questionId, path, active);
                        if (!targetKey || baseErrors[targetKey])
                            break;
                        target = answers[targetKey];
                        failure.targetLabel = questions.get(rule.target.questionId)?.label;
                    }
                    if (!target?.trim())
                        break;
                    const scale = Math.max(0, ...cells.map(cell => (cell.split('.')[1] ?? '').length));
                    const sum = cells.reduce((total, cell) => {
                        const [whole, fraction = ''] = cell.replace(/^-/, '').split('.');
                        const amount = BigInt(`${whole || '0'}${fraction.padEnd(scale, '0')}`);
                        return total + (cell.startsWith('-') ? -amount : amount);
                    }, BigInt(0));
                    const digits = (sum < BigInt(0) ? -sum : sum).toString().padStart(scale + 1, '0');
                    const total = `${sum < BigInt(0) ? '-' : ''}${scale ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}` : digits}`;
                    invalid = !comparisonPasses(rule.operator, 'number', total, target);
                    break;
                }
            }
            if (invalid) {
                failures[key] = failure;
                break;
            }
        }
    };
    for (const key of active) {
        const question = questions.get(baseQuestionId(key));
        if (baseErrors[key])
            continue;
        const value = answers[key] ?? '';
        check(question, key, question, value);
        if (question.type === 'table' && !failures[key]) {
            for (const [index, row] of parseTable(value, question.maxRows).entries()) {
                for (const column of question.columns) {
                    check(question, key, column, row.cells[column.id] ?? '', { number: index + 1, cells: row.cells });
                    if (failures[key])
                        break;
                }
                if (failures[key])
                    break;
            }
        }
    }
    return failures;
};
/** Rule messages are plain text; each host owns the error markup and escaping. */
export const ruleMessage = (failure, locale) => {
    const { rule, bound } = failure;
    let message = '';
    if (rule.kind === 'length' || rule.kind === 'count') {
        const amount = bound === 'min' ? rule.min : rule.max;
        if (rule.kind === 'length')
            message = locale === 'fr' ? `La réponse doit contenir ${bound === 'min' ? 'au moins' : 'au plus'} ${amount} caractères.` : `Answer must contain ${bound === 'min' ? 'at least' : 'at most'} ${amount} characters.`;
        else
            message = locale === 'fr' ? `Choisissez ou ajoutez ${bound === 'min' ? 'au moins' : 'au plus'} ${amount} éléments.` : `Choose or add ${bound === 'min' ? 'at least' : 'at most'} ${amount} items.`;
    }
    else if (rule.kind === 'precision')
        message = locale === 'fr' ? `Utilisez au plus ${rule.decimalPlaces} décimales.` : `Use at most ${rule.decimalPlaces} decimal places.`;
    else if (rule.kind === 'format') {
        const names = { url: { en: 'HTTP or HTTPS URL', fr: 'URL HTTP ou HTTPS' }, postalCode: { en: 'Canadian postal code', fr: 'code postal canadien' }, phone: { en: 'phone number (7–15 digits)', fr: 'numéro de téléphone (7 à 15 chiffres)' }, identifier: { en: 'identifier (letters, digits, underscores or hyphens)', fr: 'identifiant (lettres, chiffres, tirets bas ou traits d’union)' } };
        message = locale === 'fr' ? `Entrez un ${names[rule.format].fr} valide.` : `Enter a valid ${names[rule.format].en}.`;
    }
    else if (rule.kind === 'choice') {
        const target = failure.targetLabel?.[locale] ?? rule.value;
        message = locale === 'fr' ? `Sélectionnez « ${target} ».` : `Select “${target}”.`;
    }
    else if (rule.kind === 'group') {
        const actions = { atLeastOne: { en: 'Answer at least one', fr: 'Répondez à au moins une' }, exactlyOne: { en: 'Answer exactly one', fr: 'Répondez à exactement une' }, all: { en: 'Answer all', fr: 'Répondez à toutes' }, allOrNone: { en: 'Answer all or none', fr: 'Répondez à toutes ou à aucune' } };
        message = `${actions[rule.mode][locale]}${locale === 'fr' ? ' des questions suivantes' : ' of these questions'}: ${failure.targetLabel?.[locale] ?? ''}.`;
    }
    else if (rule.kind === 'unique')
        message = locale === 'fr' ? 'Les valeurs des entrées doivent être uniques.' : 'Entry values must be unique.';
    else if (rule.kind === 'compare' || rule.kind === 'total') {
        const target = failure.targetLabel?.[locale] ?? (rule.target.kind === 'value' ? rule.target.value : rule.target.kind === 'question' ? rule.target.questionId : '');
        const en = { equals: 'equal to', notEquals: 'different from', greaterThan: 'greater than', greaterThanOrEqual: 'greater than or equal to', lessThan: 'less than', lessThanOrEqual: 'less than or equal to' };
        const fr = { equals: 'égale à', notEquals: 'différente de', greaterThan: 'supérieure à', greaterThanOrEqual: 'supérieure ou égale à', lessThan: 'inférieure à', lessThanOrEqual: 'inférieure ou égale à' };
        if (failure.type === 'date') {
            en.greaterThan = 'after';
            en.greaterThanOrEqual = 'on or after';
            en.lessThan = 'before';
            en.lessThanOrEqual = 'on or before';
            fr.greaterThan = 'après';
            fr.greaterThanOrEqual = 'le même jour que ou après';
            fr.lessThan = 'avant';
            fr.lessThanOrEqual = 'le même jour que ou avant';
            message = locale === 'fr' ? `La date doit être ${fr[rule.operator]} « ${target} ».` : `Date must be ${en[rule.operator]} “${target}”.`;
        }
        else
            message = locale === 'fr' ? `${rule.kind === 'total' ? 'La somme' : 'La réponse'} doit être ${fr[rule.operator]} « ${target} ».` : `${rule.kind === 'total' ? 'Total' : 'Answer'} must be ${en[rule.operator]} “${target}”.`;
    }
    return failure.row ? `${locale === 'fr' ? 'Ligne' : 'Row'} ${failure.row}, ${failure.columnLabel?.[locale]}: ${message}` : message;
};
