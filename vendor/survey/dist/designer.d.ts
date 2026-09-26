import { type LegacySurvey, type StructuredSurvey, type SurveyQuestion } from './index.js';
/** Hosts own persistence, dialogs and styling; IDs remain stable across edits and reorder. */
export declare const useSurveyDesigner: (initial: LegacySurvey | StructuredSurvey) => {
    definition: import("vue").Ref<{
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
    }, {
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
    }>;
    replace: (value: LegacySurvey | StructuredSurvey) => void;
    add: (question: SurveyQuestion) => boolean;
    update: (question: SurveyQuestion) => boolean;
    remove: (id: string) => boolean;
    move: (id: string, direction: -1 | 1) => void;
    place: (id: string, containerId: string) => boolean;
    isReferenced: (id: string) => boolean;
};
