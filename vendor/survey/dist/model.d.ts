import { z } from 'zod';
export declare const questionTypes: readonly ["text", "email", "number", "date", "select"];
export declare const identifier: z.ZodString;
export declare const bilingualText: z.ZodObject<{
    en: z.ZodString;
    fr: z.ZodString;
}, z.core.$strict>;
export declare const attachmentPolicySchema: z.ZodObject<{
    enabled: z.ZodBoolean;
}, z.core.$strict>;
export type AttachmentPolicy = z.infer<typeof attachmentPolicySchema>;
export declare const legacySurveySchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    attachments: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
    }, z.core.$strict>>;
    title: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    questions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"text">;
        maxLength: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"email">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"number">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"date">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"select">;
        options: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>>;
    }, z.core.$strict>], "type">>;
}, z.core.$strict>;
export declare const bilingualDescription: z.ZodObject<{
    en: z.ZodString;
    fr: z.ZodString;
}, z.core.$strict>;
export declare const conditionOperators: readonly ["equals", "notEquals", "contains", "greaterThan", "lessThan", "answered", "notAnswered"];
export declare const conditionSchema: z.ZodObject<{
    match: z.ZodEnum<{
        any: "any";
        all: "all";
    }>;
    conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        questionId: z.ZodString;
        operator: z.ZodEnum<{
            equals: "equals";
            notEquals: "notEquals";
            contains: "contains";
            greaterThan: "greaterThan";
            lessThan: "lessThan";
        }>;
        value: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        questionId: z.ZodString;
        operator: z.ZodEnum<{
            answered: "answered";
            notAnswered: "notAnswered";
        }>;
    }, z.core.$strict>], "operator">>;
}, z.core.$strict>;
export type SurveyCondition = z.infer<typeof conditionSchema>;
export declare const questionV2Schema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    type: z.ZodLiteral<"text">;
    maxLength: z.ZodDefault<z.ZodNumber>;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    type: z.ZodLiteral<"email">;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    type: z.ZodLiteral<"number">;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    type: z.ZodLiteral<"date">;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    type: z.ZodLiteral<"select">;
    options: z.ZodArray<z.ZodObject<{
        value: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
    }, z.core.$strict>>;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
}, z.core.$strict>], "type">;
export declare const subsectionSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    description: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    questionIds: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
export declare const sectionSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    description: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    questionIds: z.ZodArray<z.ZodString>;
    subsections: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        description: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        questionIds: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const destinationSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"page">;
    pageId: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"end">;
}, z.core.$strict>], "kind">;
export declare const pageSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    description: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    questionIds: z.ZodArray<z.ZodString>;
    sections: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        description: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        questionIds: z.ZodArray<z.ZodString>;
        subsections: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            title: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
            description: z.ZodOptional<z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>>;
            visibleWhen: z.ZodOptional<z.ZodObject<{
                match: z.ZodEnum<{
                    any: "any";
                    all: "all";
                }>;
                conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        equals: "equals";
                        notEquals: "notEquals";
                        contains: "contains";
                        greaterThan: "greaterThan";
                        lessThan: "lessThan";
                    }>;
                    value: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        answered: "answered";
                        notAnswered: "notAnswered";
                    }>;
                }, z.core.$strict>], "operator">>;
            }, z.core.$strict>>;
            questionIds: z.ZodArray<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    branches: z.ZodArray<z.ZodObject<{
        when: z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>;
        destination: z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"page">;
            pageId: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"end">;
        }, z.core.$strict>], "kind">;
    }, z.core.$strict>>;
    next: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"page">;
        pageId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"end">;
    }, z.core.$strict>], "kind">>;
}, z.core.$strict>;
declare const structuredSurveySchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<2>;
    attachments: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
    }, z.core.$strict>>;
    title: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    description: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    questions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"text">;
        maxLength: z.ZodDefault<z.ZodNumber>;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"email">;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"number">;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"date">;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"select">;
        options: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>>;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
    }, z.core.$strict>], "type">>;
    pages: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        description: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        questionIds: z.ZodArray<z.ZodString>;
        sections: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            title: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
            description: z.ZodOptional<z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>>;
            visibleWhen: z.ZodOptional<z.ZodObject<{
                match: z.ZodEnum<{
                    any: "any";
                    all: "all";
                }>;
                conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        equals: "equals";
                        notEquals: "notEquals";
                        contains: "contains";
                        greaterThan: "greaterThan";
                        lessThan: "lessThan";
                    }>;
                    value: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        answered: "answered";
                        notAnswered: "notAnswered";
                    }>;
                }, z.core.$strict>], "operator">>;
            }, z.core.$strict>>;
            questionIds: z.ZodArray<z.ZodString>;
            subsections: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                title: z.ZodObject<{
                    en: z.ZodString;
                    fr: z.ZodString;
                }, z.core.$strict>;
                description: z.ZodOptional<z.ZodObject<{
                    en: z.ZodString;
                    fr: z.ZodString;
                }, z.core.$strict>>;
                visibleWhen: z.ZodOptional<z.ZodObject<{
                    match: z.ZodEnum<{
                        any: "any";
                        all: "all";
                    }>;
                    conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                        questionId: z.ZodString;
                        operator: z.ZodEnum<{
                            equals: "equals";
                            notEquals: "notEquals";
                            contains: "contains";
                            greaterThan: "greaterThan";
                            lessThan: "lessThan";
                        }>;
                        value: z.ZodString;
                    }, z.core.$strict>, z.ZodObject<{
                        questionId: z.ZodString;
                        operator: z.ZodEnum<{
                            answered: "answered";
                            notAnswered: "notAnswered";
                        }>;
                    }, z.core.$strict>], "operator">>;
                }, z.core.$strict>>;
                questionIds: z.ZodArray<z.ZodString>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        branches: z.ZodArray<z.ZodObject<{
            when: z.ZodObject<{
                match: z.ZodEnum<{
                    any: "any";
                    all: "all";
                }>;
                conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        equals: "equals";
                        notEquals: "notEquals";
                        contains: "contains";
                        greaterThan: "greaterThan";
                        lessThan: "lessThan";
                    }>;
                    value: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        answered: "answered";
                        notAnswered: "notAnswered";
                    }>;
                }, z.core.$strict>], "operator">>;
            }, z.core.$strict>;
            destination: z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"page">;
                pageId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"end">;
            }, z.core.$strict>], "kind">;
        }, z.core.$strict>>;
        next: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"page">;
            pageId: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"end">;
        }, z.core.$strict>], "kind">>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type SurveyQuestion = z.infer<typeof questionV2Schema>;
