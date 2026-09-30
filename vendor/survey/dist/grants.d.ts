import { z } from 'zod';
export declare const grantOptionSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    gcsId: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const grantSourceSchema: z.ZodObject<{
    mode: z.ZodEnum<{
        custom: "custom";
        stream: "stream";
    }>;
    agencyId: z.ZodOptional<z.ZodString>;
    streamId: z.ZodOptional<z.ZodString>;
    capturedAt: z.ZodOptional<z.ZodISODateTime>;
}, z.core.$strict>;
export declare const budgetConfigSchema: z.ZodObject<{
    source: z.ZodObject<{
        mode: z.ZodEnum<{
            custom: "custom";
            stream: "stream";
        }>;
        agencyId: z.ZodOptional<z.ZodString>;
        streamId: z.ZodOptional<z.ZodString>;
        capturedAt: z.ZodOptional<z.ZodISODateTime>;
    }, z.core.$strict>;
    maxRows: z.ZodNumber;
    categories: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        gcsId: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    fiscalYears: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        gcsId: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    currencies: z.ZodArray<z.ZodEnum<{
        CAD: "CAD";
        USD: "USD";
        EUR: "EUR";
        GBP: "GBP";
        JPY: "JPY";
        CHF: "CHF";
        AUD: "AUD";
        NZD: "NZD";
    }>>;
    costItems: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        gcsId: z.ZodOptional<z.ZodString>;
        categoryId: z.ZodString;
        calculation: z.ZodObject<{
            mode: z.ZodEnum<{
                manual: "manual";
                category: "category";
                all_other: "all_other";
            }>;
            sourceCategoryId: z.ZodNullable<z.ZodString>;
            percentage: z.ZodNullable<z.ZodNumber>;
            allowOverride: z.ZodBoolean;
        }, z.core.$strict>;
        costSharingRatio: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, z.core.$strict>>;
    fundingTypes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        gcsId: z.ZodOptional<z.ZodString>;
        stacking: z.ZodBoolean;
        costSharing: z.ZodBoolean;
    }, z.core.$strict>>;
    fundingSubtypes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        gcsId: z.ZodOptional<z.ZodString>;
        typeId: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const activityConfigSchema: z.ZodObject<{
    source: z.ZodObject<{
        mode: z.ZodEnum<{
            custom: "custom";
            stream: "stream";
        }>;
        agencyId: z.ZodOptional<z.ZodString>;
        streamId: z.ZodOptional<z.ZodString>;
        capturedAt: z.ZodOptional<z.ZodISODateTime>;
    }, z.core.$strict>;
    maxRows: z.ZodNumber;
    outcomes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        gcsId: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    responsibleParties: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        gcsId: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    requireOutcomes: z.ZodBoolean;
    requireResponsibleParties: z.ZodBoolean;
    bilingual: z.ZodBoolean;
}, z.core.$strict>;
export type BudgetConfig = z.infer<typeof budgetConfigSchema>;
export type ActivityConfig = z.infer<typeof activityConfigSchema>;
export type GrantOption = z.infer<typeof grantOptionSchema>;
export type GrantQuestion = {
    type: 'budget';
    required: boolean;
    config: BudgetConfig;
} | {
    type: 'activities';
    required: boolean;
    config: ActivityConfig;
};
export declare const emptyBudgetConfig: () => BudgetConfig;
export declare const emptyActivityConfig: () => ActivityConfig;
export declare const budgetAnswerSchema: z.ZodObject<{
    version: z.ZodLiteral<1>;
    rows: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        fiscalYearId: z.ZodString;
        costItemId: z.ZodString;
        subsection: z.ZodString;
        description: z.ZodString;
        currency: z.ZodString;
        totalCost: z.ZodString;
        programFunding: z.ZodString;
        percentage: z.ZodString;
        otherFunding: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            subtypeId: z.ZodString;
            amount: z.ZodString;
            description: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const activityAnswerSchema: z.ZodObject<{
    version: z.ZodLiteral<1>;
    rows: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        description: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        expectedResults: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        startDate: z.ZodString;
        endDate: z.ZodString;
        outcomeIds: z.ZodArray<z.ZodString>;
        responsiblePartyIds: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type BudgetAnswer = z.infer<typeof budgetAnswerSchema>;
export type ActivityAnswer = z.infer<typeof activityAnswerSchema>;
export type BudgetRow = BudgetAnswer['rows'][number];
export type ActivityRow = ActivityAnswer['rows'][number];
export type GrantIssue = {
    path: string;
    code: 'required' | 'choice' | 'money' | 'negative' | 'coverage' | 'date' | 'range' | 'calculation' | 'length';
};
export declare const readBudgetAnswer: (raw: string) => BudgetAnswer | null;
export declare const readActivityAnswer: (raw: string) => ActivityAnswer | null;
export declare const moneyCents: (value: string) => bigint;
export declare const centsText: (value: bigint) => string;
/** Matches GCS: category charges first, all-other second; program funding only; nearest dollar. */
export declare const calculateBudget: (config: BudgetConfig, rows: BudgetRow[]) => BudgetRow[];
export declare const newBudgetRow: (id: string, config: BudgetConfig) => BudgetRow;
export declare const newActivityRow: (id: string) => ActivityRow;
export declare const grantIssues: (question: GrantQuestion, raw: string, mode?: "draft" | "submit") => GrantIssue[];
/** Canonical response serialization recomputes derived money rather than trusting submitted totals. */
export declare const normalizeBudgetAnswer: (config: BudgetConfig, answer: BudgetAnswer) => BudgetAnswer;
export declare const grantConfigurationReady: (question: GrantQuestion) => boolean;
