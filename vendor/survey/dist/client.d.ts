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
                type: "table";
                maxRows: number;
                columns: {
                    id: string;
                    label: {
                        en: string;
                        fr: string;
                    };
                    type: "number" | "text" | "date";
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
