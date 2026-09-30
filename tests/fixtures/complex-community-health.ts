import { emptyActivityConfig, emptyBudgetConfig, type AdvancedSurvey } from '@gcs-ssc/survey'
const label = (en: string, fr: string) => ({ en, fr })
const option = (id: string, en: string, fr: string) => ({ id, label: label(en, fr) })
const choice = (value: string, en: string, fr: string) => ({ value, label: label(en, fr) })
const condition = (questionId: string, value: string) => ({
  match: 'all' as const,
  conditions: [{ questionId, operator: 'equals' as const, value }]
})
/** Versioned fixture: every provider field type, branches, nested repeats and private attachments. */
export const complexCommunityHealthForm = (): AdvancedSurvey => ({
  schemaVersion: 4,
  title: label('Community health project plan', 'Plan de projet de santé communautaire'),
  description: label(
    'Tell us how your organization will improve access to community health services. Prepare your delivery locations, activities and budget before you begin.',
    'Expliquez comment votre organisme améliorera l’accès aux services de santé communautaire. Préparez vos lieux de prestation, vos activités et votre budget avant de commencer.'
  ),
  attachments: { enabled: true },
  questions: [
    {
      id: 'project_name',
      type: 'text',
      required: true,
      label: label('Project name', 'Nom du projet'),
      maxLength: 200
    },
    {
      id: 'summary',
      type: 'textarea',
      required: true,
      label: label(
        'Community need and project summary',
        'Besoin communautaire et résumé du projet'
      ),
      maxLength: 2000,
      hint: label(
        'Explain who will benefit and the change you expect.',
        'Expliquez qui en bénéficiera et le changement attendu.'
      )
    },
    {
      id: 'contact_email',
      type: 'email',
      required: true,
      label: label('Project contact email', 'Courriel de la personne responsable')
    },
    {
      id: 'participant_count',
      type: 'number',
      required: true,
      label: label('Participants already enrolled', 'Participants déjà inscrits'),
      hint: label(
        'Enter 0 if recruitment has not started.',
        'Inscrivez 0 si le recrutement n’a pas commencé.'
      )
    },
    {
      id: 'start_date',
      type: 'date',
      required: true,
      label: label('Planned start date', 'Date de début prévue')
    },
    {
      id: 'pathway',
      type: 'select',
      required: true,
      label: label('Application pathway', 'Volet de la demande'),
      options: [
        choice('full', 'Detailed project plan', 'Plan de projet détaillé'),
        choice('summary', 'Initial expression of interest', 'Manifestation d’intérêt initiale')
      ]
    },
    {
      id: 'delivery_region',
      type: 'select',
      required: true,
      label: label('Delivery region', 'Région de prestation'),
      options: [
        choice('north', 'Northern communities', 'Collectivités du Nord'),
        choice('south', 'Southern communities', 'Collectivités du Sud'),
        choice('remote', 'Remote consultation', 'Consultation à distance')
      ],
      dependsOn: {
        questionId: 'pathway',
        optionsByValue: {
          full: [
            choice('north', 'Northern communities', 'Collectivités du Nord'),
            choice('south', 'Southern communities', 'Collectivités du Sud')
          ],
          summary: [choice('remote', 'Remote consultation', 'Consultation à distance')]
        }
      }
    },
    {
      id: 'services',
      type: 'checkboxes',
      required: true,
      label: label('Services offered', 'Services offerts'),
      options: [
        choice('advice', 'Health advice', 'Conseils de santé'),
        choice('training', 'Community training', 'Formation communautaire')
      ]
    },
    {
      id: 'populations',
      type: 'multiselect',
      required: true,
      label: label('Priority populations', 'Populations prioritaires'),
      options: [choice('youth', 'Youth', 'Jeunes'), choice('seniors', 'Seniors', 'Aînés')]
    },
    {
      id: 'project_reference',
      type: 'computed',
      required: false,
      label: label('Project reference', 'Référence du projet'),
      template: '{{project_name}} — {{participant_count}}',
      sourceIds: ['project_name', 'participant_count']
    },
    {
      id: 'partners',
      type: 'list',
      required: true,
      label: label('Delivery partner names', 'Noms des partenaires de prestation'),
      maxItems: 3
    },
    {
      id: 'partner_contact',
      type: 'email',
      required: true,
      label: label('Partner contact email', 'Courriel du partenaire')
    },
    {
      id: 'sites',
      type: 'repeat',
      required: true,
      label: label('Project locations', 'Lieux du projet'),
      maxItems: 3
    },
    {
      id: 'site_name',
      type: 'text',
      required: true,
      label: label('Location name', 'Nom du lieu'),
      maxLength: 200
    },
    {
      id: 'training_note',
      type: 'textarea',
      required: true,
      label: label('Training arrangements', 'Modalités de formation'),
      maxLength: 1000,
      visibleWhen: {
        match: 'all',
        conditions: [{ questionId: 'services', operator: 'contains', value: 'training' }]
      }
    },
    {
      id: 'clinics',
      type: 'repeat',
      required: true,
      label: label('Clinic sessions at this location', 'Séances cliniques à ce lieu'),
      maxItems: 3
    },
    {
      id: 'clinic_date',
      type: 'date',
      required: true,
      label: label('Clinic session date', 'Date de la séance clinique')
    },
    {
      id: 'clinic_capacity',
      type: 'number',
      required: true,
      label: label('Confirmed bookings', 'Réservations confirmées')
    },
    {
      id: 'clinic_reference',
      type: 'computed',
      required: false,
      label: label('Clinic reference', 'Référence de la clinique'),
      template: '{{site_name}} — {{clinic_date}}',
      sourceIds: ['site_name', 'clinic_date']
    },
    {
      id: 'milestones',
      type: 'table',
      required: true,
      label: label('Delivery milestones', 'Jalons de prestation'),
      maxRows: 3,
      totals: 'both',
      columns: [
        { id: 'milestone', label: label('Milestone', 'Jalon'), type: 'text', required: true },
        { id: 'sessions', label: label('Sessions', 'Séances'), type: 'number', required: true },
        { id: 'due_date', label: label('Due date', 'Échéance'), type: 'date', required: true }
      ]
    },
    {
      id: 'budget',
      type: 'budget',
      required: true,
      label: label('Project budget', 'Budget du projet'),
      config: {
        ...emptyBudgetConfig(),
        maxRows: 10,
        categories: [
          option('delivery', 'Service delivery', 'Prestation des services'),
          option('administration', 'Administration', 'Administration')
        ],
        fiscalYears: [option('year2026', '2026–2027', '2026–2027')],
        currencies: ['CAD'],
        costItems: [
          {
            ...option('facilitators', 'Community facilitators', 'Animateurs communautaires'),
            categoryId: 'delivery',
            calculation: {
              mode: 'manual',
              sourceCategoryId: null,
              percentage: null,
              allowOverride: false
            }
          },
          {
            ...option(
              'administration_fee',
              'Administration (10% of delivery)',
              'Administration (10 % de la prestation)'
            ),
            categoryId: 'administration',
            calculation: {
              mode: 'category',
              sourceCategoryId: 'delivery',
              percentage: 10,
              allowOverride: true
            }
          }
        ],
        fundingTypes: [
          {
            ...option('public', 'Public funding', 'Financement public'),
            stacking: true,
            costSharing: true
          }
        ],
        fundingSubtypes: [
          {
            ...option('province', 'Provincial contribution', 'Contribution provinciale'),
            typeId: 'public'
          }
        ]
      }
    },
    {
      id: 'activities',
      type: 'activities',
      required: true,
      label: label('Project activities', 'Activités du projet'),
      config: {
        ...emptyActivityConfig(),
        maxRows: 3,
        bilingual: true,
        requireOutcomes: true,
        requireResponsibleParties: true,
        outcomes: [
          option(
            'access',
            'Improved access to health services',
            'Accès amélioré aux services de santé'
          )
        ],
        responsibleParties: [option('applicant', 'Applicant organization', 'Organisme demandeur')]
      }
    },
    {
      id: 'declaration',
      type: 'select',
      required: true,
      label: label('Information declaration', 'Déclaration sur les renseignements'),
      hint: label(
        'Confirm that the information is accurate to the best of your knowledge.',
        'Confirmez que les renseignements sont exacts au meilleur de votre connaissance.'
      ),
      options: [
        choice(
          'confirmed',
          'I confirm the information is accurate',
          'Je confirme l’exactitude des renseignements'
        )
      ]
    }
  ],
  pages: [
    {
      id: 'profile',
      title: label('Your project', 'Votre projet'),
      description: label(
        'Start with your project and contact details. Choose a detailed plan or an initial expression of interest.',
        'Commencez par les détails du projet et les coordonnées. Choisissez un plan détaillé ou une manifestation d’intérêt initiale.'
      ),
      questionIds: [
        'project_name',
        'summary',
        'contact_email',
        'participant_count',
        'start_date',
        'pathway',
        'delivery_region',
        'services',
        'populations',
        'project_reference'
      ],
      groups: [],
      branches: [
        {
          when: condition('pathway', 'summary'),
          destination: { kind: 'page', pageId: 'confirmation' }
        }
      ]
    },
    {
      id: 'locations',
      title: label('Partners and locations', 'Partenaires et lieux'),
      questionIds: ['partners', 'sites', 'milestones'],
      groups: [
        {
          id: 'partner_details',
          title: label('Partner: {{item}}', 'Partenaire : {{item}}'),
          repeatFor: 'partners',
          questionIds: ['partner_contact'],
          groups: []
        },
        {
          id: 'site_details',
          title: label('Location {{item}}', 'Lieu {{item}}'),
          repeatFor: 'sites',
          questionIds: ['site_name', 'training_note', 'clinics'],
          groups: [
            {
              id: 'clinic_details',
              title: label('Clinic {{item}}', 'Clinique {{item}}'),
              repeatFor: 'clinics',
              questionIds: ['clinic_date', 'clinic_capacity', 'clinic_reference'],
              groups: []
            }
          ]
        }
      ],
      branches: []
    },
    {
      id: 'plan',
      title: label('Activities and funding', 'Activités et financement'),
      description: label(
        'Describe the activities in both official languages and enter the full project costs and contributions.',
        'Décrivez les activités dans les deux langues officielles et indiquez tous les coûts et contributions du projet.'
      ),
      questionIds: ['budget', 'activities'],
      groups: [],
      branches: []
    },
    {
      id: 'confirmation',
      title: label('Confirm your information', 'Confirmez vos renseignements'),
      questionIds: ['declaration'],
      groups: [],
      branches: []
    }
  ]
})

