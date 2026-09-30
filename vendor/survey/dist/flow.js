import { upgradeSurvey } from './model.js';
import { resolveAdvancedSurvey } from './advanced.js';
/** Unreachable questions never satisfy predicates, including negative/empty predicates. */
export const matchesCondition = (condition, answers, activeIds) => {
    const results = condition.conditions.map((predicate) => {
        if (!activeIds.has(predicate.questionId))
            return false;
        const value = Object.hasOwn(answers, predicate.questionId) ? answers[predicate.questionId] : '';
        if (predicate.operator === 'answered')
            return Boolean(value.trim());
        if (predicate.operator === 'notAnswered')
            return !value.trim();
        if (!value.trim())
            return false;
        switch (predicate.operator) {
            case 'equals':
                return value === predicate.value;
            case 'notEquals':
                return value !== predicate.value;
            case 'contains':
                return value.includes(predicate.value);
            case 'greaterThan':
                return (/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value) &&
                    Number.isFinite(Number(value)) &&
                    Number(value) > Number(predicate.value));
            case 'lessThan':
                return (/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value) &&
                    Number.isFinite(Number(value)) &&
                    Number(value) < Number(predicate.value));
        }
    });
    return condition.match === 'all' ? results.every(Boolean) : results.some(Boolean);
};
/** Deterministic, forward-only route. Hosts must validate definitions before using the runtime. */
export const resolveSurvey = (definition, answers) => {
    if ((definition.schemaVersion === 3 || definition.schemaVersion === 4))
        return resolveAdvancedSurvey(definition, answers);
    const structured = definition.schemaVersion === 2 ? definition : upgradeSurvey(definition);
    const questions = new Map(structured.questions.map((question) => [question.id, question]));
    const active = new Set(), pages = [];
    const visible = (when) => !when || matchesCondition(when, answers, active);
    const include = (ids) => ids.filter((id) => {
        const question = questions.get(id);
        if (!question || !visible(question.visibleWhen))
            return false;
        active.add(id);
        return true;
    });
    let index = 0;
    while (index < structured.pages.length) {
        const page = structured.pages[index];
        const pageIds = include(page.questionIds);
        const sections = [];
        for (const section of page.sections) {
            if (!visible(section.visibleWhen))
                continue;
            const questionIds = include(section.questionIds);
            const subsections = [];
            for (const subsection of section.subsections) {
                if (visible(subsection.visibleWhen))
                    subsections.push({ ...subsection, questionIds: include(subsection.questionIds) });
            }
            sections.push({ ...section, questionIds, subsections });
        }
        const activeQuestionIds = [
            ...pageIds,
            ...sections.flatMap((section) => [
                ...section.questionIds,
                ...section.subsections.flatMap((subsection) => subsection.questionIds)
            ])
        ];
        pages.push({ ...page, questionIds: pageIds, sections, activeQuestionIds });
        const target = page.branches.find((branch) => matchesCondition(branch.when, answers, active))?.destination ??
            page.next;
        if (target?.kind === 'end')
            break;
        const nextIndex = target?.kind === 'page'
            ? structured.pages.findIndex((candidate) => candidate.id === target.pageId)
            : index + 1;
        if (nextIndex <= index)
            throw new Error('Invalid forward survey route');
        index = nextIndex;
    }
    const retained = Object.create(null);
    for (const id of active)
        if (Object.hasOwn(answers, id))
            retained[id] = answers[id];
    return { pages, questionIds: [...active], answers: retained };
};
/** Strip answers to hidden/skipped/unknown questions after an upstream change or before persistence. */
export const pruneAnswers = (definition, answers) => resolveSurvey(definition, answers).answers;
