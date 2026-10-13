import { afterAll, beforeAll, expect, it } from 'vitest'
import type { Kysely } from 'kysely'
import pg from 'pg'
import type { FieldRule, SurveyDefinition } from '@gcs-ssc/survey'
import type { Database } from '../../server/db/schema'
import type { GovernmentActor } from '../../server/utils/government-access'
import { createDatabase } from '../../server/utils/database'
import { createAdministrator } from '../../server/utils/administrator-accounts'
import { createOrganization, updatePermissions } from '../../server/utils/portal'
import { decodePublicId } from '../../server/utils/public-identifiers'
import {
  createAgency,
  createProgram,
  createStream,
  saveCall,
  publishCall
} from '../../server/utils/government-structure'
import { createSurvey, attachSurvey } from '../../server/utils/surveys'
import { saveAgreement } from '../../server/utils/agreements'
import { saveSet, publishSet } from '../../server/utils/submission-sets'
import { startApplication } from '../../server/utils/applications'
import {
  startResponse,
  getResponse,
  mutateResponse,
  checkResponse
} from '../../server/utils/set-responses'

type Form = Extract<SurveyDefinition, { schemaVersion: 5 }>
type Answers = Record<string, string>
type Scenario = {
  name: string
  definition: () => Form
  valid: () => Answers
  invalidDraft?: () => Answers[]
  unfinished?: () => Answers[]
}
let db: Kysely<Database>,
  actor: GovernmentActor,
  agencyId: number,
  streamId: number,
  organizationId: number,
  userId: number,
  agreementId: number
const names = { nameEn: 'Rule boundary matrix', nameFr: 'Matrice des règles' }
const label = (value: string) => ({ en: value, fr: value })
const text = (id: string, rules?: FieldRule[]): Form['questions'][number] => ({
  id,
  type: 'text',
  label: label(id),
  required: false,
  maxLength: 100,
  ...(rules ? { rules } : {})
})
const form = (
  questions: Form['questions'],
  groups: Form['pages'][number]['groups'] = []
): Form => ({
  schemaVersion: 5,
  title: label('Field rules'),
  questions,
  pages: [
    {
      id: 'main',
      title: label('Responses'),
      questionIds: questions
        .filter((question) => !groups.some((group) => group.questionIds.includes(question.id)))
        .map((question) => question.id),
      groups,
      branches: []
    }
  ]
})
const rows = (...values: string[]) =>
  JSON.stringify(values.map((value, index) => ({ id: `r_${index}`, value })))
const amounts = (...values: string[]) =>
  JSON.stringify(values.map((amount, index) => ({ id: `r_${index}`, cells: { amount } })))
const day = (offset: number) => {
  const current = new Date()
  current.setUTCDate(current.getUTCDate() + offset)
  return current.toISOString().slice(0, 10)
}

