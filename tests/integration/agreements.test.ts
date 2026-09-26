import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { sql, type Kysely } from 'kysely'
import pg from 'pg'
import type { Database } from '../../server/db/schema'
import { createDatabase } from '../../server/utils/database'
import { createAdministrator } from '../../server/utils/administrator-accounts'
import { createAgency, createProgram, createStream } from '../../server/utils/government-structure'
import { createOrganization, updatePermissions } from '../../server/utils/portal'
import { decodePublicId } from '../../server/utils/public-identifiers'
import type { GovernmentActor } from '../../server/utils/government-access'
import { createSurvey } from '../../server/utils/surveys'
import {
  saveAgreement,
  updateBalances,
  getAgreement,
  organizationAgreements,
  linkAgreementOrganization
} from '../../server/utils/agreements'
import { listIntegrationUpdates, consumeIntegrationUpdate } from '../../server/utils/integration-delivery'
import { verifyAgencyOrganization } from '../../server/utils/organization-agency-identity'
import { saveSet, publishSet } from '../../server/utils/submission-sets'
import {
  startResponse,
  mutateResponse,
  checkResponse,
  getResponse,
  exportSubmission,
  listResponses,
  updateSubmissionStatus,
  transitionResponse,
  addSubmissionDetail,
  addGovernmentDetail,
  governmentResponse,
  updateSubmissionItemOutcome
} from '../../server/utils/set-responses'
import {
  uploadAttachment,
  uploadGovernmentAttachment,
  removeAttachment,
  governmentAttachment
} from '../../server/utils/attachments'
import type { AttachmentStorage } from '../../server/utils/attachment-storage'
import {
  agreementInput,
  money,
  externalId,
  setSubjects,
  documentationAttachmentItemId
} from '../../shared/schemas/agreements'
import type { FundingAgreement } from '../../shared/types/agreements'
let db: Kysely<Database>,
  root: GovernmentActor,
  organizationId: number,
  agencyId: number,
  streamId: number
