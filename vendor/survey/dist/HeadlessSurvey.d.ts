import { type PropType, type SlotsType } from 'vue';
import { type SurveyDefinition, type SurveyAnswers, type SurveyError, type SurveyQuestion, type AdvancedQuestion } from './index.js';
import type { SurveyResolvedPage } from './flow.js';
export interface SurveyField {
    question: SurveyQuestion | AdvancedQuestion;
    id: string;
    label: string;
    hint: string;
    required: boolean;
    disabled: boolean;
    value: string;
    error: SurveyError | undefined;
    options: {
        value: string;
        label: string;
    }[];
    setValue: (value: string) => void;
}
export interface SurveySlot {
    attachmentsAllowed: boolean;
    fields: SurveyField[];
    title: string;
    description: string;
    page: SurveyResolvedPage | undefined;
    pageIndex: number;
    canBack: boolean;
    isLastPage: boolean;
    complete: boolean;
    next: () => boolean;
    back: () => void;
    errors: Record<string, SurveyError>;
    validate: () => Record<string, SurveyError>;
}
/** No elements or styles: the host provides every rendered control through the default slot. */
export declare const HeadlessSurvey: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    definition: {
        type: PropType<SurveyDefinition>;
        required: true;
    };
    modelValue: {
        type: PropType<SurveyAnswers>;
        required: true;
    };
    locale: {
        type: PropType<"en" | "fr">;
        default: string;
    };
    errors: {
        type: PropType<Record<string, SurveyError>>;
        default: () => {};
    };
    disabled: {
        type: BooleanConstructor;
        default: boolean;
    };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>[], {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    'update:modelValue': (value: SurveyAnswers) => boolean;
}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    definition: {
        type: PropType<SurveyDefinition>;
        required: true;
    };
    modelValue: {
        type: PropType<SurveyAnswers>;
        required: true;
    };
    locale: {
        type: PropType<"en" | "fr">;
        default: string;
    };
    errors: {
        type: PropType<Record<string, SurveyError>>;
        default: () => {};
    };
    disabled: {
        type: BooleanConstructor;
        default: boolean;
    };
}>> & Readonly<{
    "onUpdate:modelValue"?: ((value: SurveyAnswers) => any) | undefined;
}>, {
    errors: Record<string, SurveyError>;
    locale: "en" | "fr";
    disabled: boolean;
}, SlotsType<{
    default: SurveySlot;
}>, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
