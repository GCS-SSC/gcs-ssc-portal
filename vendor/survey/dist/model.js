import { budgetConfigSchema, activityConfigSchema } from './grants.js';
import { z } from 'zod';
export const questionTypes = ['text', 'email', 'number', 'date', 'select'];
export const identifier = z
    .string()
    .regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/)
    .refine((value) => !['__proto__', 'constructor', 'prototype'].includes(value));
export const bilingualText = z
    .object({
    en: z.string().trim().min(1).max(200),
    fr: z.string().trim().min(1).max(200)
})
    .strict();
const hint = z.object({ en: z.string().trim().max(500), fr: z.string().trim().max(500) }).strict();
const base = z
    .object({
    id: identifier,
    label: bilingualText,
    hint: hint.optional(),
    required: z.boolean()
})
    .strict();
const option = z.object({ value: identifier, label: bilingualText }).strict();
const legacyQuestionSchema = z.discriminatedUnion('type', [
    base.extend({
        type: z.literal('text'),
        maxLength: z.number().int().min(1).max(5000).default(500)
    }),
    base.extend({ type: z.literal('email') }),
    base.extend({ type: z.literal('number') }),
    base.extend({ type: z.literal('date') }),
    base.extend({
        type: z.literal('select'),
        options: z
            .array(option)
            .min(2)
            .max(30)
            .refine((values) => new Set(values.map((item) => item.value)).size === values.length, 'Option values must be unique')
    })
]);
export const attachmentPolicySchema = z.object({ enabled: z.boolean() }).strict();
export const legacySurveySchema = z
    .object({
    schemaVersion: z.literal(1),
    attachments: attachmentPolicySchema.optional(),
    title: bilingualText,
    questions: z.array(legacyQuestionSchema).min(1).max(50)
})
    .strict()
    .superRefine((value, context) => {
    if (new TextEncoder().encode(JSON.stringify(value)).byteLength > 240 * 1024)
        context.addIssue({ code: 'custom', message: 'Survey exceeds 240 KiB' });
    const ids = new Set();
    value.questions.forEach((question, index) => {
        if (ids.has(question.id))
            context.addIssue({
                code: 'custom',
                path: ['questions', index, 'id'],
                message: 'Question IDs must be unique'
            });
        ids.add(question.id);
    });
});
export const bilingualDescription = z
    .object({
    en: z.string().trim().min(1).max(2000),
    fr: z.string().trim().min(1).max(2000)
})
    .strict();
export const conditionOperators = [
    'equals',
    'notEquals',
    'contains',
    'greaterThan',
    'lessThan',
    'answered',
    'notAnswered'
];
const predicateSchema = z.discriminatedUnion('operator', [
    z
        .object({
        questionId: identifier,
        operator: z.enum(['equals', 'notEquals', 'contains', 'greaterThan', 'lessThan']),
        value: z.string().min(1).max(5000)
    })
        .strict(),
    z.object({ questionId: identifier, operator: z.enum(['answered', 'notAnswered']) }).strict()
]);
export const conditionSchema = z
    .object({ match: z.enum(['all', 'any']), conditions: z.array(predicateSchema).min(1).max(20) })
    .strict();
const questionExtensions = {
    hint: z
        .object({ en: z.string().trim().min(1).max(500), fr: z.string().trim().min(1).max(500) })
        .strict()
        .optional(),
    visibleWhen: conditionSchema.optional()
};
export const questionV2Schema = z.discriminatedUnion('type', [
    legacyQuestionSchema.options[0].extend(questionExtensions),
    legacyQuestionSchema.options[1].extend(questionExtensions),
    legacyQuestionSchema.options[2].extend(questionExtensions),
    legacyQuestionSchema.options[3].extend(questionExtensions),
    legacyQuestionSchema.options[4].extend(questionExtensions)
]);
const groupBase = z
    .object({
    id: identifier,
    title: bilingualText,
    description: bilingualDescription.optional(),
    visibleWhen: conditionSchema.optional(),
    questionIds: z.array(identifier).max(50)
})
    .strict();
export const subsectionSchema = groupBase;
export const sectionSchema = groupBase.extend({ subsections: z.array(subsectionSchema).max(20) });
export const destinationSchema = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('page'), pageId: identifier }).strict(),
    z.object({ kind: z.literal('end') }).strict()
]);
export const pageSchema = z
    .object({
    id: identifier,
    title: bilingualText,
    description: bilingualDescription.optional(),
    questionIds: z.array(identifier).max(50),
    sections: z.array(sectionSchema).max(20),
    branches: z
        .array(z.object({ when: conditionSchema, destination: destinationSchema }).strict())
        .max(20),
    next: destinationSchema.optional()
})
    .strict();