export type SurveyPage = z.infer<typeof pageSchema>;
export type SurveySection = z.infer<typeof sectionSchema>;
export type SurveySubsection = z.infer<typeof subsectionSchema>;
export type SurveyDestination = z.infer<typeof destinationSchema>;
export type StructuredSurvey = z.infer<typeof structuredSurveySchema>;
export type LegacySurvey = z.infer<typeof legacySurveySchema>;
export type SurveyDefinition = LegacySurvey | StructuredSurvey | AdvancedSurvey;
export declare const questionSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    required: z.ZodBoolean;
    type: z.ZodLiteral<"text">;
    maxLength: z.ZodDefault<z.ZodNumber>;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    required: z.ZodBoolean;
    type: z.ZodLiteral<"email">;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    required: z.ZodBoolean;
    type: z.ZodLiteral<"number">;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    required: z.ZodBoolean;
    type: z.ZodLiteral<"date">;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    required: z.ZodBoolean;
    type: z.ZodLiteral<"select">;
    options: z.ZodArray<z.ZodObject<{
        value: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
    }, z.core.$strict>>;
}, z.core.$strict>], "type">;
export declare const surveyV1Schema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    attachments: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
    }, z.core.$strict>>;
    title: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    questions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"text">;
        maxLength: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"email">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"number">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"date">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"select">;
        options: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>>;
    }, z.core.$strict>], "type">>;
}, z.core.$strict>;
export declare const surveyV2Schema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<2>;
    attachments: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
    }, z.core.$strict>>;
    title: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    description: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    questions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"text">;
        maxLength: z.ZodDefault<z.ZodNumber>;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"email">;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"number">;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"date">;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"select">;
        options: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>>;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
    }, z.core.$strict>], "type">>;
    pages: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        description: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        questionIds: z.ZodArray<z.ZodString>;
        sections: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            title: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
            description: z.ZodOptional<z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>>;
            visibleWhen: z.ZodOptional<z.ZodObject<{
                match: z.ZodEnum<{
                    any: "any";
                    all: "all";
                }>;
                conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        equals: "equals";
                        notEquals: "notEquals";
                        contains: "contains";
                        greaterThan: "greaterThan";
                        lessThan: "lessThan";
                    }>;
                    value: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        answered: "answered";
                        notAnswered: "notAnswered";
                    }>;
                }, z.core.$strict>], "operator">>;
            }, z.core.$strict>>;
            questionIds: z.ZodArray<z.ZodString>;
            subsections: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                title: z.ZodObject<{
                    en: z.ZodString;
                    fr: z.ZodString;
                }, z.core.$strict>;
                description: z.ZodOptional<z.ZodObject<{
                    en: z.ZodString;
                    fr: z.ZodString;
                }, z.core.$strict>>;
                visibleWhen: z.ZodOptional<z.ZodObject<{
                    match: z.ZodEnum<{
                        any: "any";
                        all: "all";
                    }>;
                    conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                        questionId: z.ZodString;
                        operator: z.ZodEnum<{
                            equals: "equals";
                            notEquals: "notEquals";
                            contains: "contains";
                            greaterThan: "greaterThan";
                            lessThan: "lessThan";
                        }>;
                        value: z.ZodString;
                    }, z.core.$strict>, z.ZodObject<{
                        questionId: z.ZodString;
                        operator: z.ZodEnum<{
                            answered: "answered";
                            notAnswered: "notAnswered";
                        }>;
                    }, z.core.$strict>], "operator">>;
                }, z.core.$strict>>;
                questionIds: z.ZodArray<z.ZodString>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        branches: z.ZodArray<z.ZodObject<{
            when: z.ZodObject<{
                match: z.ZodEnum<{
                    any: "any";
                    all: "all";
                }>;
                conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        equals: "equals";
                        notEquals: "notEquals";
                        contains: "contains";
                        greaterThan: "greaterThan";
                        lessThan: "lessThan";
                    }>;
                    value: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        answered: "answered";
                        notAnswered: "notAnswered";
                    }>;
                }, z.core.$strict>], "operator">>;
            }, z.core.$strict>;
            destination: z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"page">;
                pageId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"end">;
            }, z.core.$strict>], "kind">;
        }, z.core.$strict>>;
        next: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"page">;
            pageId: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"end">;
        }, z.core.$strict>], "kind">>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const advancedQuestionSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    type: z.ZodLiteral<"text">;
    maxLength: z.ZodDefault<z.ZodNumber>;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    type: z.ZodLiteral<"email">;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    type: z.ZodLiteral<"number">;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    type: z.ZodLiteral<"date">;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    type: z.ZodLiteral<"select">;
    options: z.ZodArray<z.ZodObject<{
        value: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
    }, z.core.$strict>>;
    dependsOn: z.ZodOptional<z.ZodObject<{
        questionId: z.ZodString;
        optionsByValue: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>>>;
    }, z.core.$strict>>;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    type: z.ZodLiteral<"list">;
    maxItems: z.ZodDefault<z.ZodNumber>;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    type: z.ZodLiteral<"repeat">;
    maxItems: z.ZodDefault<z.ZodNumber>;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    type: z.ZodLiteral<"table">;
    maxRows: z.ZodDefault<z.ZodNumber>;
    columns: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        type: z.ZodEnum<{
            number: "number";
            date: "date";
            text: "text";
        }>;
        required: z.ZodBoolean;
    }, z.core.$strict>>;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    type: z.ZodLiteral<"computed">;
    template: z.ZodString;
    sourceIds: z.ZodArray<z.ZodString>;
}, z.core.$strict>], "type">;
export declare const grantQuestionSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    type: z.ZodLiteral<"budget">;
    config: z.ZodObject<{
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
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    type: z.ZodLiteral<"activities">;
    config: z.ZodObject<{
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
}, z.core.$strict>], "type">;
export declare const tableTotalsModes: readonly ["none", "rows", "columns", "both"];
export declare const questionV4Schema: z.ZodUnion<readonly [z.ZodDiscriminatedUnion<[z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    type: z.ZodLiteral<"text">;
    maxLength: z.ZodDefault<z.ZodNumber>;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    type: z.ZodLiteral<"email">;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    type: z.ZodLiteral<"number">;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    type: z.ZodLiteral<"date">;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    type: z.ZodLiteral<"select">;
    options: z.ZodArray<z.ZodObject<{
        value: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
    }, z.core.$strict>>;
    dependsOn: z.ZodOptional<z.ZodObject<{
        questionId: z.ZodString;
        optionsByValue: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>>>;
    }, z.core.$strict>>;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    type: z.ZodLiteral<"list">;
    maxItems: z.ZodDefault<z.ZodNumber>;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    type: z.ZodLiteral<"repeat">;
    maxItems: z.ZodDefault<z.ZodNumber>;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    type: z.ZodLiteral<"table">;
    maxRows: z.ZodDefault<z.ZodNumber>;
    columns: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        type: z.ZodEnum<{
            number: "number";
            date: "date";
            text: "text";
        }>;
        required: z.ZodBoolean;
    }, z.core.$strict>>;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    type: z.ZodLiteral<"computed">;
    template: z.ZodString;
    sourceIds: z.ZodArray<z.ZodString>;
}, z.core.$strict>], "type">, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    type: z.ZodLiteral<"table">;
    maxRows: z.ZodDefault<z.ZodNumber>;
    columns: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        type: z.ZodEnum<{
            number: "number";
            date: "date";
            text: "text";
        }>;
        required: z.ZodBoolean;
    }, z.core.$strict>>;
    totals: z.ZodOptional<z.ZodEnum<{
        rows: "rows";
        columns: "columns";
        none: "none";
        both: "both";
    }>>;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    type: z.ZodLiteral<"checkboxes">;
    options: z.ZodArray<z.ZodObject<{
        value: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
    }, z.core.$strict>>;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    type: z.ZodLiteral<"multiselect">;
    options: z.ZodArray<z.ZodObject<{
        value: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
    }, z.core.$strict>>;
}, z.core.$strict>, z.ZodDiscriminatedUnion<[z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    type: z.ZodLiteral<"budget">;
    config: z.ZodObject<{
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
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    type: z.ZodLiteral<"activities">;
    config: z.ZodObject<{
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
}, z.core.$strict>], "type">, z.ZodObject<{
    id: z.ZodString;
    label: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    required: z.ZodBoolean;
    hint: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    visibleWhen: z.ZodOptional<z.ZodObject<{
        match: z.ZodEnum<{
            any: "any";
            all: "all";
        }>;
        conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                equals: "equals";
                notEquals: "notEquals";
                contains: "contains";
                greaterThan: "greaterThan";
                lessThan: "lessThan";
            }>;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            questionId: z.ZodString;
            operator: z.ZodEnum<{
                answered: "answered";
                notAnswered: "notAnswered";
            }>;
        }, z.core.$strict>], "operator">>;
    }, z.core.$strict>>;
    type: z.ZodLiteral<"textarea">;
    maxLength: z.ZodDefault<z.ZodNumber>;
}, z.core.$strict>]>;
export type AdvancedQuestion = z.infer<typeof questionV4Schema>;
export interface AdvancedGroup {
    id: string;
    title: z.infer<typeof bilingualText>;
    description?: z.infer<typeof bilingualDescription>;
    visibleWhen?: SurveyCondition;
    repeatFor?: string;
    questionIds: string[];
    groups: AdvancedGroup[];
}
export declare const advancedGroupSchema: z.ZodType<AdvancedGroup>;
export declare const advancedPageSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    description: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    questionIds: z.ZodArray<z.ZodString>;
    groups: z.ZodArray<z.ZodType<AdvancedGroup, unknown, z.core.$ZodTypeInternals<AdvancedGroup, unknown>>>;
    branches: z.ZodArray<z.ZodObject<{
        when: z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>;
        destination: z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"page">;
            pageId: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"end">;
        }, z.core.$strict>], "kind">;
    }, z.core.$strict>>;
    next: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"page">;
        pageId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"end">;
    }, z.core.$strict>], "kind">>;
}, z.core.$strict>;
declare const surveyV4Base: z.ZodObject<{
    attachments: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
    }, z.core.$strict>>;
    title: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    description: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    pages: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        description: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        questionIds: z.ZodArray<z.ZodString>;
        groups: z.ZodArray<z.ZodType<AdvancedGroup, unknown, z.core.$ZodTypeInternals<AdvancedGroup, unknown>>>;
        branches: z.ZodArray<z.ZodObject<{
            when: z.ZodObject<{
                match: z.ZodEnum<{
                    any: "any";
                    all: "all";
                }>;
                conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        equals: "equals";
                        notEquals: "notEquals";
                        contains: "contains";
                        greaterThan: "greaterThan";
                        lessThan: "lessThan";
                    }>;
                    value: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        answered: "answered";
                        notAnswered: "notAnswered";
                    }>;
                }, z.core.$strict>], "operator">>;
            }, z.core.$strict>;
            destination: z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"page">;
                pageId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"end">;
            }, z.core.$strict>], "kind">;
        }, z.core.$strict>>;
        next: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"page">;
            pageId: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"end">;
        }, z.core.$strict>], "kind">>;
    }, z.core.$strict>>;
    schemaVersion: z.ZodLiteral<4>;
    questions: z.ZodArray<z.ZodUnion<readonly [z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"text">;
        maxLength: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"email">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"number">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"date">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"select">;
        options: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>>;
        dependsOn: z.ZodOptional<z.ZodObject<{
            questionId: z.ZodString;
            optionsByValue: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
                value: z.ZodString;
                label: z.ZodObject<{
                    en: z.ZodString;
                    fr: z.ZodString;
                }, z.core.$strict>;
            }, z.core.$strict>>>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"list">;
        maxItems: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"repeat">;
        maxItems: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"table">;
        maxRows: z.ZodDefault<z.ZodNumber>;
        columns: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
            type: z.ZodEnum<{
                number: "number";
                date: "date";
                text: "text";
            }>;
            required: z.ZodBoolean;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"computed">;
        template: z.ZodString;
        sourceIds: z.ZodArray<z.ZodString>;
    }, z.core.$strict>], "type">, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"table">;
        maxRows: z.ZodDefault<z.ZodNumber>;
        columns: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
            type: z.ZodEnum<{
                number: "number";
                date: "date";
                text: "text";
            }>;
            required: z.ZodBoolean;
        }, z.core.$strict>>;
        totals: z.ZodOptional<z.ZodEnum<{
            rows: "rows";
            columns: "columns";
            none: "none";
            both: "both";
        }>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"checkboxes">;
        options: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"multiselect">;
        options: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"budget">;
        config: z.ZodObject<{
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
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"activities">;
        config: z.ZodObject<{
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
    }, z.core.$strict>], "type">, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"textarea">;
        maxLength: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>]>>;
}, z.core.$strict>;
type AdvancedSurveyShape = Omit<z.infer<typeof surveyV4Base>, 'schemaVersion'>;
export type AdvancedSurvey = (AdvancedSurveyShape & {
    schemaVersion: 3;
}) | (AdvancedSurveyShape & {
    schemaVersion: 4;
});
export declare const surveyV3Schema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<3>;
    attachments: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
    }, z.core.$strict>>;
    title: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    description: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    questions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"text">;
        maxLength: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"email">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"number">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"date">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"select">;
        options: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>>;
        dependsOn: z.ZodOptional<z.ZodObject<{
            questionId: z.ZodString;
            optionsByValue: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
                value: z.ZodString;
                label: z.ZodObject<{
                    en: z.ZodString;
                    fr: z.ZodString;
                }, z.core.$strict>;
            }, z.core.$strict>>>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"list">;
        maxItems: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"repeat">;
        maxItems: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"table">;
        maxRows: z.ZodDefault<z.ZodNumber>;
        columns: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
            type: z.ZodEnum<{
                number: "number";
                date: "date";
                text: "text";
            }>;
            required: z.ZodBoolean;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"computed">;
        template: z.ZodString;
        sourceIds: z.ZodArray<z.ZodString>;
    }, z.core.$strict>], "type">>;
    pages: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        description: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        questionIds: z.ZodArray<z.ZodString>;
        groups: z.ZodArray<z.ZodType<AdvancedGroup, unknown, z.core.$ZodTypeInternals<AdvancedGroup, unknown>>>;
        branches: z.ZodArray<z.ZodObject<{
            when: z.ZodObject<{
                match: z.ZodEnum<{
                    any: "any";
                    all: "all";
                }>;
                conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        equals: "equals";
                        notEquals: "notEquals";
                        contains: "contains";
                        greaterThan: "greaterThan";
                        lessThan: "lessThan";
                    }>;
                    value: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        answered: "answered";
                        notAnswered: "notAnswered";
                    }>;
                }, z.core.$strict>], "operator">>;
            }, z.core.$strict>;
            destination: z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"page">;
                pageId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"end">;
            }, z.core.$strict>], "kind">;
        }, z.core.$strict>>;
        next: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"page">;
            pageId: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"end">;
        }, z.core.$strict>], "kind">>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const surveyV4Schema: z.ZodObject<{
    attachments: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
    }, z.core.$strict>>;
    title: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    description: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    pages: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        description: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        questionIds: z.ZodArray<z.ZodString>;
        groups: z.ZodArray<z.ZodType<AdvancedGroup, unknown, z.core.$ZodTypeInternals<AdvancedGroup, unknown>>>;
        branches: z.ZodArray<z.ZodObject<{
            when: z.ZodObject<{
                match: z.ZodEnum<{
                    any: "any";
                    all: "all";
                }>;
                conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        equals: "equals";
                        notEquals: "notEquals";
                        contains: "contains";
                        greaterThan: "greaterThan";
                        lessThan: "lessThan";
                    }>;
                    value: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        answered: "answered";
                        notAnswered: "notAnswered";
                    }>;
                }, z.core.$strict>], "operator">>;
            }, z.core.$strict>;
            destination: z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"page">;
                pageId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"end">;
            }, z.core.$strict>], "kind">;
        }, z.core.$strict>>;
        next: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"page">;
            pageId: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"end">;
        }, z.core.$strict>], "kind">>;
    }, z.core.$strict>>;
    schemaVersion: z.ZodLiteral<4>;
    questions: z.ZodArray<z.ZodUnion<readonly [z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"text">;
        maxLength: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"email">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"number">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"date">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"select">;
        options: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>>;
        dependsOn: z.ZodOptional<z.ZodObject<{
            questionId: z.ZodString;
            optionsByValue: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
                value: z.ZodString;
                label: z.ZodObject<{
                    en: z.ZodString;
                    fr: z.ZodString;
                }, z.core.$strict>;
            }, z.core.$strict>>>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"list">;
        maxItems: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"repeat">;
        maxItems: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"table">;
        maxRows: z.ZodDefault<z.ZodNumber>;
        columns: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
            type: z.ZodEnum<{
                number: "number";
                date: "date";
                text: "text";
            }>;
            required: z.ZodBoolean;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"computed">;
        template: z.ZodString;
        sourceIds: z.ZodArray<z.ZodString>;
    }, z.core.$strict>], "type">, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"table">;
        maxRows: z.ZodDefault<z.ZodNumber>;
        columns: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
            type: z.ZodEnum<{
                number: "number";
                date: "date";
                text: "text";
            }>;
            required: z.ZodBoolean;
        }, z.core.$strict>>;
        totals: z.ZodOptional<z.ZodEnum<{
            rows: "rows";
            columns: "columns";
            none: "none";
            both: "both";
        }>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"checkboxes">;
        options: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"multiselect">;
        options: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"budget">;
        config: z.ZodObject<{
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
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"activities">;
        config: z.ZodObject<{
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
    }, z.core.$strict>], "type">, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"textarea">;
        maxLength: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>]>>;
}, z.core.$strict>;
export declare const designerSurveySchema: z.ZodUnion<readonly [z.ZodObject<{
    schemaVersion: z.ZodLiteral<3>;
    attachments: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
    }, z.core.$strict>>;
    title: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    description: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    questions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"text">;
        maxLength: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"email">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"number">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"date">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"select">;
        options: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>>;
        dependsOn: z.ZodOptional<z.ZodObject<{
            questionId: z.ZodString;
            optionsByValue: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
                value: z.ZodString;
                label: z.ZodObject<{
                    en: z.ZodString;
                    fr: z.ZodString;
                }, z.core.$strict>;
            }, z.core.$strict>>>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"list">;
        maxItems: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"repeat">;
        maxItems: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"table">;
        maxRows: z.ZodDefault<z.ZodNumber>;
        columns: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
            type: z.ZodEnum<{
                number: "number";
                date: "date";
                text: "text";
            }>;
            required: z.ZodBoolean;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"computed">;
        template: z.ZodString;
        sourceIds: z.ZodArray<z.ZodString>;
    }, z.core.$strict>], "type">>;
    pages: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        description: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        questionIds: z.ZodArray<z.ZodString>;
        groups: z.ZodArray<z.ZodType<AdvancedGroup, unknown, z.core.$ZodTypeInternals<AdvancedGroup, unknown>>>;
        branches: z.ZodArray<z.ZodObject<{
            when: z.ZodObject<{
                match: z.ZodEnum<{
                    any: "any";
                    all: "all";
                }>;
                conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        equals: "equals";
                        notEquals: "notEquals";
                        contains: "contains";
                        greaterThan: "greaterThan";
                        lessThan: "lessThan";
                    }>;
                    value: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        answered: "answered";
                        notAnswered: "notAnswered";
                    }>;
                }, z.core.$strict>], "operator">>;
            }, z.core.$strict>;
            destination: z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"page">;
                pageId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"end">;
            }, z.core.$strict>], "kind">;
        }, z.core.$strict>>;
        next: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"page">;
            pageId: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"end">;
        }, z.core.$strict>], "kind">>;
    }, z.core.$strict>>;
}, z.core.$strict>, z.ZodObject<{
    attachments: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
    }, z.core.$strict>>;
    title: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    description: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    pages: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        description: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        questionIds: z.ZodArray<z.ZodString>;
        groups: z.ZodArray<z.ZodType<AdvancedGroup, unknown, z.core.$ZodTypeInternals<AdvancedGroup, unknown>>>;
        branches: z.ZodArray<z.ZodObject<{
            when: z.ZodObject<{
                match: z.ZodEnum<{
                    any: "any";
                    all: "all";
                }>;
                conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        equals: "equals";
                        notEquals: "notEquals";
                        contains: "contains";
                        greaterThan: "greaterThan";
                        lessThan: "lessThan";
                    }>;
                    value: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        answered: "answered";
                        notAnswered: "notAnswered";
                    }>;
                }, z.core.$strict>], "operator">>;
            }, z.core.$strict>;
            destination: z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"page">;
                pageId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"end">;
            }, z.core.$strict>], "kind">;
        }, z.core.$strict>>;
        next: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"page">;
            pageId: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"end">;
        }, z.core.$strict>], "kind">>;
    }, z.core.$strict>>;
    schemaVersion: z.ZodLiteral<4>;
    questions: z.ZodArray<z.ZodUnion<readonly [z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"text">;
        maxLength: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"email">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"number">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"date">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"select">;
        options: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>>;
        dependsOn: z.ZodOptional<z.ZodObject<{
            questionId: z.ZodString;
            optionsByValue: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
                value: z.ZodString;
                label: z.ZodObject<{
                    en: z.ZodString;
                    fr: z.ZodString;
                }, z.core.$strict>;
            }, z.core.$strict>>>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"list">;
        maxItems: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"repeat">;
        maxItems: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"table">;
        maxRows: z.ZodDefault<z.ZodNumber>;
        columns: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
            type: z.ZodEnum<{
                number: "number";
                date: "date";
                text: "text";
            }>;
            required: z.ZodBoolean;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"computed">;
        template: z.ZodString;
        sourceIds: z.ZodArray<z.ZodString>;
    }, z.core.$strict>], "type">, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"table">;
        maxRows: z.ZodDefault<z.ZodNumber>;
        columns: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
            type: z.ZodEnum<{
                number: "number";
                date: "date";
                text: "text";
            }>;
            required: z.ZodBoolean;
        }, z.core.$strict>>;
        totals: z.ZodOptional<z.ZodEnum<{
            rows: "rows";
            columns: "columns";
            none: "none";
            both: "both";
        }>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"checkboxes">;
        options: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"multiselect">;
        options: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"budget">;
        config: z.ZodObject<{
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
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"activities">;
        config: z.ZodObject<{
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
    }, z.core.$strict>], "type">, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"textarea">;
        maxLength: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>]>>;
}, z.core.$strict>]>;
export declare const surveySchema: z.ZodUnion<readonly [z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    attachments: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
    }, z.core.$strict>>;
    title: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    questions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"text">;
        maxLength: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"email">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"number">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"date">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"select">;
        options: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>>;
    }, z.core.$strict>], "type">>;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<2>;
    attachments: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
    }, z.core.$strict>>;
    title: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    description: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    questions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"text">;
        maxLength: z.ZodDefault<z.ZodNumber>;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"email">;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"number">;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"date">;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        type: z.ZodLiteral<"select">;
        options: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>>;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
    }, z.core.$strict>], "type">>;
    pages: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        description: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        questionIds: z.ZodArray<z.ZodString>;
        sections: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            title: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
            description: z.ZodOptional<z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>>;
            visibleWhen: z.ZodOptional<z.ZodObject<{
                match: z.ZodEnum<{
                    any: "any";
                    all: "all";
                }>;
                conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        equals: "equals";
                        notEquals: "notEquals";
                        contains: "contains";
                        greaterThan: "greaterThan";
                        lessThan: "lessThan";
                    }>;
                    value: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        answered: "answered";
                        notAnswered: "notAnswered";
                    }>;
                }, z.core.$strict>], "operator">>;
            }, z.core.$strict>>;
            questionIds: z.ZodArray<z.ZodString>;
            subsections: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                title: z.ZodObject<{
                    en: z.ZodString;
                    fr: z.ZodString;
                }, z.core.$strict>;
                description: z.ZodOptional<z.ZodObject<{
                    en: z.ZodString;
                    fr: z.ZodString;
                }, z.core.$strict>>;
                visibleWhen: z.ZodOptional<z.ZodObject<{
                    match: z.ZodEnum<{
                        any: "any";
                        all: "all";
                    }>;
                    conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                        questionId: z.ZodString;
                        operator: z.ZodEnum<{
                            equals: "equals";
                            notEquals: "notEquals";
                            contains: "contains";
                            greaterThan: "greaterThan";
                            lessThan: "lessThan";
                        }>;
                        value: z.ZodString;
                    }, z.core.$strict>, z.ZodObject<{
                        questionId: z.ZodString;
                        operator: z.ZodEnum<{
                            answered: "answered";
                            notAnswered: "notAnswered";
                        }>;
                    }, z.core.$strict>], "operator">>;
                }, z.core.$strict>>;
                questionIds: z.ZodArray<z.ZodString>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        branches: z.ZodArray<z.ZodObject<{
            when: z.ZodObject<{
                match: z.ZodEnum<{
                    any: "any";
                    all: "all";
                }>;
                conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        equals: "equals";
                        notEquals: "notEquals";
                        contains: "contains";
                        greaterThan: "greaterThan";
                        lessThan: "lessThan";
                    }>;
                    value: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        answered: "answered";
                        notAnswered: "notAnswered";
                    }>;
                }, z.core.$strict>], "operator">>;
            }, z.core.$strict>;
            destination: z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"page">;
                pageId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"end">;
            }, z.core.$strict>], "kind">;
        }, z.core.$strict>>;
        next: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"page">;
            pageId: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"end">;
        }, z.core.$strict>], "kind">>;
    }, z.core.$strict>>;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<3>;
    attachments: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
    }, z.core.$strict>>;
    title: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    description: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    questions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"text">;
        maxLength: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"email">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"number">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"date">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"select">;
        options: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>>;
        dependsOn: z.ZodOptional<z.ZodObject<{
            questionId: z.ZodString;
            optionsByValue: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
                value: z.ZodString;
                label: z.ZodObject<{
                    en: z.ZodString;
                    fr: z.ZodString;
                }, z.core.$strict>;
            }, z.core.$strict>>>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"list">;
        maxItems: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"repeat">;
        maxItems: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"table">;
        maxRows: z.ZodDefault<z.ZodNumber>;
        columns: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
            type: z.ZodEnum<{
                number: "number";
                date: "date";
                text: "text";
            }>;
            required: z.ZodBoolean;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"computed">;
        template: z.ZodString;
        sourceIds: z.ZodArray<z.ZodString>;
    }, z.core.$strict>], "type">>;
    pages: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        description: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        questionIds: z.ZodArray<z.ZodString>;
        groups: z.ZodArray<z.ZodType<AdvancedGroup, unknown, z.core.$ZodTypeInternals<AdvancedGroup, unknown>>>;
        branches: z.ZodArray<z.ZodObject<{
            when: z.ZodObject<{
                match: z.ZodEnum<{
                    any: "any";
                    all: "all";
                }>;
                conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        equals: "equals";
                        notEquals: "notEquals";
                        contains: "contains";
                        greaterThan: "greaterThan";
                        lessThan: "lessThan";
                    }>;
                    value: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        answered: "answered";
                        notAnswered: "notAnswered";
                    }>;
                }, z.core.$strict>], "operator">>;
            }, z.core.$strict>;
            destination: z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"page">;
                pageId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"end">;
            }, z.core.$strict>], "kind">;
        }, z.core.$strict>>;
        next: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"page">;
            pageId: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"end">;
        }, z.core.$strict>], "kind">>;
    }, z.core.$strict>>;
}, z.core.$strict>, z.ZodObject<{
    attachments: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
    }, z.core.$strict>>;
    title: z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>;
    description: z.ZodOptional<z.ZodObject<{
        en: z.ZodString;
        fr: z.ZodString;
    }, z.core.$strict>>;
    pages: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        description: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        questionIds: z.ZodArray<z.ZodString>;
        groups: z.ZodArray<z.ZodType<AdvancedGroup, unknown, z.core.$ZodTypeInternals<AdvancedGroup, unknown>>>;
        branches: z.ZodArray<z.ZodObject<{
            when: z.ZodObject<{
                match: z.ZodEnum<{
                    any: "any";
                    all: "all";
                }>;
                conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        equals: "equals";
                        notEquals: "notEquals";
                        contains: "contains";
                        greaterThan: "greaterThan";
                        lessThan: "lessThan";
                    }>;
                    value: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    questionId: z.ZodString;
                    operator: z.ZodEnum<{
                        answered: "answered";
                        notAnswered: "notAnswered";
                    }>;
                }, z.core.$strict>], "operator">>;
            }, z.core.$strict>;
            destination: z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"page">;
                pageId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"end">;
            }, z.core.$strict>], "kind">;
        }, z.core.$strict>>;
        next: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"page">;
            pageId: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"end">;
        }, z.core.$strict>], "kind">>;
    }, z.core.$strict>>;
    schemaVersion: z.ZodLiteral<4>;
    questions: z.ZodArray<z.ZodUnion<readonly [z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"text">;
        maxLength: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"email">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"number">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"date">;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"select">;
        options: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>>;
        dependsOn: z.ZodOptional<z.ZodObject<{
            questionId: z.ZodString;
            optionsByValue: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
                value: z.ZodString;
                label: z.ZodObject<{
                    en: z.ZodString;
                    fr: z.ZodString;
                }, z.core.$strict>;
            }, z.core.$strict>>>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"list">;
        maxItems: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"repeat">;
        maxItems: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"table">;
        maxRows: z.ZodDefault<z.ZodNumber>;
        columns: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
            type: z.ZodEnum<{
                number: "number";
                date: "date";
                text: "text";
            }>;
            required: z.ZodBoolean;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"computed">;
        template: z.ZodString;
        sourceIds: z.ZodArray<z.ZodString>;
    }, z.core.$strict>], "type">, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"table">;
        maxRows: z.ZodDefault<z.ZodNumber>;
        columns: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
            type: z.ZodEnum<{
                number: "number";
                date: "date";
                text: "text";
            }>;
            required: z.ZodBoolean;
        }, z.core.$strict>>;
        totals: z.ZodOptional<z.ZodEnum<{
            rows: "rows";
            columns: "columns";
            none: "none";
            both: "both";
        }>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"checkboxes">;
        options: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"multiselect">;
        options: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodObject<{
                en: z.ZodString;
                fr: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"budget">;
        config: z.ZodObject<{
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
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"activities">;
        config: z.ZodObject<{
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
    }, z.core.$strict>], "type">, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>;
        required: z.ZodBoolean;
        hint: z.ZodOptional<z.ZodObject<{
            en: z.ZodString;
            fr: z.ZodString;
        }, z.core.$strict>>;
        visibleWhen: z.ZodOptional<z.ZodObject<{
            match: z.ZodEnum<{
                any: "any";
                all: "all";
            }>;
            conditions: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    equals: "equals";
                    notEquals: "notEquals";
                    contains: "contains";
                    greaterThan: "greaterThan";
                    lessThan: "lessThan";
                }>;
                value: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                questionId: z.ZodString;
                operator: z.ZodEnum<{
                    answered: "answered";
                    notAnswered: "notAnswered";
                }>;
            }, z.core.$strict>], "operator">>;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"textarea">;
        maxLength: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>]>>;
}, z.core.$strict>]>;
/** Explicit editing upgrade; never mutates the archived source definition. */
export declare const upgradeSurvey: (definition: LegacySurvey | StructuredSurvey) => StructuredSurvey;
/** Authoring upgrade to v3. Archived revisions remain unchanged. */
export declare const upgradeToAdvancedSurvey: (definition: SurveyDefinition) => AdvancedSurvey;
export {};
