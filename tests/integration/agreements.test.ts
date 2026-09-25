import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Kysely, sql } from 'kysely'
import pg from 'pg'
import { v7 as uuid } from 'uuid'
import { migrate } from '../../server/db/migrations'
import { pgliteDialect } from '../../server/db/pglite-dialect'
import type { Database } from '../../server/db/schema'
import { createDatabase } from '../../server/utils/database'
import { createAdministrator } from '../../server/utils/administrator-accounts'
import { createAgency, createProgram, createStream } from '../../server/utils/government-structure'
import { createOrganization, updatePermissions } from '../../server/utils/portal'
import type { GovernmentActor } from '../../server/utils/government-access'
import { createSurvey } from '../../server/utils/surveys'
import {
  saveAgreement,
  updateBalances,
  getAgreement,
  organizationAgreements
} from '../../server/utils/agreements'
import { saveSet, publishSet } from '../../server/utils/submission-sets'
import {
  startResponse,
  mutateResponse,
  checkResponse,
  getResponse,
  exportSubmission
} from '../../server/utils/set-responses'
import { agreementInput, money, externalId, setSubjects } from '../../shared/schemas/agreements'
import type { FundingAgreement } from '../../shared/types/agreements'
let db: Kysely<Database>,
  root: GovernmentActor,
  organizationId: string,
  agencyId: string,
  streamId: string
const owner = 'agreement-owner',
  viewer = 'agreement-viewer',
  contributor = 'agreement-contributor',
  manager = 'agreement-manager'