const structuredSurveySchema = z
    .object({
    schemaVersion: z.literal(2),
    attachments: attachmentPolicySchema.optional(),
    title: bilingualText,
    description: bilingualDescription.optional(),
    questions: z.array(questionV2Schema).min(1).max(50),
    pages: z.array(pageSchema).min(1).max(20)
})
    .strict();
export const questionSchema = legacyQuestionSchema;
export const surveyV1Schema = legacySurveySchema;
export const surveyV2Schema = structuredSurveySchema.superRefine((value, context) => {
    const fail = (message) => context.addIssue({ code: 'custom', message });
    if (new TextEncoder().encode(JSON.stringify(value)).byteLength > 240 * 1024)
        fail('Survey exceeds 240 KiB');
    const ids = new Set();
    const register = (id) => {
        if (ids.has(id))
            fail(`Duplicate ID: ${id}`);
        ids.add(id);
    };
    const questions = new Map(value.questions.map((question) => [question.id, question]));
    value.questions.forEach((question) => register(question.id));
    const placed = new Set();
    const checkCondition = (condition) => {
        for (const predicate of condition?.conditions ?? []) {
            const question = questions.get(predicate.questionId);
            if (!question || !placed.has(predicate.questionId)) {
                fail('Conditions must reference an earlier question');
                continue;
            }
            if (predicate.operator === 'greaterThan' || predicate.operator === 'lessThan') {
                if (question.type !== 'number' ||
                    !/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(predicate.value) ||
                    !Number.isFinite(Number(predicate.value)))
                    fail('Numeric comparisons require a number question and decimal value');
            }
            if (predicate.operator === 'contains' && question.type !== 'text')
                fail('Contains requires a text question');
            if ((predicate.operator === 'equals' || predicate.operator === 'notEquals') &&
                question.type === 'select' &&
                !question.options.some((option) => option.value === predicate.value))
                fail('Condition references an unknown choice');
        }
    };
    const place = (questionIds) => questionIds.forEach((id) => {
        const question = questions.get(id);
        if (!question || placed.has(id)) {
            fail('Every question must be placed exactly once');
            return;
        }
        checkCondition(question.visibleWhen);
        placed.add(id);
    });
    value.pages.forEach((page, pageIndex) => {
        register(page.id);
        place(page.questionIds);
        for (const section of page.sections) {
            register(section.id);
            checkCondition(section.visibleWhen);
            place(section.questionIds);
            for (const subsection of section.subsections) {
                register(subsection.id);
                checkCondition(subsection.visibleWhen);
                place(subsection.questionIds);
            }
        }
        const destination = (target) => {
            if (target?.kind === 'page' &&
                value.pages.findIndex((item) => item.id === target.pageId) <= pageIndex)
                fail('Branches must target a later existing page');
        };
        page.branches.forEach((branch) => {
            checkCondition(branch.when);
            destination(branch.destination);
        });
        destination(page.next);
    });
    if (placed.size !== questions.size)
        fail('Every question must be placed exactly once');
});
const advancedOption = z.object({ value: identifier, label: bilingualText }).strict();
const advancedBase = z.object({
    id: identifier, label: bilingualText, required: z.boolean(),
    hint: hint.optional(), visibleWhen: conditionSchema.optional()
}).strict();
const choiceOptions = z.array(advancedOption).min(1).max(50).refine((values) => new Set(values.map((item) => item.value)).size === values.length, 'Option values must be unique');
const tableColumn = z.object({
    id: identifier, label: bilingualText, type: z.enum(['text', 'number', 'date']), required: z.boolean()
}).strict();
export const advancedQuestionSchema = z.discriminatedUnion('type', [
    advancedBase.extend({ type: z.literal('text'), maxLength: z.number().int().min(1).max(5000).default(500) }),
    advancedBase.extend({ type: z.literal('email') }),
    advancedBase.extend({ type: z.literal('number') }),
    advancedBase.extend({ type: z.literal('date') }),
    advancedBase.extend({ type: z.literal('select'), options: choiceOptions,
        dependsOn: z.object({ questionId: identifier, optionsByValue: z.record(identifier, choiceOptions) }).strict().optional() }),
    advancedBase.extend({ type: z.literal('list'), maxItems: z.number().int().min(1).max(50).default(10) }),
    advancedBase.extend({ type: z.literal('repeat'), maxItems: z.number().int().min(1).max(50).default(10) }),
    advancedBase.extend({ type: z.literal('table'), maxRows: z.number().int().min(1).max(100).default(20),
        columns: z.array(tableColumn).min(1).max(20) }),
    advancedBase.extend({ type: z.literal('computed'), template: z.string().min(1).max(500),
        sourceIds: z.array(identifier).min(1).max(20) })
]);
export const grantQuestionSchema = z.discriminatedUnion('type', [
    advancedBase.extend({ type: z.literal('budget'), config: budgetConfigSchema }),
    advancedBase.extend({ type: z.literal('activities'), config: activityConfigSchema })
]);
export const tableTotalsModes = ['none', 'rows', 'columns', 'both'];
const tableV4Schema = advancedQuestionSchema.options[7].extend({ totals: z.enum(tableTotalsModes).optional() });
export const questionV4Schema = z.union([advancedQuestionSchema, tableV4Schema, advancedBase.extend({ type: z.literal('checkboxes'), options: choiceOptions }), advancedBase.extend({ type: z.literal('multiselect'), options: choiceOptions }), grantQuestionSchema, advancedBase.extend({ type: z.literal('textarea'), maxLength: z.number().int().min(1).max(5000).default(2000) })]);
export const advancedGroupSchema = z.lazy(() => z.object({
    id: identifier, title: bilingualText, description: bilingualDescription.optional(),
    visibleWhen: conditionSchema.optional(), repeatFor: identifier.optional(),
    questionIds: z.array(identifier).max(50), groups: z.array(advancedGroupSchema).max(20)
}).strict());
export const advancedPageSchema = z.object({
    id: identifier, title: bilingualText, description: bilingualDescription.optional(),
    questionIds: z.array(identifier).max(50), groups: z.array(advancedGroupSchema).max(20),
    branches: z.array(z.object({ when: conditionSchema, destination: destinationSchema }).strict()).max(20),
    next: destinationSchema.optional()
}).strict();
const advancedSurveyBase = z.object({
    schemaVersion: z.literal(3), attachments: attachmentPolicySchema.optional(),
    title: bilingualText, description: bilingualDescription.optional(),
    questions: z.array(advancedQuestionSchema).min(1).max(200),
    pages: z.array(advancedPageSchema).min(1).max(30)
}).strict();
const validateAdvancedDefinition = (value, context) => {
    const fail = (message) => context.addIssue({ code: 'custom', message });
    if (new TextEncoder().encode(JSON.stringify(value)).byteLength > 240 * 1024)
        fail('Survey exceeds 240 KiB');
    const used = new Set();
    const questions = new Map(value.questions.map((question) => [question.id, question]));
    if (questions.size !== value.questions.length)
        fail('Question IDs must be unique');
    const placed = new Set();
    const scopes = new Map();
    const accessible = (id, scope) => {
        const source = scopes.get(id);
        return source && source.every((part, index) => scope[index] === part);
    };
    const checkCondition = (when, scope) => {
        for (const predicate of when?.conditions ?? []) {
            if (!placed.has(predicate.questionId) || !accessible(predicate.questionId, scope)) {
                fail('Conditions must reference an earlier accessible question');
                continue;
            }
            const question = questions.get(predicate.questionId);
            if ((question.type === 'budget' || question.type === 'activities') && !['answered', 'notAnswered'].includes(predicate.operator))
                fail('Structured elements only support answered or unanswered conditions');
            if (predicate.operator === 'greaterThan' || predicate.operator === 'lessThan')
                if (question.type !== 'number' || !/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(predicate.value)
                    || !Number.isFinite(Number(predicate.value)))
                    fail('Numeric comparisons require a number question and decimal value');
            if (predicate.operator === 'contains' && !['text', 'textarea', 'list', 'checkboxes', 'multiselect'].includes(question.type))
                fail('Contains requires a text or list question');
            if (question.type === 'checkboxes' || question.type === 'multiselect') {
                if (!['contains', 'answered', 'notAnswered'].includes(predicate.operator))
                    fail('Multiple choices support contains or answered conditions');
                if (predicate.operator === 'contains' && !question.options.some(option => option.value === predicate.value))
                    fail('Condition references an unknown choice');
            }
            if ((predicate.operator === 'equals' || predicate.operator === 'notEquals')
                && question.type === 'select' && !question.options.some((option) => option.value === predicate.value))
                fail('Condition references an unknown choice');
        }
    };
    const place = (ids, scope) => {
        for (const id of ids) {
            if (!questions.has(id) || placed.has(id))
                fail('Every question must be placed exactly once');
            const question = questions.get(id);
            if (question) {
                checkCondition(question.visibleWhen, scope);
                if (question.type === 'select' && question.dependsOn) {
                    const source = questions.get(question.dependsOn.questionId);
                    if (!placed.has(question.dependsOn.questionId) || !accessible(question.dependsOn.questionId, scope)
                        || source?.type !== 'select')
                        fail('Dependent choices need an earlier select question');
                    else
                        for (const key of Object.keys(question.dependsOn.optionsByValue))
                            if (!source.options.some((option) => option.value === key))
                                fail('Unknown dependent choice source');
                    for (const choices of Object.values(question.dependsOn.optionsByValue))
                        for (const choice of choices)
                            if (!question.options.some((option) => option.value === choice.value))
                                fail('Dependent choices must use this question’s options');
                }
                if (question.type === 'computed')
                    for (const sourceId of question.sourceIds)
                        if (!placed.has(sourceId) || !accessible(sourceId, scope) || ['budget', 'activities'].includes(questions.get(sourceId)?.type ?? ''))
                            fail('Computed fields need earlier accessible source questions');
            }
            placed.add(id);
            scopes.set(id, scope);
        }
    };
    const visit = (groups, depth, ancestors) => {
        if (depth > 64) {
            fail('Groups exceed maximum nesting depth');
            return;
        }
        for (const group of groups) {
            if (used.has(group.id))
                fail(`Duplicate ID: ${group.id}`);
            used.add(group.id);
            checkCondition(group.visibleWhen, ancestors);
            if (group.repeatFor && (!placed.has(group.repeatFor) || !accessible(group.repeatFor, ancestors)
                || !['list', 'repeat'].includes(questions.get(group.repeatFor)?.type ?? '')))
                fail('Repeat source must be an earlier list or repeat question');
            if (group.repeatFor && ancestors.includes(group.repeatFor))
                fail('Repeat source cannot be reused in its own ancestry');
            place(group.questionIds, group.repeatFor ? [...ancestors, group.repeatFor] : ancestors);
            visit(group.groups, depth + 1, group.repeatFor ? [...ancestors, group.repeatFor] : ancestors);
        }
    };
    value.questions.forEach((question) => used.add(question.id));
    value.pages.forEach((page, index) => {
        if (used.has(page.id))
            fail(`Duplicate ID: ${page.id}`);
        used.add(page.id);
        place(page.questionIds, []);
        visit(page.groups, 1, []);
        for (const branch of page.branches)
            checkCondition(branch.when, []);
        for (const target of [...page.branches.map((branch) => branch.destination), page.next])
            if (target?.kind === 'page' && value.pages.findIndex((item) => item.id === target.pageId) <= index)
                fail('Branches must target a later existing page');
    });
    if (placed.size !== questions.size)
        fail('Every question must be placed exactly once');
    for (const question of value.questions)
        if (question.type === 'table' &&
            new Set(question.columns.map((column) => column.id)).size !== question.columns.length)
            fail('Table column IDs must be unique');
};
const surveyV4Base = advancedSurveyBase.extend({ schemaVersion: z.literal(4), questions: z.array(questionV4Schema).min(1).max(200) });
export const surveyV3Schema = advancedSurveyBase.superRefine(validateAdvancedDefinition);
export const surveyV4Schema = surveyV4Base.superRefine(validateAdvancedDefinition);
export const designerSurveySchema = z.union([surveyV3Schema, surveyV4Schema]);
export const surveySchema = z.union([surveyV1Schema, surveyV2Schema, surveyV3Schema, surveyV4Schema]);
/** Explicit editing upgrade; never mutates the archived source definition. */
export const upgradeSurvey = (definition) => {
    const copy = JSON.parse(JSON.stringify(definition));
    if (copy.schemaVersion === 2)
        return copy;
    let pageId = 'page_1';
    while (copy.questions.some((question) => question.id === pageId))
        pageId += '_';
    return {
        ...copy,
        schemaVersion: 2,
        pages: [
            {
                id: pageId,
                title: { en: 'Page 1', fr: 'Page 1' },
                questionIds: copy.questions.map((question) => question.id),
                sections: [],
                branches: []
            }
        ],
        questions: copy.questions.map((question) => ({
            ...question,
            ...(question.hint && !question.hint.en && !question.hint.fr ? { hint: undefined } : {})
        }))
    };
};
/** Authoring upgrade to v3. Archived revisions remain unchanged. */
export const upgradeToAdvancedSurvey = (definition) => {
    if (definition.schemaVersion === 3 || definition.schemaVersion === 4)
        return JSON.parse(JSON.stringify(definition));
    const current = upgradeSurvey(definition);
    return {
        schemaVersion: 3, attachments: current.attachments, title: current.title,
        description: current.description, questions: current.questions,
        pages: current.pages.map((page) => ({
            id: page.id, title: page.title, description: page.description,
            questionIds: page.questionIds, branches: page.branches, next: page.next,
            groups: page.sections.map((section) => ({
                id: section.id, title: section.title, description: section.description,
                visibleWhen: section.visibleWhen, questionIds: section.questionIds,
                groups: section.subsections.map((subsection) => ({
                    id: subsection.id, title: subsection.title, description: subsection.description,
                    visibleWhen: subsection.visibleWhen, questionIds: subsection.questionIds, groups: []
                }))
            }))
        }))
    };
};
