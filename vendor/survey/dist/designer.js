import { ref } from 'vue';
import { upgradeSurvey } from './index.js';
const clone = (value) => JSON.parse(JSON.stringify(value));
/** Hosts own persistence, dialogs and styling; IDs remain stable across edits and reorder. */
export const useSurveyDesigner = (initial) => {
    const definition = ref(upgradeSurvey(initial));
    const replace = (value) => {
        definition.value = upgradeSurvey(value);
    };
    const add = (question) => {
        if (!definition.value.pages.length ||
            definition.value.questions.length >= 50 ||
            definition.value.questions.some((item) => item.id === question.id))
            return false;
        definition.value.questions.push(clone(question));
        definition.value.pages[0].questionIds.push(question.id);
        return true;
    };
    const update = (question) => {
        const index = definition.value.questions.findIndex((item) => item.id === question.id);
        if (index < 0)
            return false;
        definition.value.questions[index] = clone(question);
        return true;
    };
    const isReferenced = (id) => {
        const conditions = [
            ...definition.value.questions.map((question) => question.visibleWhen),
            ...containers().map((container) => 'visibleWhen' in container ? container.visibleWhen : undefined),
            ...definition.value.pages.flatMap((page) => page.branches.map((branch) => branch.when))
        ];
        return conditions.some((condition) => condition?.conditions.some((predicate) => predicate.questionId === id));
    };
    const remove = (id) => {
        if (isReferenced(id))
            return false;
        definition.value.questions = definition.value.questions.filter((item) => item.id !== id);
        for (const container of containers())
            container.questionIds = container.questionIds.filter((key) => key !== id);
        return true;
    };
    const containers = () => definition.value.pages.flatMap((page) => [
        page,
        ...page.sections.flatMap((section) => [section, ...section.subsections])
    ]);
    const orderQuestions = () => {
        const order = containers().flatMap((container) => container.questionIds);
        definition.value.questions.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    };
    const place = (id, containerId) => {
        const target = containers().find((container) => container.id === containerId);
        if (!target || !definition.value.questions.some((question) => question.id === id))
            return false;
        for (const container of containers())
            container.questionIds = container.questionIds.filter((key) => key !== id);
        target.questionIds.push(id);
        orderQuestions();
        return true;
    };
    const move = (id, direction) => {
        const items = containers().find((container) => container.questionIds.includes(id))?.questionIds;
        if (!items)
            return;
        const index = items.indexOf(id), target = index + direction;
        if (index < 0 || target < 0 || target >= items.length)
            return;
        [items[index], items[target]] = [items[target], items[index]];
        orderQuestions();
    };
    return { definition, replace, add, update, remove, move, place, isReferenced };
};
