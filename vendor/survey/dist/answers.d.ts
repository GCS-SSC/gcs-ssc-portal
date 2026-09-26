import { z } from 'zod';
import { type SurveyDefinition } from './model.js';
export type SurveyAnswers = Record<string, string>;
export type SurveyError = 'required' | 'email' | 'number' | 'date' | 'choice' | 'length' | 'unknown';
export declare const answersSchema: z.ZodRecord<z.ZodString, z.ZodString>;
export declare const isCalendarDate: (value: string) => boolean;
/** Same validator runs in any host renderer and at the API boundary. No coercion of blanks to zero. */
export declare const validateAnswers: (definition: SurveyDefinition, answers: SurveyAnswers, mode?: "draft" | "submit") => Record<string, SurveyError>;
/** Use this result at persistence boundaries: answers excludes all hidden/skipped/unknown keys. */
export declare const validateSurveyAnswers: (definition: SurveyDefinition, answers: SurveyAnswers, mode?: "draft" | "submit") => {
    answers: SurveyAnswers;
    errors: Record<string, SurveyError>;
};
