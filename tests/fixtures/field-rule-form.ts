import type { SurveyDefinition } from '@gcs-ssc/survey'

export const fieldRuleForm = (): SurveyDefinition => ({
  schemaVersion: 5,
  title: { en: 'Project dates and amount', fr: 'Dates et montant du projet' },
  questions: [
    { id: 'start', type: 'date', label: { en: 'Start date', fr: 'Date de début' }, required: true },
    {
      id: 'end',
      type: 'date',
      label: { en: 'End date', fr: 'Date de fin' },
      required: true,
      rules: [
        {
          kind: 'compare',
          operator: 'greaterThan',
          target: { kind: 'question', questionId: 'start' }
        }
      ]
    },
    {
      id: 'amount',
      type: 'number',
      label: { en: 'Requested amount', fr: 'Montant demandé' },
      required: true,
      rules: [
        { kind: 'compare', operator: 'greaterThanOrEqual', target: { kind: 'value', value: '0' } },
        { kind: 'compare', operator: 'lessThanOrEqual', target: { kind: 'value', value: '100' } },
        { kind: 'precision', decimalPlaces: 2 }
      ]
    },
    {
      id: 'details',
      type: 'text',
      label: { en: 'Project details', fr: 'Détails du projet' },
      required: false,
      maxLength: 500,
      rules: [
        { kind: 'length', min: 3, max: 20 },
        {
          kind: 'required',
          when: {
            match: 'all',
            conditions: [{ questionId: 'amount', operator: 'greaterThan', value: '0' }]
          }
        }
      ]
    }
  ],
  pages: [
    {
      id: 'project',
      title: { en: 'Your project', fr: 'Votre projet' },
      questionIds: ['start', 'end', 'amount', 'details'],
      groups: [],
      branches: []
    }
  ]
})

export const validRuleAnswers = {
  start: '2027-01-01',
  end: '2027-01-02',
  amount: '50.25',
  details: 'A project'
}

export const fullRuleForm = (): SurveyDefinition => {
  const definition = fieldRuleForm()
  if (definition.schemaVersion !== 5) throw new Error('Field rules require version 5')
  definition.questions.push(
    {
      id: 'website',
      type: 'text',
      label: { en: 'Project website', fr: 'Site Web du projet' },
      required: false,
      maxLength: 500,
      rules: [{ kind: 'format', format: 'url' }]
    },
    {
      id: 'records',
      type: 'table',
      label: { en: 'Project costs', fr: 'Coûts du projet' },
      required: false,
      maxRows: 5,
      columns: [
        {
          id: 'name',
          type: 'text',
          label: { en: 'Project name', fr: 'Nom du projet' },
          required: true
        },
        {
          id: 'cost',
          type: 'number',
          label: { en: 'Cost', fr: 'Coût' },
          required: true,
          rules: [
            {
              kind: 'compare',
              operator: 'greaterThanOrEqual',
              target: { kind: 'value', value: '0' }
            }
          ]
        }
      ],
      rules: [{ kind: 'unique', columnIds: ['name'] }]
    }
  )
  definition.pages[0]!.questionIds.push('website', 'records')
  return definition
}
