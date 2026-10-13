import { isCalendarDate } from './values.js';
import { isConditionallyRequired, evaluateFieldRules, ruleMessage } from './field-rules.js';
export { isFieldRequired } from './field-rules.js';
import { grantIssues, normalizeBudgetAnswer, readBudgetAnswer } from './grants.js';
import { z } from 'zod';
import { resolveSurvey } from './flow.js';
import { baseQuestionId, parseChoices, parseList, parseTable, sourceKey } from './advanced.js';
export const answersSchema = z.record(z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,63}(?:@r_[a-zA-Z0-9_-]{1,40})*$/).max(2048), z.string().max(240 * 1024)).refine((value) => new TextEncoder().encode(JSON.stringify(value)).byteLength <= 1024 * 1024, 'Answers exceed 1 MiB');
export { isCalendarDate } from './values.js';
/** Same validator runs in any host renderer and at the API boundary. No coercion of blanks to zero. */
export const validateAnswers = (definition, answers, mode = 'submit', options = {}) => {
    if ((definition.schemaVersion === 3 || definition.schemaVersion === 4 || definition.schemaVersion === 5))
        return validateAdvancedAnswers(definition, answers, mode, options);
    const errors = Object.create(null);
    const ids = new Set(definition.questions.map((question) => question.id));
    for (const key of Object.keys(answers))
        if (!ids.has(key))
            errors[key] = 'unknown';
    const active = new Set(resolveSurvey(definition, answers).questionIds);
    for (const question of definition.questions) {
        if (!active.has(question.id))
            continue;
        const value = Object.hasOwn(answers, question.id) ? answers[question.id] : '';
        if (!value.trim()) {
            if (mode === 'submit' && question.required)
                errors[question.id] = 'required';
            continue;
        }
        if (question.type === 'text' && value.length > question.maxLength)
            errors[question.id] = 'length';
        if (question.type === 'email' && !z.email().safeParse(value).success)
            errors[question.id] = 'email';
        if (question.type === 'number' &&
            (!/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value) || !Number.isFinite(Number(value))))
            errors[question.id] = 'number';
        if (question.type === 'date' && !isCalendarDate(value))
            errors[question.id] = 'date';
        if (question.type === 'select' && !question.options.some((option) => option.value === value))
            errors[question.id] = 'choice';
    }
    return errors;
};
const validateAdvancedAnswers = (definition, answers, mode, options = {}, applyRules = true) => {
    const errors = Object.create(null);
    const questions = new Map(definition.questions.map((question) => [question.id, question]));
    const route = resolveSurvey(definition, answers);
    const active = new Set(route.questionIds);
    for (const key of Object.keys(answers))
        if (!active.has(key) || !questions.has(baseQuestionId(key)))
            errors[key] = 'unknown';
    for (const key of active) {
        const original = questions.get(baseQuestionId(key));
        const question = { ...original, required: isConditionallyRequired(original, key, answers, active, questions) };
        const path = key.split('@').slice(1);
        if (question.type === 'computed')
            continue;
        const value = answers[key] ?? '';
        if (question.type === 'budget' || question.type === 'activities') {
            const issues = grantIssues(question, value, mode);
            if (issues.length)
                errors[key] = issues[0].code === 'required' ? 'required' : 'choice';
            continue;
        }
        if (question.type === 'checkboxes' || question.type === 'multiselect') {
            const selected = parseChoices(value);
            if (value && (JSON.stringify(selected) !== value || selected.some(id => !question.options.some(option => option.value === id))))
                errors[key] = 'choice';
            else if (mode === 'submit' && question.required && !selected.length)
                errors[key] = 'required';
            continue;
        }
        if (question.type === 'list' || question.type === 'repeat') {
            const rows = parseList(value, question.maxItems);
            if (value && JSON.stringify(rows) !== value)
                errors[key] = 'choice';
            else if (mode === 'submit' && question.required && !rows.length)
                errors[key] = 'required';
            else if (question.type === 'list' && mode === 'submit' && rows.some((row) => !row.value.trim()))
                errors[key] = 'required';
            continue;
        }
        if (question.type === 'table') {
            const rows = parseTable(value, question.maxRows);
            if (value && JSON.stringify(rows) !== value)
                errors[key] = 'choice';
            else if (mode === 'submit' && question.required && !rows.length)
                errors[key] = 'required';
            else if (rows.some((row) => Object.keys(row.cells).some((id) => !question.columns.some((column) => column.id === id))))
                errors[key] = 'choice';
            else
                for (const row of rows)
                    for (const column of question.columns) {
                        const cell = row.cells[column.id] ?? '';
                        if (mode === 'submit' && column.required && !cell.trim())
                            errors[key] = 'required';
                        if (cell && column.type === 'number' &&
                            (!/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(cell) || !Number.isFinite(Number(cell))))
                            errors[key] = 'number';
                        if (cell && column.type === 'date' && !isCalendarDate(cell))
                            errors[key] = 'date';
                    }
            continue;
        }
        if (!value.trim()) {
            if (mode === 'submit' && question.required)
                errors[key] = 'required';
            continue;
        }
        if ((question.type === 'text' || question.type === 'textarea') && value.length > question.maxLength)
            errors[key] = 'length';
        if (question.type === 'email' && !z.email().safeParse(value).success)
            errors[key] = 'email';
        if (question.type === 'number' &&
            (!/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value) || !Number.isFinite(Number(value))))
            errors[key] = 'number';
        if (question.type === 'date' && !isCalendarDate(value))
            errors[key] = 'date';
        if (question.type === 'select') {
            const dependency = question.dependsOn;
            const parentKey = dependency && sourceKey(dependency.questionId, path, active);
            const allowed = dependency
                ? dependency.optionsByValue[parentKey ? answers[parentKey] ?? '' : ''] ?? []
                : question.options;
            if (!allowed.some((option) => option.value === value))
                errors[key] = 'choice';
        }
    }
    if (applyRules && definition.schemaVersion === 5) {
        for (const key of Object.keys(evaluateFieldRules(definition, answers, mode, errors, active, options)))
            errors[key] = 'rule';
    }
    return errors;
};
/** Use this result at persistence boundaries: answers excludes all hidden/skipped/unknown keys. */
export const validateSurveyAnswers = (definition, answers, mode = 'submit', options = {}) => {
    const retained = resolveSurvey(definition, answers).answers;
    const errors = validateAnswers(definition, answers, mode, options);
    for (const [id, raw] of Object.entries(retained)) {
        const question = definition.questions.find(item => item.id === baseQuestionId(id));
        if (question?.type !== 'budget' || errors[id])
            continue;
        const answer = readBudgetAnswer(raw);
        if (answer)
            retained[id] = JSON.stringify(normalizeBudgetAnswer(question.config, answer));
    }
    return { answers: retained, errors };
};
/** Localized detail for the first failing rule per active answer; generic validation keeps stable codes. */
export const fieldRuleErrors = (definition, answers, mode = 'submit', locale = 'en', options = {}) => {
    if (definition.schemaVersion !== 5)
        return {};
    const baseErrors = validateAdvancedAnswers(definition, answers, mode, options, false);
    const active = new Set(resolveSurvey(definition, answers).questionIds);
    return Object.fromEntries(Object.entries(evaluateFieldRules(definition, answers, mode, baseErrors, active, options))
        .map(([key, failure]) => [key, ruleMessage(failure, locale)]));
};