beforeAll(async () => {
  const url = process.env.PORTAL_TEST_DATABASE_URL
  if (url) {
    if (!new URL(url).pathname.endsWith('_test'))
      throw new Error('Disposable test database required')
    const guard = new pg.Client({ connectionString: url })
    await guard.connect()
    try {
      if (
        (
          await guard.query(
            "SELECT 1 FROM information_schema.tables WHERE table_schema='public' LIMIT 1"
          )
        ).rowCount
      )
        throw new Error('Refusing a nonempty database')
    } finally {
      await guard.end()
    }
  }
  db = await createDatabase({ url })
  const administrator = await createAdministrator(db, {
    name: 'Root',
    email: 'root@field-rules.test',
    password: 'Root-test-only-2026!'
  })
  actor = { kind: 'administrator', administratorId: administrator.id }
  userId = (
    await db
      .insertInto('user')
      .values({
        name: 'Applicant',
        email: 'applicant@field-rules.test',
        emailVerified: false,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning('id')
      .executeTakeFirstOrThrow()
  ).id
  organizationId = decodePublicId(
    (await createOrganization(db, userId, { name: names.nameEn })).organization.id,
    'organization'
  )
  await updatePermissions(db, organizationId, userId, userId, {
    permissions: ['user', 'admin', 'application:manager', 'form:manager']
  })
  agencyId = (await createAgency(db, actor, names)).agency.id
  const programId = (await createProgram(db, actor, { agencyId, ...names })).program.id
  streamId = (await createStream(db, actor, { programId, ...names })).stream.id
  agreementId = (
    await saveAgreement(db, actor, {
      organizationId,
      streamId,
      ...names,
      agreementNumber: 'RULE-MATRIX',
      config: { fiscalYears: [], budgetLines: [] }
    })
  ).agreement.id
}, 60000)
afterAll(async () => {
  await db?.destroy()
})

const scenarios: Scenario[] = [
  {
    name: 'relative Today and field day offsets',
    definition: () =>
      form([
        {
          id: 'current',
          type: 'date',
          label: label('Current date'),
          required: false,
          rules: [
            {
              kind: 'compare',
              operator: 'greaterThanOrEqual',
              target: { kind: 'today', offsetDays: 2 }
            }
          ]
        },
        { id: 'start', type: 'date', label: label('Start date'), required: true },
        {
          id: 'end',
          type: 'date',
          label: label('End date'),
          required: false,
          rules: [
            {
              kind: 'compare',
              operator: 'greaterThanOrEqual',
              target: { kind: 'question', questionId: 'start', offsetDays: 30 }
            }
          ]
        }
      ]),
    valid: () => ({ current: day(10), start: '2027-01-01', end: '2027-01-31' }),
    invalidDraft: () => [
      { current: day(-10), start: '2027-01-01', end: '2027-01-31' },
      { current: day(10), start: '2027-01-01', end: '2027-01-30' }
    ]
  },
  {
    name: 'postal code, phone and identifier formats',
    definition: () =>
      form([
        text('postal', [{ kind: 'format', format: 'postalCode' }]),
        text('phone', [{ kind: 'format', format: 'phone' }]),
        text('identifier', [{ kind: 'format', format: 'identifier' }])
      ]),
    valid: () => ({ postal: 'K1A 0B1', phone: '+1 (613) 555-0100', identifier: 'PROJECT-123' }),
    invalidDraft: () => [{ postal: '12345' }, { phone: 'call me' }, { identifier: 'has spaces' }]
  },
  {
    name: 'configured acknowledgement choice',
    definition: () =>
      form([
        {
          id: 'ack',
          type: 'select',
          label: label('Certification'),
          required: false,
          options: [
            { value: 'yes', label: label('I agree') },
            { value: 'no', label: label('I decline') }
          ],
          rules: [{ kind: 'choice', value: 'yes' }]
        }
      ]),
    valid: () => ({ ack: 'yes' }),
    invalidDraft: () => [{ ack: 'no' }],
    unfinished: () => [{}]
  },
  ...(['atLeastOne', 'exactlyOne', 'all', 'allOrNone'] as const).map((mode) => ({
    name: `answer group ${mode}`,
    definition: () =>
      form([
        text('first'),
        text('second', [{ kind: 'group', mode, questionIds: ['first', 'second'] }])
      ]),
    valid: (): Answers =>
      mode === 'all' || mode === 'allOrNone'
        ? { first: 'First', second: 'Second' }
        : { first: 'First' },
    ...(mode === 'exactlyOne'
      ? { invalidDraft: () => [{ first: 'First', second: 'Second' }] }
      : {}),
    unfinished: (): Answers[] => [mode === 'allOrNone' ? { first: 'First' } : {}]
  })),
  {
    name: 'selection count limits',
    definition: () =>
      form([
        {
          id: 'choices',
          type: 'checkboxes',
          label: label('Choices'),
          required: false,
          options: ['a', 'b', 'c'].map((value) => ({ value, label: label(value) })),
          rules: [{ kind: 'count', min: 2, max: 2 }]
        }
      ]),
    valid: () => ({ choices: JSON.stringify(['a', 'b']) }),
    invalidDraft: () => [{ choices: JSON.stringify(['a', 'b', 'c']) }],
    unfinished: () => [{ choices: JSON.stringify(['a']) }]
  },
  {
    name: 'repeat row count limits',
    definition: () =>
      form([
        {
          id: 'people',
          type: 'repeat',
          label: label('People'),
          required: false,
          maxItems: 5,
          rules: [{ kind: 'count', min: 2, max: 2 }]
        }
      ]),
    valid: () => ({ people: rows('', '') }),
    invalidDraft: () => [{ people: rows('', '', '') }],
    unfinished: () => [{ people: rows('') }]
  },
  {
    name: 'repeated child uniqueness',
    definition: () =>
      form(
        [
          {
            id: 'people',
            type: 'repeat',
            label: label('People'),
            required: false,
            maxItems: 3,
            rules: [{ kind: 'unique', questionIds: ['name'] }]
          },
          text('name')
        ],
        [
          {
            id: 'person',
            title: label('Person'),
            repeatFor: 'people',
            questionIds: ['name'],
            groups: []
          }
        ]
      ),
    valid: () => ({ people: rows('', ''), 'name@r_0': 'Sam', 'name@r_1': 'Jo' }),
    invalidDraft: () => [{ people: rows('', ''), 'name@r_0': 'Sam', 'name@r_1': 'Sam' }]
  },
  ...(['equals', 'lessThanOrEqual'] as const).map((operator) => ({
    name: `table total ${operator}`,
    definition: () =>
      form([
        { id: 'budget', type: 'number', label: label('Budget'), required: true },
        {
          id: 'costs',
          type: 'table',
          label: label('Costs'),
          required: false,
          maxRows: 5,
          columns: [{ id: 'amount', type: 'number', label: label('Amount'), required: false }],
          rules: [
            {
              kind: 'total',
              columnIds: ['amount'],
              operator,
              target: { kind: 'question', questionId: 'budget' }
            }
          ]
        }
      ]),
    valid: () => ({ budget: '0.30', costs: amounts('0.10', '0.20', '') }),
    ...(operator === 'equals'
      ? { unfinished: () => [{ budget: '0.30', costs: amounts('0.10') }] }
      : { invalidDraft: () => [{ budget: '0.30', costs: amounts('0.10', '0.21') }] })
  })),
  {
    name: 'same-row column date comparison',
    definition: () =>
      form([
        {
          id: 'activities',
          type: 'table',
          label: label('Activities'),
          required: false,
          maxRows: 5,
          columns: [
            { id: 'start', type: 'date', label: label('Start date'), required: true },
            {
              id: 'end',
              type: 'date',
              label: label('End date'),
              required: true,
              rules: [
                {
                  kind: 'compare',
                  operator: 'greaterThanOrEqual',
                  target: { kind: 'column', columnId: 'start' }
                }
              ]
            }
          ]
        }
      ]),
    valid: () => ({
      activities: JSON.stringify([{ id: 'r_0', cells: { start: '2027-01-01', end: '2027-01-02' } }])
    }),
    invalidDraft: () => [
      {
        activities: JSON.stringify([
          { id: 'r_0', cells: { start: '2027-01-01', end: '2026-12-31' } }
        ])
      }
    ]
  }
]

for (const kind of ['application', 'agreement'] as const) {
  it.each(scenarios)(
    `${kind}: $name rejects invalid answers atomically and recovers to submission`,
    async (scenario) => {
      const survey = (
        await createSurvey(db, actor, { agencyId, definition: scenario.definition() })
      ).survey
      let draft: Awaited<ReturnType<typeof getResponse>>['response']
      if (kind === 'application') {
        const call = await saveCall(db, actor, {
          streamId,
          ...names,
          startDate: '2020-01-01',
          endDate: '2099-12-31'
        })
        await attachSurvey(db, actor, call.id, { surveyId: survey.id, revision: survey.revision })
        await publishCall(db, actor, call.id, { published: true })
        draft = (await startApplication(db, organizationId, userId, call.id, { locale: 'en' }))
          .response
      } else {
        const configured = (
          await saveSet(db, actor, {
            organizationId,
            agencyId,
            agreementId,
            ...names,
            items: [
              { id: 'form', kind: 'survey', surveyId: survey.id, surveyRevision: survey.revision }
            ]
          })
        ).set
        const published = (
          await publishSet(
            db,
            actor,
            configured.id,
            { expectedRevision: configured.revision },
            true
          )
        ).set
        draft = (await startResponse(db, organizationId, userId, published.id, { locale: 'en' }))
          .response
      }
      const id = draft.id,
        itemId = draft.items[0]!.id
      const save = async (answers: Answers) => {
        draft = (
          await mutateResponse(db, organizationId, userId, id, 'save', {
            expectedRevision: draft.revision,
            items: [{ id: itemId, kind: 'survey', answers }]
          })
        ).response
      }
      const rejectsUnchanged = async (operation: () => Promise<unknown>) => {
        const before = (await getResponse(db, organizationId, userId, id)).response
        await expect(operation()).rejects.toMatchObject({ statusCode: 400 })
        expect((await getResponse(db, organizationId, userId, id)).response).toEqual(before)
      }
      await save({})
      for (const answers of scenario.invalidDraft?.() ?? [])
        await rejectsUnchanged(() => save(answers))
      for (const answers of scenario.unfinished?.() ?? []) {
        await save(answers)
        await rejectsUnchanged(() =>
          checkResponse(db, organizationId, userId, id, { expectedRevision: draft.revision })
        )
        await rejectsUnchanged(() =>
          mutateResponse(db, organizationId, userId, id, 'submit', {
            expectedRevision: draft.revision,
            balanceRevision: null,
            warningsAcknowledged: true
          })
        )
      }
      const valid = scenario.valid()
      await save(valid)
      await checkResponse(db, organizationId, userId, id, { expectedRevision: draft.revision })
      const submitted = (
        await mutateResponse(db, organizationId, userId, id, 'submit', {
          expectedRevision: draft.revision,
          balanceRevision: null,
          warningsAcknowledged: true
        })
      ).response
      expect(submitted.status).toBe('submitted')
      expect(submitted.items[0]).toMatchObject({ answers: valid })
      expect(submitted.snapshot.items[0]!.survey!.schemaVersion).toBe(5)
    }
  )
}