let owner: number, viewer: number, contributor: number, manager: number
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
  const users: number[] = []
  for (const name of [
    'agreement-owner',
    'agreement-viewer',
    'agreement-contributor',
    'agreement-manager'
  ]) {
    const created = await db
      .insertInto('user')
      .values({
        name,
        email: name + '@agreements.test',
        emailVerified: false,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning('id')
      .executeTakeFirstOrThrow()
    users.push(created.id)
  }
  owner = users[0]!
  viewer = users[1]!
  contributor = users[2]!
  manager = users[3]!
  const org = await createOrganization(db, owner, {
    name: 'Agreement organization',
    description: ''
  })
  organizationId = decodePublicId(org.organization.id, 'organization')
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
const newAgreement = async (
  options: {
    externalStreamId?: string | null
    forecastInstruction?: { en: string; fr: string } | null
  } = {}
): Promise<FundingAgreement> =>
  (
    await saveAgreement(db, root, {
      ...names('Agreement'),
      organizationId,
      streamId,
      agreementNumber: 'AGR-100',
      config: {
        sourceSystem: 'gcs-ssc',
        foreignSystemId: String(Date.now()) + String(Math.floor(Math.random() * 1000)),
        externalStreamId:
          options.externalStreamId === undefined ? '9223372036854775806' : options.externalStreamId,
        externalApplicantRecipientId: '82',
        forecastInstruction: options.forecastInstruction ?? null,
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
  it('withdraws only when GCS allows it and reopens an unchanged financial form as a linked draft', async () => {
    const agreement = await newAgreement()
    const set = await newSet(agreement)
    const initial = (await startResponse(db, organizationId, contributor, set.id, { locale: 'en' }))
      .response
    const item = initial.items[0]!
    if (item.kind !== 'claim') throw new Error('Expected claim')
    item.lines[0]!.amount = '10.00'
    const saved = await mutateResponse(db, organizationId, contributor, initial.id, 'save', {
      expectedRevision: initial.revision,
      items: [item]
    })
    if (!('response' in saved)) throw new Error('Expected response')
    const check = await checkResponse(db, organizationId, manager, initial.id, {
      expectedRevision: saved.response.revision
    })
    const submitted = await mutateResponse(db, organizationId, manager, initial.id, 'submit', {
      expectedRevision: saved.response.revision,
      balanceRevision: check.balanceRevision,
      warningsAcknowledged: true
    })
    if (!('response' in submitted)) throw new Error('Expected response')
    const originalExport = (await exportSubmission(db, root, initial.id)).submission
    const locked = await updateSubmissionStatus(db, root, initial.id, {
      expectedRevision: submitted.response.revision,
      status: 'submitted',
      gcsStatus: { en: 'Accepted', fr: 'Acceptée', colour: '#245A80', isWithdrawable: false }
    })
    await expect(
      transitionResponse(db, organizationId, manager, initial.id, 'withdraw', {
        expectedRevision: locked.response.revision
      })
    ).rejects.toMatchObject({ statusCode: 409 })
    const status = await updateSubmissionStatus(db, root, initial.id, {
      expectedRevision: locked.response.revision,
      status: 'submitted',
      gcsStatus: { en: 'Accepted', fr: 'Acceptée', colour: '#245A80', isWithdrawable: true }
    })
    await expect(
      transitionResponse(db, organizationId, contributor, initial.id, 'withdraw', {
        expectedRevision: status.response.revision
      })
    ).rejects.toMatchObject({ statusCode: 403 })
    const withdrawn = await transitionResponse(
      db,
      organizationId,
      manager,
      initial.id,
      'withdraw',
      {
        expectedRevision: status.response.revision
      }
    )
    expect(withdrawn.response.status).toBe('withdrawn')
    expect((await exportSubmission(db, root, initial.id)).submission).toEqual(originalExport)
    await expect(
      updateSubmissionStatus(db, root, initial.id, {
        expectedRevision: withdrawn.response.revision,
        status: 'submitted',
        gcsStatus: null
      })
    ).rejects.toMatchObject({ statusCode: 409 })
    const reopened = await transitionResponse(
      db,
      organizationId,
      contributor,
      initial.id,
      'reopen',
      {
        expectedRevision: withdrawn.response.revision
      }
    )
    expect(reopened.response).toMatchObject({
      status: 'draft',
      resubmissionOfId: submitted.response.submissionId
    })
    expect(reopened.response.id).not.toBe(initial.id)
    expect(reopened.response.items[0]).toMatchObject({ lines: [{ amount: '10.00' }] })
    expect((await getResponse(db, organizationId, viewer, initial.id)).response.status).toBe(
      'withdrawn'
    )
    await expect(
      transitionResponse(db, organizationId, contributor, initial.id, 'reopen', {
        expectedRevision: withdrawn.response.revision
      })
    ).rejects.toMatchObject({ statusCode: 409 })
    const reopenedCheck = await checkResponse(db, organizationId, manager, reopened.response.id, {
      expectedRevision: reopened.response.revision
    })
    const resubmitted = await mutateResponse(
      db,
      organizationId,
      manager,
      reopened.response.id,
      'submit',
      {
        expectedRevision: reopened.response.revision,
        balanceRevision: reopenedCheck.balanceRevision,
        warningsAcknowledged: true
      }
    )
    if (!('response' in resubmitted)) throw new Error('Expected response')
    expect(resubmitted.response.gcsStatus).toBeNull()
    const withdrawnBeforeGcsStatus = await transitionResponse(
      db,
      organizationId,
      manager,
      reopened.response.id,
      'withdraw',
      { expectedRevision: resubmitted.response.revision }
    )
    expect(withdrawnBeforeGcsStatus.response.status).toBe('withdrawn')
    const current = await db
      .selectFrom('funding_agreement')
      .select('config')
      .where('id', '=', Number(agreement.id))
      .executeTakeFirstOrThrow()
    const changed = structuredClone(current.config)
    changed.budgetLines.push({
      ...changed.budgetLines[0]!,
      id: 'new-line',
      foreignSystemId: '999'
    })
    await db
      .updateTable('funding_agreement')
      .set({ config: sql`${JSON.stringify(changed)}::jsonb` })
      .where('id', '=', Number(agreement.id))
      .execute()
    await expect(
      transitionResponse(db, organizationId, contributor, initial.id, 'reopen', {
        expectedRevision: withdrawn.response.revision
      })
    ).rejects.toMatchObject({ statusCode: 409, data: { code: 'FORM_SHAPE_CHANGED' } })
  })

  it('preserves the linked recipient when an older agreement config has no recipient', async () => {
    const agreement = await newAgreement()
    await db.updateTable('funding_agreement')
      .set({ config: sql`${JSON.stringify({ ...agreement.config, externalApplicantRecipientId: null })}::jsonb` })
      .where('id', '=', agreement.id).execute()
    await expect(saveAgreement(db, root, {
      expectedRevision: agreement.revision,
      value: {
        ...names('Agreement'), organizationId, streamId, agreementNumber: agreement.agreementNumber,
        config: { ...agreement.config, externalApplicantRecipientId: '83' }
      }
    }, agreement.id)).rejects.toMatchObject({ statusCode: 409 })
    expect((await db.selectFrom('agreement_organization').select('foreignApplicantRecipientId')
      .where('agreementId', '=', agreement.id).where('organizationId', '=', organizationId)
      .executeTakeFirstOrThrow()).foreignApplicantRecipientId).toBe('82')
  })

  it('shares one agreement and balance while keeping organization histories and deliveries separate', async () => {
    const agreement = await newAgreement()
    const second = await createOrganization(db, owner, { name: 'Second recipient', description: '' })
    const secondId = decodePublicId(second.organization.id, 'organization')
    for (const userId of [contributor, manager]) {
      await db.insertInto('membership').values({ organizationId: secondId, userId, joinedAt: new Date() }).execute()
      await updatePermissions(db, secondId, owner, userId, {
        permissions: ['user', `claim:${userId === manager ? 'manager' : 'contributor'}`]
      })
    }
    await linkAgreementOrganization(db, root, Number(agreement.id), {
      organizationId: secondId,
      foreignApplicantRecipientId: '83'
    })
    expect((await db.selectFrom('organization').select('verified')
      .where('id', '=', secondId).executeTakeFirstOrThrow()).verified).toBe(false)
    await expect(verifyAgencyOrganization(db, root, agencyId, secondId,
      { foreignApplicantRecipientId: '84' })).rejects.toMatchObject({ statusCode: 409 })
    await verifyAgencyOrganization(db, root, agencyId, secondId, { foreignApplicantRecipientId: '83' })
    expect((await db.selectFrom('organization').select('verified')
      .where('id', '=', secondId).executeTakeFirstOrThrow()).verified).toBe(true)
    expect((await organizationAgreements(db, secondId, manager)).agreements).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: Number(agreement.id) })])
    )
    const draftSet = (await saveSet(db, root, {
      ...names('Second recipient claim'), organizationId: secondId, agencyId,
      agreementId: Number(agreement.id),
      items: [{ id: 'claim', kind: 'claim', fiscalYearId: 'fy' }]
    })).set
    const published = (await publishSet(db, root, Number(draftSet.id),
      { expectedRevision: draftSet.revision }, true)).set
    expect(published.snapshot?.agreementReference?.externalApplicantRecipientId).toBe('83')
    const response = (await startResponse(db, secondId, contributor,
      Number(published.id), { locale: 'en' })).response
    const item = response.items[0]!
    if (item.kind !== 'claim') throw new Error('Expected claim')
    item.lines[0]!.description = 'Shared agreement expense'
    item.lines[0]!.amount = '10.00'
    await mutateResponse(db, secondId, contributor, response.id, 'save', {
      expectedRevision: response.revision, items: [item]
    })
    const checked = await checkResponse(db, secondId, manager, response.id, { expectedRevision: 2 })
    await mutateResponse(db, secondId, manager, response.id, 'submit', {
      expectedRevision: 2, balanceRevision: checked.balanceRevision, warningsAcknowledged: false
    })
    expect((await listResponses(db, organizationId, viewer)).responses.some((row) => row.id === response.id)).toBe(false)
    const updates = await listIntegrationUpdates(db, root, agencyId, {})
    const exported = await exportSubmission(db, root, response.id)
    const event = updates.updates.find((row) => row.submissionId === exported.submission.submissionId)
    expect(event).toMatchObject({ kind: 'submission_item' })
    const before = JSON.stringify(exported.submission)
    const outcome = await updateSubmissionItemOutcome(db, root, response.id, event!.itemSubmissionId!, {
      expectedRevision: 0, remoteReference: '1001',
      gcsStatus: { en: 'Received', fr: 'Reçu', colour: '#245A80' }
    })
    expect(outcome.outcome.revision).toBe(1)
    expect((await getResponse(db, secondId, manager, response.id)).outcomes).toMatchObject([
      { itemSubmissionId: event!.itemSubmissionId, remoteReference: '1001' }
    ])
    expect(JSON.stringify((await exportSubmission(db, root, response.id)).submission)).toBe(before)
    await expect(updateSubmissionItemOutcome(db, root, response.id, event!.itemSubmissionId!, {
      expectedRevision: 0, remoteReference: '1001', gcsStatus: null
    })).rejects.toMatchObject({ statusCode: 409 })
    await consumeIntegrationUpdate(db, root, agencyId, event!.eventId, { remoteReference: '1001' })
    expect((await listIntegrationUpdates(db, root, agencyId, {})).updates.some((row) => row.eventId === event!.eventId)).toBe(false)
    expect((await listIntegrationUpdates(db, root, agencyId, { since: '2020-01-01' })).updates
      .find((row) => row.eventId === event!.eventId)?.remoteReference).toBe('1001')
  })
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
  it('assigns stable forecast iterations across sets for the same agreement and fiscal year', async () => {
    const agreement = await newAgreement()
    const firstSet = await newSet(agreement, 'forecast')
    const secondSet = await newSet(agreement, 'forecast')
    const first = (
      await startResponse(db, organizationId, contributor, firstSet.id, { locale: 'en' })
    ).response
    const second = (
      await startResponse(db, organizationId, contributor, secondSet.id, { locale: 'en' })
    ).response
    expect(first.forecastIterations).toEqual({ fy: 1 })
    expect(second.forecastIterations).toEqual({ fy: 2 })
    const summaries = (await listResponses(db, organizationId, viewer)).responses
    expect(summaries.find((response) => response.id === first.id)).toMatchObject({
      forecastFiscalYear: 2026,
      forecastIteration: 1
    })
    expect(summaries.find((response) => response.id === second.id)).toMatchObject({
      forecastFiscalYear: 2026,
      forecastIteration: 2
    })
  })
  it('pins forecast instructions at publication and preserves submitted instructions after updates', async () => {
    const original = { en: 'Plan each month.', fr: 'Planifiez chaque mois.' }
    const revised = { en: 'Revise future months.', fr: 'Révisez les mois à venir.' }
    const agreement = await newAgreement({ forecastInstruction: original })
    const firstSet = await newSet(agreement, 'forecast')
    const first = (
      await startResponse(db, organizationId, contributor, firstSet.id, { locale: 'en' })
    ).response
    expect(first.snapshot.agreement?.config.forecastInstruction).toEqual(original)
    const firstItem = first.items[0]!
    if (firstItem.kind !== 'forecast') throw new Error('Expected forecast')
    for (const line of firstItem.lines) line.amount = '0'
    await mutateResponse(db, organizationId, contributor, first.id, 'save', {
      expectedRevision: first.revision,
      items: [firstItem]
    })
    await mutateResponse(db, organizationId, manager, first.id, 'submit', {
      expectedRevision: first.revision + 1,
      balanceRevision: agreement.revision,
      warningsAcknowledged: true
    })
    const immutableExport = (await exportSubmission(db, root, first.id)).submission
    const updatedValue = agreementInput.parse({
      ...names('Agreement'),
      organizationId,
      streamId,
      agreementNumber: agreement.agreementNumber,
      config: { ...agreement.config, forecastInstruction: revised }
    })
    const updated = (
      await saveAgreement(
        db,
        root,
        {
          expectedRevision: agreement.revision,
          value: updatedValue
        },
        agreement.id
      )
    ).agreement
    expect(updated.config.forecastInstruction).toEqual(revised)
    expect(
      (await getResponse(db, organizationId, viewer, first.id)).response.snapshot.agreement?.config
        .forecastInstruction
    ).toEqual(original)
    expect((await exportSubmission(db, root, first.id)).submission).toEqual(immutableExport)
    const secondSet = await newSet(updated, 'forecast')
    const second = (
      await startResponse(db, organizationId, contributor, secondSet.id, { locale: 'fr' })
    ).response
    expect(second.snapshot.agreement?.config.forecastInstruction).toEqual(revised)
    expect(second.forecastIterations).toEqual({ fy: 2 })
    const secondItem = second.items[0]!
    if (secondItem.kind !== 'forecast') throw new Error('Expected forecast')
    for (const line of secondItem.lines) line.amount = '0'
    await mutateResponse(db, organizationId, contributor, second.id, 'save', {
      expectedRevision: second.revision,
      items: [secondItem]
    })
    await mutateResponse(db, organizationId, manager, second.id, 'submit', {
      expectedRevision: second.revision + 1,
      balanceRevision: updated.revision,
      warningsAcknowledged: true
    })
    expect((await exportSubmission(db, root, second.id)).submission.items[0]).toMatchObject({
      portalIteration: 2,
      forecast: {
        lineItems: expect.arrayContaining([expect.objectContaining({ egcs_fc_version: '0' })])
      }
    })
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
    item.lines[0]!.amount = '80.25'
    item.lines.push({ budgetLineId: 'travel', description: 'Second trip', amount: '45.25' })
    const forgedClaim = structuredClone(item)
    forgedClaim.lines[1]!.budgetLineId = 'another-line'
    await expect(
      mutateResponse(db, organizationId, contributor, id, 'save', {
        expectedRevision: 1,
        items: [forgedClaim]
      })
    ).rejects.toMatchObject({ statusCode: 400 })
    const saved = await mutateResponse(db, organizationId, contributor, id, 'save', {
      expectedRevision: 1,
      items: [item]
    })
    if (!('response' in saved)) throw new Error('Expected response')
    expect(saved.response.items[0]).toMatchObject({
      lines: [{ amount: '80.25' }, { budgetLineId: 'travel', amount: '45.25' }]
    })
    expect(
      (await listResponses(db, organizationId, viewer)).responses.find((row) => row.id === id)
    ).toMatchObject({ claimPeriodStart: 0, claimPeriodEnd: 11, finalClaim: false })
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
    const exported = await exportSubmission(db, root, submitted.response.id)
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
            lineItems: [
              { budgetLineItemId: '9007199254740993', amount: '80.25', currency: 'cad' },
              { budgetLineItemId: '9007199254740993', amount: '45.25', currency: 'cad' }
            ]
          }
        }
      ]
    })
    const immutableExport = JSON.stringify(exported.submission)
    await expect(
      addSubmissionDetail(db, organizationId, contributor, id, {
        expectedRevision: submitted.response.revision,
        body: 'Too early',
        attachmentIds: []
      })
    ).rejects.toMatchObject({ statusCode: 409 })
    await expect(
      updateSubmissionStatus(db, root, submitted.response.id, {
        expectedRevision: submitted.response.revision,
        status: 'awaiting_documentation',
        gcsStatus: null
      })
    ).rejects.toMatchObject({ name: 'ZodError' })
    await expect(
      updateSubmissionStatus(db, root, submitted.response.id, {
        expectedRevision: submitted.response.revision,
        status: 'awaiting_documentation',
        message: 'Please provide receipts.',
        gcsStatus: null
      })
    ).rejects.toMatchObject({ name: 'ZodError' })
    const awaiting = await updateSubmissionStatus(db, root, submitted.response.id, {
      expectedRevision: submitted.response.revision,
      status: 'awaiting_documentation',
      message: 'Please provide the receipts for this submission.',
      senderName: 'GCS Case Officer',
      gcsStatus: {
        en: 'Documents needed',
        fr: 'Documents requis',
        colour: '#245A80',
        isWithdrawable: true
      }
    })
    expect(awaiting.response.status).toBe('awaiting_documentation')
    expect(
      (await listResponses(db, organizationId, viewer)).responses.find((entry) => entry.id === id)
    ).toMatchObject({
      agreementId: fundingAgreement.id,
      status: 'awaiting_documentation',
      gcsStatus: { en: 'Documents needed' }
    })
    const storage: AttachmentStorage = {
      location: (fileId) => ({ bucket: 'test', objectKey: fileId }),
      put: async () => {},
      get: async () => new Uint8Array([1, 2, 3]),
      remove: async () => {}
    }
    const uploaded = await uploadAttachment(
      db,
      organizationId,
      contributor,
      id,
      {
        expectedRevision: awaiting.response.revision,
        itemId: documentationAttachmentItemId,
        filename: 'evidence.txt'
      },
      new Uint8Array([1, 2, 3]),
      storage
    )
    const fileId = uploaded.attachments.find(
      (file) => file.itemId === documentationAttachmentItemId
    )!.id
    expect((await governmentResponse(db, root, submitted.response.id)).attachments).toEqual([])
    await expect(
      governmentAttachment(db, root, submitted.response.id, fileId, storage)
    ).rejects.toMatchObject({ statusCode: 404 })
    await expect(
      addSubmissionDetail(db, organizationId, viewer, id, {
        expectedRevision: uploaded.revision,
        body: 'Viewer cannot send',
        attachmentIds: [fileId]
      })
    ).rejects.toMatchObject({ statusCode: 403 })
    const followup = await addSubmissionDetail(db, organizationId, contributor, id, {
      expectedRevision: uploaded.revision,
      body: 'Here are the requested receipts.',
      attachmentIds: [fileId]
    })
    expect(followup.details).toMatchObject([
      {
        sender: 'government',
        senderName: 'GCS Case Officer',
        body: 'Please provide the receipts for this submission.'
      },
      {
        sender: 'organization',
        senderName: 'agreement-contributor',
        body: 'Here are the requested receipts.',
        attachmentIds: [fileId]
      }
    ])
    const governmentFile = await uploadGovernmentAttachment(
      db,
      root,
      submitted.response.id,
      {
        expectedRevision: followup.response.revision,
        filename: 'guidance.txt'
      },
      new Uint8Array([1, 2, 3]),
      storage
    )
    const governmentFileId = governmentFile.attachments.find(
      (file) => file.sender === 'government' && file.itemId === documentationAttachmentItemId
    )!.id
    expect(
      (await getResponse(db, organizationId, viewer, id)).attachments.map((file) => file.id)
    ).not.toContain(governmentFileId)
    const governmentReply = await addGovernmentDetail(db, root, submitted.response.id, {
      expectedRevision: governmentFile.revision,
      body: 'Please also include the itemized list.',
      senderName: 'GCS Reviewer',
      attachmentIds: [governmentFileId]
    })
    expect(governmentReply.details.at(-1)).toMatchObject({
      sender: 'government',
      senderName: 'GCS Reviewer',
      body: 'Please also include the itemized list.',
      attachmentIds: [governmentFileId]
    })
    expect(
      (await getResponse(db, organizationId, viewer, id)).attachments.map((file) => file.id)
    ).toContain(governmentFileId)
    const secondFollowup = await addSubmissionDetail(db, organizationId, contributor, id, {
      expectedRevision: governmentReply.response.revision,
      body: 'The itemized list will follow tomorrow.',
      attachmentIds: []
    })
    expect(secondFollowup.details).toHaveLength(4)
    expect(secondFollowup.details.at(-1)).toMatchObject({ senderName: 'agreement-contributor' })
    await expect(
      removeAttachment(db, organizationId, contributor, id, fileId, {
        expectedRevision: secondFollowup.response.revision
      })
    ).rejects.toMatchObject({ statusCode: 409 })
    expect((await governmentResponse(db, root, submitted.response.id)).details).toHaveLength(4)
    expect(
      (await governmentAttachment(db, root, submitted.response.id, fileId, storage)).bytes
    ).toEqual(new Uint8Array([1, 2, 3]))
    expect(
      JSON.stringify((await exportSubmission(db, root, submitted.response.id)).submission)
    ).toBe(immutableExport)
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
    expect(await exportSubmission(db, root, submitted.response.id)).toEqual(exported)
    const closed = await updateSubmissionStatus(db, root, submitted.response.id, {
      expectedRevision: secondFollowup.response.revision,
      status: 'submitted',
      gcsStatus: null
    })
    await expect(
      addGovernmentDetail(db, root, submitted.response.id, {
        expectedRevision: closed.response.revision,
        body: 'Late message',
        senderName: 'GCS Reviewer',
        attachmentIds: []
      })
    ).rejects.toMatchObject({ statusCode: 409 })
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
    const fundingAgreement = await newAgreement({ externalStreamId: null }),
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
    const payload = await exportSubmission(db, root, final.response.id)
    expect(payload.submission).toMatchObject({
      items: [
        {
          mappingComplete: true,
          portalIteration: 1,
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
    const claimSet = await newSet(fundingAgreement)
    const claim = (
      await startResponse(db, organizationId, contributor, claimSet.id, { locale: 'en' })
    ).response
    const claimItem = claim.items[0]!
    if (claimItem.kind !== 'claim') throw new Error('Expected claim')
    claimItem.lines[0]!.amount = '0'
    await mutateResponse(db, organizationId, contributor, claim.id, 'save', {
      expectedRevision: claim.revision,
      items: [claimItem]
    })
    await mutateResponse(db, organizationId, manager, claim.id, 'submit', {
      expectedRevision: claim.revision + 1,
      balanceRevision: fundingAgreement.revision,
      warningsAcknowledged: true
    })
    expect((await exportSubmission(db, root, claim.id)).submission.items[0]).toMatchObject({
      mappingComplete: false
    })
  })
  it('protects organization and government scopes, publication and established foreign identities', async () => {
    const fundingAgreement = await newAgreement(),
      set = await newSet(fundingAgreement)
    const otherOrgCode = (
      await createOrganization(db, owner, { name: 'Other organization', description: '' })
    ).organization.id
    const otherOrg = decodePublicId(otherOrgCode, 'organization')
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
    expect((await exportSubmission(db, root, final.response.id)).submission).toMatchObject({
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
})
