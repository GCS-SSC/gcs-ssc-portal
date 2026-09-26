import { type SurveyCondition, type SurveyDefinition, type SurveyPage, type SurveySection, type SurveySubsection } from './model.js';
import type { SurveyAnswers } from './answers.js';
import { type ResolvedAdvancedPage } from './advanced.js';
export interface ResolvedSubsection extends SurveySubsection {
    questionIds: string[];
}
export interface ResolvedSection extends SurveySection {
    subsections: ResolvedSubsection[];
}
export interface ResolvedPage extends SurveyPage {
    sections: ResolvedSection[];
    activeQuestionIds: string[];
}
export type SurveyResolvedPage = ResolvedPage | ResolvedAdvancedPage;
/** Unreachable questions never satisfy predicates, including negative/empty predicates. */
export declare const matchesCondition: (condition: SurveyCondition, answers: SurveyAnswers, activeIds: ReadonlySet<string>) => boolean;
/** Deterministic, forward-only route. Hosts must validate definitions before using the runtime. */
export declare const resolveSurvey: (definition: SurveyDefinition, answers: SurveyAnswers) => {
    pages: ResolvedPage[];
    questionIds: string[];
    answers: SurveyAnswers;
};
/** Strip answers to hidden/skipped/unknown questions after an upstream change or before persistence. */
export declare const pruneAnswers: (definition: SurveyDefinition, answers: SurveyAnswers) => SurveyAnswers;
