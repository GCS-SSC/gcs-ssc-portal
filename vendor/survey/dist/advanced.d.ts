import type { AdvancedGroup, AdvancedQuestion, AdvancedSurvey, SurveyCondition } from './model.js';
import type { SurveyAnswers } from './answers.js';
export interface ListItem {
    id: string;
    value: string;
}
export interface TableRow {
    id: string;
    cells: Record<string, string>;
}
export interface ResolvedAdvancedGroup extends Omit<AdvancedGroup, 'groups'> {
    questionIds: string[];
    groups: ResolvedAdvancedGroup[];
    instanceId?: string;
    instanceLabel?: string;
}
export interface ResolvedAdvancedPage extends Omit<AdvancedSurvey['pages'][number], 'groups'> {
    groups: ResolvedAdvancedGroup[];
    sections: [];
    activeQuestionIds: string[];
}
export declare const instanceKey: (id: string, path: string[]) => string;
export declare const baseQuestionId: (key: string) => string;
export declare const parseList: (raw: string | undefined, max?: number) => ListItem[];
export declare const parseTable: (raw: string | undefined, max?: number) => TableRow[];
/** Multiple choices retain stable option IDs, never display labels. */
export declare const parseChoices: (raw: string | undefined) => string[];
export declare const tableTotalsMode: (question: {
    type: string;
    totals?: "none" | "rows" | "columns" | "both";
}) => "rows" | "columns" | "none" | "both";
export declare const tableTotals: (question: {
    columns: {
        id: string;
        type: string;
    }[];
}, rows: TableRow[]) => {
    rows: {
        [k: string]: string | null;
    };
    columns: {
        [k: string]: string | null;
    };
};
export declare const sourceKey: (id: string, path: string[], active: ReadonlySet<string>) => string | undefined;
export declare const computedValue: (question: Extract<AdvancedQuestion, {
    type: "computed";
}>, path: string[], answers: SurveyAnswers, active: ReadonlySet<string>, questions: Map<string, AdvancedQuestion>) => string;
/** Conditions in a repeated group resolve against the nearest repeated instance. */
export declare const matchesAdvancedCondition: (condition: SurveyCondition, path: string[], answers: SurveyAnswers, active: ReadonlySet<string>, questions: Map<string, AdvancedQuestion>) => boolean;
export declare const resolveAdvancedSurvey: (definition: AdvancedSurvey, answers: SurveyAnswers) => {
    pages: ResolvedAdvancedPage[];
    questionIds: string[];
    answers: SurveyAnswers;
};
