import { type ActivityConfig, type ActivityRow, type BudgetConfig, type BudgetRow } from './grants.js';
export interface GrantInput {
    path: string;
    label: string;
    value: string;
    type: 'text' | 'textarea' | 'money' | 'date' | 'percentage' | 'select';
    required: boolean;
    readonly?: boolean;
    maxLength?: number;
    options?: {
        value: string;
        label: string;
    }[];
}
export declare const budgetFields: (config: BudgetConfig, row: BudgetRow, locale: "en" | "fr") => GrantInput[];
export declare const fundingFields: (config: BudgetConfig, source: BudgetRow["otherFunding"][number], locale: "en" | "fr") => GrantInput[];
export declare const activityFields: (config: ActivityConfig, row: ActivityRow, locale: "en" | "fr") => GrantInput[];
export interface BudgetTotal {
    fiscalYearId: string;
    currency: string;
    categoryId?: string;
    totalCost: string;
    programFunding: string;
    otherFunding: string;
    gap: string;
    stacking: string;
    costSharing: string;
}
/** Exact aggregates are grouped by year/currency; currencies are never added together. */
export declare const budgetTotals: (config: BudgetConfig, rows: BudgetRow[], groupBy?: "year" | "category") => BudgetTotal[];