/** Deterministic valid answer contract; browser tests author real controls independently. */
export const complexCommunityHealthAnswers = (): Record<string, string> => ({
  project_name: 'Northern Community Health',
  summary: 'Community-led health advice and training.',
  contact_email: 'health@example.org',
  participant_count: '0',
  start_date: '2026-10-01',
  pathway: 'full',
  delivery_region: 'north',
  services: '["advice","training"]',
  populations: '["youth","seniors"]',
  partners: '[{"id":"r_partner","value":"Northern Health Partner"}]',
  'partner_contact@r_partner': 'partner@example.org',
  sites: '[{"id":"r_site","value":""}]',
  'site_name@r_site': 'Northern Community Centre',
  'training_note@r_site': 'Accessible bilingual training.',
  'clinics@r_site': '[{"id":"r_clinic","value":""}]',
  'clinic_date@r_site@r_clinic': '2026-10-15',
  'clinic_capacity@r_site@r_clinic': '0',
  milestones:
    '[{"id":"r_milestone","cells":{"milestone":"Community launch","sessions":"0","due_date":"2026-10-01"}}]',
  budget: JSON.stringify({
    version: 1,
    rows: [
      {
        id: 'r_cost',
        fiscalYearId: 'year2026',
        costItemId: 'facilitators',
        subsection: 'Delivery',
        description: 'Community facilitator costs',
        currency: 'CAD',
        totalCost: '1500.00',
        programFunding: '1000.00',
        percentage: '',
        otherFunding: [
          {
            id: 'r_funding',
            subtypeId: 'province',
            amount: '500.00',
            description: { en: 'Provincial contribution', fr: 'Contribution provinciale' }
          }
        ]
      },
      {
        id: 'r_admin',
        fiscalYearId: 'year2026',
        costItemId: 'administration_fee',
        subsection: 'Administration',
        description: 'Delivery administration',
        currency: 'CAD',
        totalCost: '100.00',
        programFunding: '100.00',
        percentage: '',
        otherFunding: []
      }
    ]
  }),
  activities: JSON.stringify({
    version: 1,
    rows: [
      {
        id: 'r_activity',
        name: { en: 'Community health clinics', fr: 'Cliniques de santé communautaire' },
        description: {
          en: 'Deliver accessible health advice.',
          fr: 'Offrir des conseils de santé accessibles.'
        },
        expectedResults: {
          en: 'Improve access to health services.',
          fr: 'Améliorer l’accès aux services de santé.'
        },
        startDate: '2026-10-01',
        endDate: '2026-12-31',
        outcomeIds: ['access'],
        responsiblePartyIds: ['applicant']
      }
    ]
  }),
  declaration: 'confirmed'
})
