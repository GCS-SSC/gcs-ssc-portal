import { emptyBudgetConfig, emptyActivityConfig, type AdvancedSurvey } from '@gcs-ssc/survey'
const option = (id: string, en: string, fr = en, gcsId?: string) => ({ id, label: { en, fr }, ...(gcsId ? { gcsId } : {}) })
export const grantForm = (): AdvancedSurvey => ({ schemaVersion: 4, title: { en: 'Project grant plan', fr: 'Plan de financement' },
  questions: [
    { id: 'budget', type: 'budget', required: true, label: { en: 'Project budget', fr: 'Budget du projet' }, config: {
      ...emptyBudgetConfig(), categories: [option('staff', 'Staff', 'Personnel', '1'), option('overhead', 'Administration', 'Administration', '2')],
      fiscalYears: [option('year', '2028–2029', '2028–2029', '3')],
      costItems: [{ ...option('salary', 'Salaries', 'Salaires', '101'), categoryId: 'staff', calculation: { mode: 'manual', sourceCategoryId: null, percentage: null, allowOverride: false } },
        { ...option('admin', 'Administration fee', 'Frais administratifs', '102'), categoryId: 'overhead', calculation: { mode: 'category', sourceCategoryId: 'staff', percentage: 10, allowOverride: false } }],
      fundingTypes: [{ ...option('government', 'Government', 'Gouvernement', '6'), stacking: true, costSharing: true }],
      fundingSubtypes: [{ ...option('province', 'Province', 'Province', '7'), typeId: 'government' }] } },
    { id: 'activities', type: 'activities', required: true, label: { en: 'Project activities', fr: 'Activités du projet' }, config: {
      ...emptyActivityConfig(), outcomes: [option('training', 'Skills development', 'Développement des compétences', '8')],
      responsibleParties: [option('applicant', 'Applicant organization', 'Organisme demandeur')] } }
    ,{ id: 'services', type: 'checkboxes', required: true, label: { en: 'Service areas', fr: 'Domaines de service' }, options: [{ value: 'training', label: { en: 'Training services', fr: 'Services de formation' } }, { value: 'research', label: { en: 'Research services', fr: 'Services de recherche' } }] }
    ,{ id: 'regions', type: 'multiselect', required: true, label: { en: 'Regions', fr: 'Régions' }, options: [{ value: 'north', label: { en: 'North', fr: 'Nord' } }, { value: 'south', label: { en: 'South', fr: 'Sud' } }] }
    ,{ id: 'dropdown', type: 'select', required: true, label: { en: 'Delivery method', fr: 'Mode de prestation' }, options: [{ value: 'online', label: { en: 'Online', fr: 'En ligne' } }, { value: 'inperson', label: { en: 'In person', fr: 'En personne' } }] }
    ,{ id: 'amounts', type: 'table', required: true, label: { en: 'Annual amounts', fr: 'Montants annuels' }, maxRows: 5, totals: 'both', columns: [{ id: 'total', label: { en: 'Year one', fr: 'Première année' }, type: 'number', required: true }, { id: 'second', label: { en: 'Year two', fr: 'Deuxième année' }, type: 'number', required: false }] }
    ,{ id: 'rationale', type: 'textarea', required: true, label: { en: 'Project rationale', fr: 'Justification du projet' }, maxLength: 2000 }
  ], pages: [{ id: 'plan', title: { en: 'Your project', fr: 'Votre projet' }, questionIds: ['budget', 'activities', 'services', 'regions', 'dropdown', 'amounts', 'rationale'], groups: [], branches: [] }] })