const names = (name: string) => ({ nameEn: name, nameFr: name + ' FR' })
beforeAll(async () => {
  const url = process.env.PORTAL_TEST_DATABASE_URL
  if (url) {
    if (!new URL(url).pathname.endsWith('_test'))
      throw new Error('Disposable test database required')
    const guard = new pg.Client({ connectionString: url })
    await guard.connect()
    try {
      const existing = await guard.query(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' LIMIT 1"
      )
      if (existing.rowCount) throw new Error('Refusing a nonempty PostgreSQL test database')
    } finally {
      await guard.end()
    }
  }
  db = await createDatabase({ url })
  const account = await createAdministrator(db, {
    name: 'Root',
    email: 'root@agreements.test',
    password: 'Root-test-only-2026!'
  })
  root = { kind: 'administrator', administratorId: account.id }
  for (const id of [owner, viewer, contributor, manager])
    await db
      .insertInto('user')
      .values({
        id,
        name: id,
        email: id + '@agreements.test',
        emailVerified: false,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .execute()
  const org = await createOrganization(db, owner, {
    name: 'Agreement organization',
    description: ''
  })
  organizationId = org.organization.id
  for (const userId of [viewer, contributor, manager]) {
    await db
      .insertInto('membership')
      .values({ organizationId, userId, joinedAt: new Date() })
      .execute()
    const level = userId === viewer ? 'viewer' : userId === contributor ? 'contributor' : 'manager'
    await updatePermissions(db, organizationId, owner, userId, {
      permissions: ['user', `claim:${level}`, `forecast:${level}`, `form:${level}`]
    })
  }
  agencyId = (await createAgency(db, root, names('Agency'))).agency.id
  const program = await createProgram(db, root, { ...names('Program'), agencyId })
  streamId = (await createStream(db, root, { ...names('Stream'), programId: program.program.id }))
    .stream.id
}, 60000)
afterAll(async () => {
  await db?.destroy()
})
const newAgreement = async (): Promise<FundingAgreement> =>
  (
    await saveAgreement(db, root, {
      ...names('Agreement'),
      organizationId,
      streamId,
      agreementNumber: 'AGR-100',
      config: {
        sourceSystem: 'gcs-ssc',
        foreignSystemId: String(Date.now()) + String(Math.floor(Math.random() * 1000)),
        externalStreamId: '9223372036854775806',
        externalApplicantRecipientId: '82',
        fiscalYears: [{ id: 'fy', startYear: 2026, foreignSystemId: '91' }],
        budgetLines: [
          {
            id: 'travel',
            fiscalYearId: 'fy',
            foreignSystemId: '9007199254740993',
            ...names('Travel'),
            costCategory: 'Operations',
            costSubsection: 'Travel',
            budgetedAmount: '99999999999999999.99',
            balance: '100.00',
            claimedAmount: '25.00',
            forecastAmount: '50.00',
            balanceAsOf: '2026-09-01T00:00:00Z',
            currency: 'cad'
          }
        ]
      }
    })
  ).agreement
const newSet = async (fundingAgreement: FundingAgreement, kind: 'claim' | 'forecast' = 'claim') => {
  const result = await saveSet(db, root, {
    ...names('Submission'),
    organizationId,
    agencyId,
    agreementId: fundingAgreement.id,
    items: [{ id: 'financial', kind, fiscalYearId: 'fy' }]
  })
  return (
    await publishSet(db, root, result.set.id, { expectedRevision: result.set.revision }, true)
  ).set
}
describe('agreement submissions and reconciliation', () => {
  it('stores extension statuses and preserves them when older updates omit the fields', async () => {
    const created = await newAgreement()
    expect(created).toMatchObject({ active: true, status: null })
    const value = agreementInput.parse({
      ...names('Agreement status'),
      organizationId,
      streamId,
      agreementNumber: created.agreementNumber,
      config: created.config,
      active: false,
      status: { en: 'On hold', fr: 'En suspens', colour: '#245A80' }
    })
    const updated = (
      await saveAgreement(db, root, { expectedRevision: created.revision, value }, created.id)
    ).agreement
    expect(updated).toMatchObject({ active: false, status: value.status })
    expect(
      (await organizationAgreements(db, organizationId, viewer)).agreements.find(
        (agreement) => agreement.id === created.id
      )
    ).toMatchObject({
      active: false,
      status: value.status,
      agencyNameEn: 'Agency',
      agencyNameFr: 'Agency FR'
    })
    const legacyValue = agreementInput.parse({
      nameEn: value.nameEn,
      nameFr: value.nameFr,
      organizationId,
      streamId,
      agreementNumber: value.agreementNumber,
      config: value.config
    })
    const retained = (
      await saveAgreement(
        db,
        root,
        { expectedRevision: updated.revision, value: legacyValue },
        created.id
      )
    ).agreement
    expect(retained).toMatchObject({ active: false, status: value.status })
    const cleared = (
      await saveAgreement(
        db,
        root,
        { expectedRevision: retained.revision, value: { ...legacyValue, status: null } },
        created.id
      )
    ).agreement
    expect(cleared).toMatchObject({ active: false, status: null })
    for (const status of [
      { en: '', fr: 'Français', colour: '#245A80' },
      { en: 'English', fr: 'Français', colour: 'red' },
      { en: 'English', fr: 'Français', colour: '#245A80', unsafe: true }
    ])
      expect(agreementInput.safeParse({ ...legacyValue, status }).success).toBe(false)
  })
  it('preserves exact decimal money and stable bigint identifiers', () => {
    expect(money.parse('99999999999999999.99')).toBe('99999999999999999.99')
    expect(money.parse('-1.2')).toBe('-1.20')
    expect(money.parse('-0')).toBe('0.00')
    expect(externalId.parse('9223372036854775807')).toBe('9223372036854775807')
    for (const value of [12.5, '1e2', '0.001', '100000000000000000.00'])
      expect(money.safeParse(value).success).toBe(false)
    for (const value of ['9223372036854775808', 'invalid', '-1', '', '1e3'])
      expect(externalId.safeParse(value).success).toBe(false)
  })
  it('gives contributors drafts, reserves final actions for managers, and allows acknowledged balance warnings', async () => {
    const fundingAgreement = await newAgreement(),
      set = await newSet(fundingAgreement)
    await expect(
      startResponse(db, organizationId, owner, set.id, { locale: 'en' })
    ).rejects.toMatchObject({ statusCode: 403 })
    await expect(
      startResponse(db, organizationId, viewer, set.id, { locale: 'en' })
    ).rejects.toMatchObject({ statusCode: 403 })
    const initial = await startResponse(db, organizationId, contributor, set.id, { locale: 'en' })
    const id = initial.response.id,
      item = initial.response.items[0]!
    if (item.kind !== 'claim') throw new Error('Expected claim')
    item.lines[0]!.amount = '125.5'
    const saved = await mutateResponse(db, organizationId, contributor, id, 'save', {
      expectedRevision: 1,
      items: [item]
    })
    if (!('response' in saved)) throw new Error('Expected response')
    expect(saved.response.items[0]).toMatchObject({ lines: [{ amount: '125.50' }] })
    await expect(
      mutateResponse(db, organizationId, contributor, id, 'submit', {
        expectedRevision: 2,
        balanceRevision: 1,
        warningsAcknowledged: true
      })
    ).rejects.toMatchObject({ statusCode: 403 })
    await expect(
      mutateResponse(db, organizationId, contributor, id, 'delete', { expectedRevision: 2 })
    ).rejects.toMatchObject({ statusCode: 403 })
    const check = await checkResponse(db, organizationId, manager, id, { expectedRevision: 2 })
    expect(check.warnings).toEqual([
      {
        kind: 'claim',
        budgetLineId: 'travel',
        amount: '125.50',
        balance: '100.00',
        reason: 'overBalance'
      }
    ])
    await expect(
      mutateResponse(db, organizationId, manager, id, 'submit', {
        expectedRevision: 2,
        balanceRevision: check.balanceRevision,
        warningsAcknowledged: false
      })
    ).rejects.toMatchObject({ statusCode: 409 })
    const submitted = await mutateResponse(db, organizationId, manager, id, 'submit', {
      expectedRevision: 2,
      balanceRevision: check.balanceRevision,
      warningsAcknowledged: true
    })
    if (!('response' in submitted)) throw new Error('Expected response')
    expect(submitted.response.status).toBe('submitted')
    const exported = await exportSubmission(db, root, submitted.response.submissionId!)
    expect(exported.submission).toMatchObject({
      balanceRevision: 1,
      balancesAtSubmission: [{ balance: '100.00', balanceAsOf: '2026-09-01T00:00:00Z' }],
      items: [
        {
          mappingComplete: true,
          claim: {
            agreementId: fundingAgreement.config.foreignSystemId,
            streamId: '9223372036854775806',
            fiscalYearId: '91',
            periodStart: 0,
            periodEnd: 11,
            lineItems: [{ budgetLineItemId: '9007199254740993', amount: '125.50', currency: 'cad' }]
          }
        }
      ]
    })
    await updateBalances(db, root, fundingAgreement.id, {
      expectedRevision: 1,
      asOf: '2026-09-02T00:00:00Z',
      lines: [
        {
          foreignSystemId: '9007199254740993',
          budgetedAmount: '200',
          balance: '74.50',
          claimedAmount: '125.50',
          forecastAmount: '0'
        }
      ]
    })
    expect((await getResponse(db, organizationId, viewer, id)).balances[0]).toMatchObject({
      balance: '74.50',
      claimedAmount: '125.50'
    })
    expect(await exportSubmission(db, root, submitted.response.submissionId!)).toEqual(exported)
    await expect(
      mutateResponse(db, organizationId, manager, id, 'delete', { expectedRevision: 3 })
    ).rejects.toMatchObject({ statusCode: 409 })
  })
  it('invalidates review on reconciliation, prevents stale balance writes and enforces optimistic draft concurrency', async () => {
    const fundingAgreement = await newAgreement(),
      set = await newSet(fundingAgreement)
    const initial = await startResponse(db, organizationId, contributor, set.id, { locale: 'fr' }),
      id = initial.response.id
    const item = initial.response.items[0]!
    if (item.kind !== 'claim') throw new Error('Expected claim')
    item.lines[0]!.amount = '80'
    const writes = await Promise.allSettled(
      [1, 2].map(() =>
        mutateResponse(db, organizationId, contributor, id, 'save', {
          expectedRevision: 1,
          items: [item]
        })
      )
    )
    expect(writes.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    const check = await checkResponse(db, organizationId, manager, id, { expectedRevision: 2 })
    const change = {
      expectedRevision: 1,
      asOf: '2026-09-03T00:00:00Z',
      lines: [{ foreignSystemId: '9007199254740993', budgetedAmount: '200', balance: '50' }]
    }
    await updateBalances(db, root, fundingAgreement.id, change)
    await expect(
      mutateResponse(db, organizationId, manager, id, 'submit', {
        expectedRevision: 2,
        balanceRevision: check.balanceRevision,
        warningsAcknowledged: true
      })
    ).rejects.toMatchObject({ statusCode: 409, data: { code: 'BALANCE_CHANGED' } })
    await expect(
      updateBalances(db, root, fundingAgreement.id, { ...change, expectedRevision: 2 })
    ).rejects.toMatchObject({ statusCode: 409 })
    const reviewed = await checkResponse(db, organizationId, manager, id, { expectedRevision: 2 })
    expect(reviewed.balanceRevision).toBe(2)
    expect(reviewed.warnings).toHaveLength(1)
    await updatePermissions(db, organizationId, owner, manager, {
      permissions: ['user', 'claim:viewer', 'forecast:manager', 'form:manager']
    })
    await expect(
      mutateResponse(db, organizationId, manager, id, 'submit', {
        expectedRevision: 2,
        balanceRevision: 2,
        warningsAcknowledged: true
      })
    ).rejects.toMatchObject({ statusCode: 403 })
    await updatePermissions(db, organizationId, owner, manager, {
      permissions: ['user', 'claim:manager', 'forecast:manager', 'form:manager']
    })
    await mutateResponse(db, organizationId, manager, id, 'delete', { expectedRevision: 2 })
    await expect(getResponse(db, organizationId, viewer, id)).rejects.toMatchObject({
      statusCode: 404
    })
  })
  it('rejects forged budget rows, retains twelve fiscal months and exports forecast identifiers', async () => {
    const fundingAgreement = await newAgreement(),
      set = await newSet(fundingAgreement, 'forecast')
    const initial = await startResponse(db, organizationId, contributor, set.id, { locale: 'en' }),
      item = initial.response.items[0]!
    if (item.kind !== 'forecast') throw new Error('Expected forecast')
    for (const line of item.lines) line.amount = '0'
    item.lines[0]!.amount = '-5.25'
    const forged = structuredClone(item)
    forged.lines[0]!.budgetLineId = 'another-line'
    await expect(
      mutateResponse(db, organizationId, contributor, initial.response.id, 'save', {
        expectedRevision: 1,
        items: [forged]
      })
    ).rejects.toMatchObject({ statusCode: 400 })
    await mutateResponse(db, organizationId, contributor, initial.response.id, 'save', {
      expectedRevision: 1,
      items: [item]
    })
    const submissions = await Promise.allSettled(
      [1, 2].map(() =>
        mutateResponse(db, organizationId, manager, initial.response.id, 'submit', {
          expectedRevision: 2,
          balanceRevision: 1,
          warningsAcknowledged: true
        })
      )
    )
    expect(submissions.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    const final = await getResponse(db, organizationId, viewer, initial.response.id)
    const payload = await exportSubmission(db, root, final.response.submissionId!)
    expect(payload.submission).toMatchObject({
      items: [
        {
          forecast: {
            header: { egcs_fc_fiscalyear: '91' },
            lineItems: expect.arrayContaining([
              {
                egcs_fc_fundingagreementbudgetlineitem: '9007199254740993',
                egcs_fc_month: 0,
                egcs_fc_amount: '-5.25',
                egcs_fc_currency: 'cad',
                egcs_fc_version: '0'
              },
              {
                egcs_fc_fundingagreementbudgetlineitem: '9007199254740993',
                egcs_fc_month: 11,
                egcs_fc_amount: '0.00',
                egcs_fc_currency: 'cad',
                egcs_fc_version: '0'
              }
            ])
          }
        }
      ]
    })
  })
  it('protects organization and government scopes, publication and established foreign identities', async () => {
    const fundingAgreement = await newAgreement(),
      set = await newSet(fundingAgreement)
    const otherOrg = (
      await createOrganization(db, owner, { name: 'Other organization', description: '' })
    ).organization.id
    await expect(
      startResponse(db, otherOrg, owner, set.id, { locale: 'en' })
    ).rejects.toMatchObject({ statusCode: 404 })
    await expect(
      getAgreement(db, { kind: 'integration', tokenHash: 'not-a-token' }, fundingAgreement.id)
    ).rejects.toMatchObject({ statusCode: 401 })
    const value = agreementInput.parse({
      nameEn: fundingAgreement.nameEn,
      nameFr: fundingAgreement.nameFr,
      organizationId,
      streamId,
      agreementNumber: fundingAgreement.agreementNumber,
      config: fundingAgreement.config
    })
    value.config.budgetLines[0]!.foreignSystemId = '99'
    await expect(
      saveAgreement(db, root, { expectedRevision: 1, value }, fundingAgreement.id)
    ).rejects.toMatchObject({ statusCode: 409 })
    const initial = await startResponse(db, organizationId, contributor, set.id, { locale: 'en' })
    await publishSet(db, root, set.id, { expectedRevision: set.revision }, false)
    await expect(
      mutateResponse(db, organizationId, contributor, initial.response.id, 'save', {
        expectedRevision: 1,
        items: initial.response.items
      })
    ).rejects.toMatchObject({ statusCode: 409 })
    await mutateResponse(db, organizationId, manager, initial.response.id, 'delete', {
      expectedRevision: 1
    })
  })
  it('keeps agreement identity for standalone forms, pins definitions and rejects superseded drafts', async () => {
    const fundingAgreement = await newAgreement()
    const survey = (
      await createSurvey(db, root, {
        agencyId,
        definition: {
          schemaVersion: 1,
          title: { en: 'Report', fr: 'Rapport' },
          questions: [
            {
              id: 'report',
              type: 'text',
              label: { en: 'Report details', fr: 'Détails du rapport' },
              required: true,
              maxLength: 200
            }
          ]
        }
      })
    ).survey
    const value = {
      ...names('Agreement report'),
      organizationId,
      agencyId,
      agreementId: fundingAgreement.id,
      sourceSystem: 'gcs-ssc',
      foreignSystemId: '710',
      items: [{ id: 'report', kind: 'survey', surveyId: survey.id, surveyRevision: 1 }]
    }
    let set = (await saveSet(db, root, value)).set
    set = (await publishSet(db, root, set.id, { expectedRevision: set.revision }, true)).set
    const draft = (await startResponse(db, organizationId, contributor, set.id, { locale: 'en' }))
      .response
    expect(draft.snapshot.agreement).toBeNull()
    expect(draft.snapshot.agreementReference).toMatchObject({
      id: fundingAgreement.id,
      foreignSystemId: fundingAgreement.config.foreignSystemId
    })
    expect(
      setSubjects([{ id: 'form', kind: 'survey', surveyId: survey.id, surveyRevision: 1 }])
    ).toEqual(['form'])
    expect(
      setSubjects([
        { id: 'form', kind: 'survey', surveyId: survey.id, surveyRevision: 1 },
        { id: 'claim', kind: 'claim', fiscalYearId: 'fy' }
      ])
    ).toEqual(['claim'])
    await expect(
      checkResponse(db, organizationId, manager, draft.id, { expectedRevision: 1 })
    ).rejects.toMatchObject({ statusCode: 400 })
    await mutateResponse(db, organizationId, contributor, draft.id, 'save', {
      expectedRevision: 1,
      items: [{ id: 'report', kind: 'survey', answers: { report: 'A report' } }]
    })
    set = (await publishSet(db, root, set.id, { expectedRevision: set.revision }, false)).set
    await expect(
      saveSet(
        db,
        root,
        { expectedRevision: set.revision, value: { ...value, foreignSystemId: '711' } },
        set.id
      )
    ).rejects.toMatchObject({ statusCode: 409 })
    set = (
      await saveSet(
        db,
        root,
        { expectedRevision: set.revision, value: { ...value, nameEn: 'Updated report' } },
        set.id
      )
    ).set
    set = (await publishSet(db, root, set.id, { expectedRevision: set.revision }, true)).set
    await expect(
      checkResponse(db, organizationId, manager, draft.id, { expectedRevision: 2 })
    ).rejects.toMatchObject({ statusCode: 409 })
    await mutateResponse(db, organizationId, manager, draft.id, 'delete', { expectedRevision: 2 })
    const replacement = (
      await startResponse(db, organizationId, contributor, set.id, { locale: 'fr' })
    ).response
    await mutateResponse(db, organizationId, contributor, replacement.id, 'save', {
      expectedRevision: 1,
      items: [{ id: 'report', kind: 'survey', answers: { report: 'Nouveau rapport' } }]
    })
    await mutateResponse(db, organizationId, manager, replacement.id, 'submit', {
      expectedRevision: 2,
      balanceRevision: null,
      warningsAcknowledged: false
    })
    const final = await getResponse(db, organizationId, viewer, replacement.id)
    expect(
      (await exportSubmission(db, root, final.response.submissionId!)).submission
    ).toMatchObject({
      agreementReference: { id: fundingAgreement.id },
      items: [
        {
          answers: { report: 'Nouveau rapport' },
          definition: { title: { en: 'Report', fr: 'Rapport' } }
        }
      ]
    })
    const orgSet = await saveSet(db, root, { ...value, agreementId: null, foreignSystemId: null })
    expect(orgSet.set.agreementId).toBeNull()
  })
  it('upgrades existing stream ancestry and application grants without resetting supported data', async () => {
    const old = new Kysely<Database>({ dialect: pgliteDialect('memory://') })
    try {
      await migrate(old, '003_surveys')
      const now = new Date(),
        org = uuid(),
        agency = uuid(),
        program = uuid(),
        stream = uuid()
      await old
        .insertInto('user')
        .values({
          id: 'legacy',
          name: 'Legacy user',
          email: 'legacy@agreements.test',
          emailVerified: false,
          image: null,
          createdAt: now,
          updatedAt: now
        })
        .execute()
      await old
        .insertInto('organization')
        .values({
          id: org,
          name: 'Existing recipient',
          description: '',
          ownerId: 'legacy',
          createdAt: now
        })
        .execute()
      await old
        .insertInto('membership')
        .values({ organizationId: org, userId: 'legacy', joinedAt: now })
        .execute()
      await sql`INSERT INTO permission ("organizationId", "userId", permission) VALUES (${org}, 'legacy', 'application')`.execute(
        old
      )
      await old
        .insertInto('agency')
        .values({ id: agency, ...names('Existing agency'), createdAt: now })
        .execute()
      await old
        .insertInto('program')
        .values({ id: program, agencyId: agency, ...names('Existing program'), createdAt: now })
        .execute()
      await sql`INSERT INTO stream (id, "programId", "nameEn", "nameFr", "createdAt") VALUES (${stream}, ${program}, 'Existing stream', 'Volet existant', ${now})`.execute(
        old
      )
      const existingCall = uuid()
      await sql`INSERT INTO funding_call (id, "streamId", "nameEn", "nameFr", "startDate", "endDate", published, "createdAt") VALUES (${existingCall}, ${stream}, 'Existing call', 'Appel existant', '2020-01-01', '2099-12-31', false, ${now})`.execute(
        old
      )
      await migrate(old, '007_organization_status')
      const existingAgreement = uuid()
      await old
        .insertInto('funding_agreement')
        .values({
          id: existingAgreement,
          organizationId: org,
          agencyId: agency,
          streamId: stream,
          ...names('Existing agreement'),
          agreementNumber: 'existing',
          config: sql`'{}'::jsonb`,
          sourceSystem: 'gcs-ssc',
          foreignSystemId: null,
          revision: 1,
          createdAt: now
        })
        .execute()
      await migrate(old)
      expect(
        await old
          .selectFrom('funding_agreement')
          .select(['active', 'status'])
          .where('id', '=', existingAgreement)
          .executeTakeFirstOrThrow()
      ).toEqual({ active: true, status: null })
      expect(
        await old
          .selectFrom('funding_call')
          .select(['id', 'agencyId', 'revision', 'nameEn'])
          .where('id', '=', existingCall)
          .executeTakeFirstOrThrow()
      ).toEqual({ id: existingCall, agencyId: agency, revision: 1, nameEn: 'Existing call' })
      expect(
        await old
          .selectFrom('stream')
          .select(['id', 'agencyId', 'foreignSystemId'])
          .where('id', '=', stream)
          .executeTakeFirstOrThrow()
      ).toEqual({ id: stream, agencyId: agency, foreignSystemId: null })
      expect(
        (await old.selectFrom('permission').select('permission').executeTakeFirstOrThrow())
          .permission
      ).toBe('application:viewer')
      expect(
        (await old.selectFrom('organization').select('name').executeTakeFirstOrThrow()).name
      ).toBe('Existing recipient')
      const otherAgency = uuid()
      await old
        .insertInto('agency')
        .values({ id: otherAgency, ...names('Other'), createdAt: now })
        .execute()
      await expect(
        old
          .insertInto('funding_agreement')
          .values({
            id: uuid(),
            organizationId: org,
            agencyId: otherAgency,
            streamId: stream,
            ...names('Invalid scope'),
            agreementNumber: 'invalid',
            config: sql`'{}'::jsonb`,
            sourceSystem: 'gcs-ssc',
            foreignSystemId: null,
            revision: 1,
            createdAt: now
          })
          .execute()
      ).rejects.toMatchObject({ code: '23503' })
      await migrate(old)
    } finally {
      await old.destroy()
    }
  })
})
