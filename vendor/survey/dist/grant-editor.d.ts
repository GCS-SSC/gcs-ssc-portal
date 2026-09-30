import { type MaybeRefOrGetter } from 'vue';
import { type ActivityRow, type BudgetRow, type GrantQuestion } from './grants.js';
/** Host-controlled structured entry. No persistence, theme, or host translation dependency. */
export declare const useGrantElement: (options: {
    question: MaybeRefOrGetter<GrantQuestion>;
    value: MaybeRefOrGetter<string>;
    locale: MaybeRefOrGetter<"en" | "fr">;
    showErrors: MaybeRefOrGetter<boolean>;
    disabled: MaybeRefOrGetter<boolean>;
    createId: () => string;
    onChange: (value: string) => void;
}) => {
    rows: import("vue").ComputedRef<{
        id: string;
        fiscalYearId: string;
        costItemId: string;
        subsection: string;
        description: string;
        currency: string;
        totalCost: string;
        programFunding: string;
        percentage: string;
        otherFunding: {
            id: string;
            subtypeId: string;
            amount: string;
            description: {
                en: string;
                fr: string;
            };
        }[];
    }[] | {
        id: string;
        name: {
            en: string;
            fr: string;
        };
        description: {
            en: string;
            fr: string;
        };
        expectedResults: {
            en: string;
            fr: string;
        };
        startDate: string;
        endDate: string;
        outcomeIds: string[];
        responsiblePartyIds: string[];
    }[]>;
    issues: import("vue").ComputedRef<import("./grants.js").GrantIssue[]>;
    error: (index: number, path: string) => "date" | "calculation" | "required" | "choice" | "money" | "negative" | "coverage" | "range" | "length" | undefined;
    fields: (row: BudgetRow | ActivityRow) => import("./grant-fields.js").GrantInput[];
    totals: import("vue").ComputedRef<import("./grant-fields.js").BudgetTotal[]>;
    categoryTotals: import("vue").ComputedRef<import("./grant-fields.js").BudgetTotal[]>;
    add: () => void;
    remove: (id: string) => void;
    change: (id: string, path: string, value: string) => void;
    toggle: (id: string, path: "outcomeIds" | "responsiblePartyIds", value: string, selected: boolean) => void;
    addFunding: (id: string) => void;
    changeFunding: (id: string, fundingId: string, path: string, value: string) => void;
    removeFunding: (id: string, fundingId: string) => void;
};
