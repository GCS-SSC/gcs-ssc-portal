import { type MaybeRefOrGetter } from 'vue';
import { type SurveyAnswers, type SurveyError } from './answers.js';
import type { SurveyDefinition } from './model.js';
/** Controlled answer state; navigation follows the same pure evaluator used on the server. */
export declare const useSurveyFlow: (options: {
    definition: MaybeRefOrGetter<SurveyDefinition>;
    answers: MaybeRefOrGetter<SurveyAnswers>;
    onChange: (answers: SurveyAnswers) => void;
}) => {
    route: import("vue").ComputedRef<{
        pages: import("./flow.js").ResolvedPage[];
        questionIds: string[];
        answers: SurveyAnswers;
    }>;
    page: import("vue").ComputedRef<import("./flow.js").ResolvedPage | undefined>;
    pageIndex: import("vue").ComputedRef<number>;
    complete: import("vue").Ref<boolean, boolean>;
    errors: import("vue").Ref<Record<string, SurveyError>, Record<string, SurveyError>>;
    setAnswer: (id: string, value: string) => void;
    next: () => boolean;
    back: () => void;
    validate: () => Record<string, SurveyError>;
    canBack: import("vue").ComputedRef<boolean>;
    isLastPage: import("vue").ComputedRef<boolean>;
};
