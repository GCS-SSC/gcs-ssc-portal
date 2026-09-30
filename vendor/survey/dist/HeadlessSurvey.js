import { computed, defineComponent } from 'vue';
import { useSurveyFlow } from './navigation.js';
import { baseQuestionId, computedValue, sourceKey } from './advanced.js';
/** No elements or styles: the host provides every rendered control through the default slot. */
export const HeadlessSurvey = defineComponent({
    name: 'HeadlessSurvey',
    inheritAttrs: false,
    props: {
        definition: { type: Object, required: true },
        modelValue: { type: Object, required: true },
        locale: { type: String, default: 'en' },
        errors: {
            type: Object,
            default: () => ({})
        },
        disabled: { type: Boolean, default: false }
    },
    emits: {
        'update:modelValue': (value) => typeof value === 'object'
    },
    slots: Object,
    setup(props, { emit, slots, expose }) {
        const flow = useSurveyFlow({
            definition: () => props.definition,
            answers: () => props.modelValue,
            onChange: (value) => emit('update:modelValue', value)
        });
        const fields = computed(() => (flow.page.value?.activeQuestionIds ?? [])
            .map((id) => ({ id, question: props.definition.questions.find((question) => question.id === baseQuestionId(id)) }))
            .map(({ id, question }) => ({
            question,
            id,
            label: question.label[props.locale],
            hint: question.hint?.[props.locale] ?? '',
            required: question.required,
            disabled: props.disabled || question.type === 'computed',
            value: question.type === 'computed' && (props.definition.schemaVersion === 3 || props.definition.schemaVersion === 4)
                ? computedValue(question, id.split('@').slice(1), props.modelValue, new Set(flow.route.value.questionIds), new Map(props.definition.questions.map((item) => [item.id, item])))
                : Object.hasOwn(props.modelValue, id) ? props.modelValue[id] : '',
            error: Object.hasOwn(props.errors, id)
                ? props.errors[id]
                : Object.hasOwn(flow.errors.value, id)
                    ? flow.errors.value[id]
                    : undefined,
            options: (question.type === 'select' || question.type === 'checkboxes' || question.type === 'multiselect')
                ? ((props.definition.schemaVersion === 3 || props.definition.schemaVersion === 4) && 'dependsOn' in question && question.dependsOn
                    ? question.options.filter((option) => question.dependsOn.optionsByValue[props.modelValue[sourceKey(question.dependsOn.questionId, id.split('@').slice(1), new Set(flow.route.value.questionIds)) ?? ''] ?? '']?.some((choice) => choice.value === option.value))
                    : question.options).map((option) => ({
                    value: option.value,
                    label: option.label[props.locale]
                }))
                : [],
            setValue: (value) => {
                if (!props.disabled && question.type !== 'computed')
                    flow.setAnswer(id, value);
            }
        })));
        const validate = flow.validate;
        const next = () => !props.disabled && flow.next();
        const back = () => {
            if (!props.disabled)
                flow.back();
        };
        expose({ validate, next, back });
        return () => slots.default?.({
            fields: fields.value,
            attachmentsAllowed: props.definition.attachments?.enabled === true,
            title: props.definition.title[props.locale],
            validate,
            description: props.definition.schemaVersion !== 1
                ? (props.definition.description?.[props.locale] ?? '')
                : '',
            page: flow.page.value,
            pageIndex: flow.pageIndex.value,
            canBack: flow.canBack.value,
            isLastPage: flow.isLastPage.value,
            complete: flow.complete.value,
            errors: flow.errors.value,
            next,
            back
        });
    }
});
