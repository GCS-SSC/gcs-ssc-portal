import { type SurveyDefinition } from './index.js';
/** Call from an extension's server process. Never expose agency bearer credentials to a browser. */
export declare const pushSurvey: (options: {
    portalUrl: string;
    token: string;
    agencyId: string;
    definition: SurveyDefinition;
    existing?: {
        id: string;
        revision: number;
    };
    fetch?: typeof globalThis.fetch;
}) => Promise<{
    survey: {
        id: string;
        agencyId: string;
        revision: number;
        definition: {
            schemaVersion: 1;
            title: {
                en: string;
                fr: string;
            };
            questions: ({
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "text";
                maxLength: number;
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "email";
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "number";
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "date";
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "select";
                options: {
                    value: string;
                    label: {
                        en: string;
                        fr: string;
                    };
                }[];
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
            })[];
            attachments?: {
                enabled: boolean;
            } | undefined;
        } | {
            schemaVersion: 2;
            title: {
                en: string;
                fr: string;
            };
            questions: ({
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "text";
                maxLength: number;
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "email";
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "number";
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "date";
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "select";
                options: {
                    value: string;
                    label: {
                        en: string;
                        fr: string;
                    };
                }[];
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
            })[];
            pages: {
                id: string;
                title: {
                    en: string;
                    fr: string;
                };
                questionIds: string[];
                sections: {
                    id: string;
                    title: {
                        en: string;
                        fr: string;
                    };
                    questionIds: string[];
                    subsections: {
                        id: string;
                        title: {
                            en: string;
                            fr: string;
                        };
                        questionIds: string[];
                        description?: {
                            en: string;
                            fr: string;
                        } | undefined;
                        visibleWhen?: {
                            match: "any" | "all";
                            conditions: ({
                                questionId: string;
                                operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                                value: string;
                            } | {
                                questionId: string;
                                operator: "answered" | "notAnswered";
                            })[];
                        } | undefined;
                    }[];
                    description?: {
                        en: string;
                        fr: string;
                    } | undefined;
                    visibleWhen?: {
                        match: "any" | "all";
                        conditions: ({
                            questionId: string;
                            operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                            value: string;
                        } | {
                            questionId: string;
                            operator: "answered" | "notAnswered";
                        })[];
                    } | undefined;
                }[];
                branches: {
                    when: {
                        match: "any" | "all";
                        conditions: ({
                            questionId: string;
                            operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                            value: string;
                        } | {
                            questionId: string;
                            operator: "answered" | "notAnswered";
                        })[];
                    };
                    destination: {
                        kind: "page";
                        pageId: string;
                    } | {
                        kind: "end";
                    };
                }[];
                description?: {
                    en: string;
                    fr: string;
                } | undefined;
                next?: {
                    kind: "page";
                    pageId: string;
                } | {
                    kind: "end";
                } | undefined;
            }[];
            attachments?: {
                enabled: boolean;
            } | undefined;
            description?: {
                en: string;
                fr: string;
            } | undefined;
        } | {
            title: {
                en: string;
                fr: string;
            };
            pages: {
                id: string;
                title: {
                    en: string;
                    fr: string;
                };
                questionIds: string[];
                groups: import("./model.js").AdvancedGroup[];
                branches: {
                    when: {
                        match: "any" | "all";
                        conditions: ({
                            questionId: string;
                            operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                            value: string;
                        } | {
                            questionId: string;
                            operator: "answered" | "notAnswered";
                        })[];
                    };
                    destination: {
                        kind: "page";
                        pageId: string;
                    } | {
                        kind: "end";
                    };
                }[];
                description?: {
                    en: string;
                    fr: string;
                } | undefined;
                next?: {
                    kind: "page";
                    pageId: string;
                } | {
                    kind: "end";
                } | undefined;
            }[];
            schemaVersion: 4;
            questions: ({
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "text";
                maxLength: number;
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "email";
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "number";
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "date";
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "select";
                options: {
                    value: string;
                    label: {
                        en: string;
                        fr: string;
                    };
                }[];
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
                dependsOn?: {
                    questionId: string;
                    optionsByValue: Record<string, {
                        value: string;
                        label: {
                            en: string;
                            fr: string;
                        };
                    }[]>;
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "list";
                maxItems: number;
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "repeat";
                maxItems: number;
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "table";
                maxRows: number;
                columns: {
                    id: string;
                    label: {
                        en: string;
                        fr: string;
                    };
                    type: "number" | "date" | "text";
                    required: boolean;
                }[];
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "computed";
                template: string;
                sourceIds: string[];
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "table";
                maxRows: number;
                columns: {
                    id: string;
                    label: {
                        en: string;
                        fr: string;
                    };
                    type: "number" | "date" | "text";
                    required: boolean;
                }[];
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
                totals?: "rows" | "columns" | "none" | "both" | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "checkboxes";
                options: {
                    value: string;
                    label: {
                        en: string;
                        fr: string;
                    };
                }[];
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "multiselect";
                options: {
                    value: string;
                    label: {
                        en: string;
                        fr: string;
                    };
                }[];
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "budget";
                config: {
                    source: {
                        mode: "custom" | "stream";
                        agencyId?: string | undefined;
                        streamId?: string | undefined;
                        capturedAt?: string | undefined;
                    };
                    maxRows: number;
                    categories: {
                        id: string;
                        label: {
                            en: string;
                            fr: string;
                        };
                        gcsId?: string | undefined;
                    }[];
                    fiscalYears: {
                        id: string;
                        label: {
                            en: string;
                            fr: string;
                        };
                        gcsId?: string | undefined;
                    }[];
                    currencies: ("CAD" | "USD" | "EUR" | "GBP" | "JPY" | "CHF" | "AUD" | "NZD")[];
                    costItems: {
                        id: string;
                        label: {
                            en: string;
                            fr: string;
                        };
                        categoryId: string;
                        calculation: {
                            mode: "manual" | "category" | "all_other";
                            sourceCategoryId: string | null;
                            percentage: number | null;
                            allowOverride: boolean;
                        };
                        gcsId?: string | undefined;
                        costSharingRatio?: number | null | undefined;
                    }[];
                    fundingTypes: {
                        id: string;
                        label: {
                            en: string;
                            fr: string;
                        };
                        stacking: boolean;
                        costSharing: boolean;
                        gcsId?: string | undefined;
                    }[];
                    fundingSubtypes: {
                        id: string;
                        label: {
                            en: string;
                            fr: string;
                        };
                        typeId: string;
                        gcsId?: string | undefined;
                    }[];
                };
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "activities";
                config: {
                    source: {
                        mode: "custom" | "stream";
                        agencyId?: string | undefined;
                        streamId?: string | undefined;
                        capturedAt?: string | undefined;
                    };
                    maxRows: number;
                    outcomes: {
                        id: string;
                        label: {
                            en: string;
                            fr: string;
                        };
                        gcsId?: string | undefined;
                    }[];
                    responsibleParties: {
                        id: string;
                        label: {
                            en: string;
                            fr: string;
                        };
                        gcsId?: string | undefined;
                    }[];
                    requireOutcomes: boolean;
                    requireResponsibleParties: boolean;
                    bilingual: boolean;
                };
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "textarea";
                maxLength: number;
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
            })[];
            attachments?: {
                enabled: boolean;
            } | undefined;
            description?: {
                en: string;
                fr: string;
            } | undefined;
        } | {
            schemaVersion: 3;
            title: {
                en: string;
                fr: string;
            };
            questions: ({
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "text";
                maxLength: number;
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "email";
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "number";
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "date";
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "select";
                options: {
                    value: string;
                    label: {
                        en: string;
                        fr: string;
                    };
                }[];
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
                dependsOn?: {
                    questionId: string;
                    optionsByValue: Record<string, {
                        value: string;
                        label: {
                            en: string;
                            fr: string;
                        };
                    }[]>;
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "list";
                maxItems: number;
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "repeat";
                maxItems: number;
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "table";
                maxRows: number;
                columns: {
                    id: string;
                    label: {
                        en: string;
                        fr: string;
                    };
                    type: "number" | "date" | "text";
                    required: boolean;
                }[];
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
            } | {
                id: string;
                label: {
                    en: string;
                    fr: string;
                };
                required: boolean;
                type: "computed";
                template: string;
                sourceIds: string[];
                hint?: {
                    en: string;
                    fr: string;
                } | undefined;
                visibleWhen?: {
                    match: "any" | "all";
                    conditions: ({
                        questionId: string;
                        operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                        value: string;
                    } | {
                        questionId: string;
                        operator: "answered" | "notAnswered";
                    })[];
                } | undefined;
            })[];
            pages: {
                id: string;
                title: {
                    en: string;
                    fr: string;
                };
                questionIds: string[];
                groups: import("./model.js").AdvancedGroup[];
                branches: {
                    when: {
                        match: "any" | "all";
                        conditions: ({
                            questionId: string;
                            operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
                            value: string;
                        } | {
                            questionId: string;
                            operator: "answered" | "notAnswered";
                        })[];
                    };
                    destination: {
                        kind: "page";
                        pageId: string;
                    } | {
                        kind: "end";
                    };
                }[];
                description?: {
                    en: string;
                    fr: string;
                } | undefined;
                next?: {
                    kind: "page";
                    pageId: string;
                } | {
                    kind: "end";
                } | undefined;
            }[];
            attachments?: {
                enabled: boolean;
            } | undefined;
            description?: {
                en: string;
                fr: string;
            } | undefined;
        };
        updatedAt: string;
    };
}>;
