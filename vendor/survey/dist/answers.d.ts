import { type RuleEvaluationOptions } from './field-rules.js';
export { isFieldRequired, type RuleEvaluationOptions } from './field-rules.js';
import { z } from 'zod';
import { type SurveyDefinition } from './model.js';
export type SurveyAnswers = Record<string, string>;
export type SurveyError = 'required' | 'email' | 'number' | 'date' | 'choice' | 'length' | 'unknown' | 'rule';
export declare const answersSchema: z.ZodRecord<z.ZodString, z.ZodString>;
export { isCalendarDate } from './values.js';
/** Same validator runs in any host renderer and at the API boundary. No coercion of blanks to zero. */
export declare const validateAnswers: (definition: SurveyDefinition, answers: SurveyAnswers, mode?: "draft" | "submit", options?: RuleEvaluationOptions) => Record<string, SurveyError>;
/** Use this result at persistence boundaries: answers excludes all hidden/skipped/unknown keys. */
export declare const validateSurveyAnswers: (definition: SurveyDefinition, answers: SurveyAnswers, mode?: "draft" | "submit", options?: RuleEvaluationOptions) => {
    answers: SurveyAnswers;
    errors: Record<string, SurveyError>;
};
/** Localized detail for the first failing rule per active answer; generic validation keeps stable codes. */
export declare const fieldRuleErrors: (definition: SurveyDefinition, answers: SurveyAnswers, mode?: "draft" | "submit", locale?: "en" | "fr", options?: RuleEvaluationOptions) => Record<string, string>;
