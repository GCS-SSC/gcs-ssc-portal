import type { AdvancedQuestion, AdvancedSurvey, FieldRule, SurveyCondition } from './model.js';
import type { SurveyAnswers, SurveyError } from './answers.js';
export interface RuleEvaluationOptions {
    today?: string;
}
type Fail = (message: string, path?: (string | number)[]) => void;
/** Validate rule compatibility while the model walks its canonical placement order. */
export declare const validateFieldRules: (question: AdvancedQuestion, questionIndex: number, scope: string[], questions: Map<string, AdvancedQuestion>, placed: Set<string>, accessible: (id: string, scope: string[]) => boolean | undefined, checkCondition: (when: SurveyCondition | undefined, scope: string[]) => void, fail: Fail) => void;
/** Repeat uniqueness deliberately references child definitions, which become known after traversal. */
export declare const validateUniqueReferences: (questions: AdvancedQuestion[], scopes: Map<string, string[]>, fail: Fail) => void;
export declare const isConditionallyRequired: (question: AdvancedQuestion, key: string, answers: SurveyAnswers, active: ReadonlySet<string>, questions: Map<string, AdvancedQuestion>) => boolean;
/** Native required indicators include entry/choice requirements without changing rule error grouping. */
export declare const isFieldRequired: (question: AdvancedQuestion, key: string, answers: SurveyAnswers, active: ReadonlySet<string>, questions: Map<string, AdvancedQuestion>) => boolean;
export type RuleFailure = {
    rule: FieldRule;
    bound?: 'min' | 'max';
    targetLabel?: {
        en: string;
        fr: string;
    };
    type?: string;
    row?: number;
    columnLabel?: {
        en: string;
        fr: string;
    };
};
/** One evaluator serves all hosts; it receives only values that passed the original type checks. */
export declare const evaluateFieldRules: (definition: AdvancedSurvey, answers: SurveyAnswers, mode: "draft" | "submit", baseErrors: Record<string, SurveyError>, active: ReadonlySet<string>, options: RuleEvaluationOptions) => Record<string, RuleFailure>;
/** Rule messages are plain text; each host owns the error markup and escaping. */
export declare const ruleMessage: (failure: RuleFailure, locale: "en" | "fr") => string;
export {};
