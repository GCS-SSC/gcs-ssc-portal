import { calculateBudget, centsText, moneyCents } from './grants.js';
const choices = (options, locale) => options.map(option => ({ value: option.id, label: option.label[locale] }));
export const budgetFields = (config, row, locale) => {
    const item = config.costItems.find(option => option.id === row.costItemId);
    const calculated = Boolean(item && item.calculation.mode !== 'manual');
    const fields = [
        { path: 'fiscalYearId', label: 'grantFiscalYear', value: row.fiscalYearId, type: 'select', required: true, options: choices(config.fiscalYears, locale) },
        { path: 'costItemId', label: 'grantCostItem', value: row.costItemId, type: 'select', required: true, options: config.costItems.map(option => ({ value: option.id, label: `${config.categories.find(category => category.id === option.categoryId)?.label[locale] ?? ''} / ${option.label[locale]}` })) },
        { path: 'subsection', label: 'grantSubsection', value: row.subsection, type: 'text', required: true, maxLength: 255 },
        { path: 'description', label: 'grantDescription', value: row.description, type: 'textarea', required: true, maxLength: 5000 },
        { path: 'currency', label: 'grantCurrency', value: row.currency, type: 'select', required: true, options: config.currencies.map(value => ({ value, label: value })) },
        { path: 'totalCost', label: 'grantTotalCost', value: row.totalCost, type: 'money', required: true },
        { path: 'programFunding', label: calculated ? 'grantCalculatedFunding' : 'grantProgramFunding', value: row.programFunding, type: 'money', required: !calculated, readonly: calculated }
    ];
    if (calculated)
        fields.push({ path: 'percentage', label: 'grantPercentage',
            value: row.percentage || String(item.calculation.percentage), type: 'percentage', required: false, readonly: !item.calculation.allowOverride });
    return fields;
};
export const fundingFields = (config, source, locale) => [
    { path: 'subtypeId', label: 'grantFundingSubtype', value: source.subtypeId, type: 'select', required: true,
        options: config.fundingSubtypes.map(option => ({ value: option.id, label: `${config.fundingTypes.find(type => type.id === option.typeId)?.label[locale] ?? ''} / ${option.label[locale]}` })) },
    { path: 'amount', label: 'grantAmount', value: source.amount, type: 'money', required: true },
    ...['en', 'fr'].map(language => ({ path: `description.${language}`, label: language === 'en' ? 'grantSourceDescriptionEn' : 'grantSourceDescriptionFr',
        value: source.description[language], type: 'textarea', required: false, maxLength: 255 }))
];
export const activityFields = (config, row, locale) => [
    ...['name', 'description', 'expectedResults'].flatMap(field => (config.bilingual ? ['en', 'fr'] : [locale]).map(language => ({ path: `${field}.${language}`,
        label: `grantActivity${field === 'name' ? 'Name' : field === 'description' ? 'Description' : 'Results'}${config.bilingual ? language === 'en' ? 'En' : 'Fr' : ''}`,
        value: row[field][language], type: field === 'name' ? 'text' : 'textarea',
        required: config.bilingual || (!row[field].en.trim() && !row[field].fr.trim()) || Boolean(row[field][language].trim()), maxLength: field === 'name' ? 255 : 5000 }))),
    { path: 'startDate', label: 'grantStartDate', value: row.startDate, type: 'date', required: true },
    { path: 'endDate', label: 'grantEndDate', value: row.endDate, type: 'date', required: true }
];
/** Exact aggregates are grouped by year/currency; currencies are never added together. */
export const budgetTotals = (config, rows, groupBy = 'year') => {
    const groups = new Map();
    for (const row of calculateBudget(config, rows)) {
        const categoryId = groupBy === 'category' ? config.costItems.find(item => item.id === row.costItemId)?.categoryId : undefined;
        const groupKey = JSON.stringify([row.fiscalYearId, row.currency, categoryId]);
        const group = groups.get(groupKey) ?? [];
        group.push({ row, categoryId });
        groups.set(groupKey, group);
    }
    return [...groups.values()].map(group => {
        let total = BigInt(0), program = BigInt(0), other = BigInt(0), stacking = BigInt(0), costSharing = BigInt(0);
        for (const { row } of group) {
            total += row.totalCost ? moneyCents(row.totalCost) : BigInt(0);
            program += row.programFunding ? moneyCents(row.programFunding) : BigInt(0);
            for (const funding of row.otherFunding) {
                const amount = funding.amount ? moneyCents(funding.amount) : BigInt(0);
                other += amount;
                const subtype = config.fundingSubtypes.find(option => option.id === funding.subtypeId);
                const type = config.fundingTypes.find(option => option.id === subtype?.typeId);
                if (type?.stacking)
                    stacking += amount;
                if (type?.costSharing)
                    costSharing += amount;
            }
        }
        return { fiscalYearId: group[0].row.fiscalYearId, currency: group[0].row.currency, categoryId: group[0].categoryId,
            totalCost: centsText(total), programFunding: centsText(program), otherFunding: centsText(other), gap: centsText(total - program - other),
            stacking: centsText(stacking), costSharing: centsText(costSharing) };
    });
};
