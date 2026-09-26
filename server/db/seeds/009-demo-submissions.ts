import { sql, type Kysely } from 'kysely'
import { nanoid } from 'nanoid'
import type { Database } from '../schema'
import { setInput, type SetSnapshot } from '../../../shared/schemas/agreements'
import { initialResponseItems, validateResponseItems } from '../../utils/response-validation'
import { buildSubmissionExport } from '../../utils/submission-export'
import { currentBalances } from '../../utils/agreement-balances'

/** Playable submission categories and review states in one demo agreement. */
export const demoSubmissionsMigration = {
  up: async (connection: Kysely<unknown>) => {
    const db = connection as Kysely<Database>
    const owner = await db
      .selectFrom('user')
      .select('id')
      .where('email', '=', 'owner@portal.com')
      .executeTakeFirst()
    const agreement = await db
      .selectFrom('funding_agreement')
      .selectAll()
      .where('sourceSystem', '=', 'demo')
      .where('agreementNumber', '=', 'DEMO-001')
      .executeTakeFirst()
    if (!owner || !agreement) return
    const financialSets = await db
      .selectFrom('submission_set')
      .selectAll()
      .where('agreementId', '=', agreement.id)
      .where('sourceSystem', '=', 'demo')
      .execute()
    const claimSet = financialSets.find(
      (set) => set.published && set.snapshot?.items.every((entry) => entry.item.kind === 'claim')
    )
    const forecastSet = financialSets.find(
      (set) => set.published && set.snapshot?.items.every((entry) => entry.item.kind === 'forecast')
    )
    if (!claimSet?.snapshot || !forecastSet?.snapshot) return
    const snapshot = claimSet.snapshot
    const survey = await db
      .selectFrom('survey_revision as revision')
      .innerJoin('survey', 'survey.id', 'revision.surveyId')
      .select(['revision.surveyId', 'revision.revision', 'revision.definition'])
      .where('survey.agencyId', '=', agreement.agencyId)
      .orderBy('revision.createdAt')
      .executeTakeFirst()
    if (!survey) return
    const examples = [
      {
        nameEn: 'Community food progress report',
        nameFr: 'Rapport d’avancement alimentaire communautaire',
        items: [
          {
            item: {
              id: 'progress',
              kind: 'survey' as const,
              surveyId: survey.surveyId,
              surveyRevision: survey.revision
            },
            survey: survey.definition
          }
        ]
      },
      {
        nameEn: 'Community food documentation report',
        nameFr: 'Rapport de documentation alimentaire communautaire',
        items: [
          {
            item: {
              id: 'documentation-report',
              kind: 'survey' as const,
              surveyId: survey.surveyId,
              surveyRevision: survey.revision
            },
            survey: survey.definition
          }
        ]
      }
    ]
    const sampleSets: { id: number; snapshot: SetSnapshot; revision: number }[] = [
      { id: claimSet.id, snapshot: claimSet.snapshot, revision: claimSet.revision },
      { id: forecastSet.id, snapshot: forecastSet.snapshot, revision: forecastSet.revision }
    ]
    for (const [index, example] of examples.entries()) {
      const set = setInput.parse({
        organizationId: agreement.organizationId,
        agencyId: agreement.agencyId,
        agreementId: agreement.id,
        nameEn: example.nameEn,
        nameFr: example.nameFr,
        sourceSystem: 'demo',
        foreignSystemId: null,
        items: example.items.map((entry) => entry.item)
      })
      const publication: SetSnapshot = {
        ...snapshot,
        publicationId: nanoid(),
        nameEn: set.nameEn,
        nameFr: set.nameFr,
        items: example.items,
        agreement: null
      }
      const createdSet = await db
        .insertInto('submission_set')
        .values({
          organizationId: agreement.organizationId,
          agencyId: agreement.agencyId,
          agreementId: agreement.id,
          callId: null,
          nameEn: set.nameEn,
          nameFr: set.nameFr,
          sourceSystem: 'demo',
          foreignSystemId: null,
          items: sql`${JSON.stringify(set.items)}::jsonb`,
          snapshot: sql`${JSON.stringify(publication)}::jsonb`,
          revision: 1,
          published: true,
          createdAt: new Date(Date.now() + index + 1)
        })
        .returning('id')
        .executeTakeFirstOrThrow()
      const setId = createdSet.id
      if (index === 1) sampleSets.push({ id: setId, snapshot: publication, revision: 1 })
    }
    const now = Date.now()
    for (const [sampleIndex, sample] of sampleSets.entries()) {
      const existing = await db
        .selectFrom('set_response')
        .select('status')
        .where('setId', '=', sample.id)
        .execute()
      const balances = await currentBalances(db, sample.snapshot)
      for (const [index, status] of ['draft', 'submitted', 'awaiting_documentation'].entries()) {
        if (existing.some((response) => response.status === status)) continue
        const createdAt = new Date(now + index + 10 + sampleIndex * 10)
        const submittedAt = status === 'draft' ? null : createdAt
        const initial = initialResponseItems(sample.snapshot, 'en')
        const items =
          status === 'draft'
            ? initial
            : validateResponseItems(
                sample.snapshot,
                initial.map((item) => {
                  if (item.kind === 'survey')
                    return {
                      ...item,
                      answers: {
                        project_name: 'Community food progress',
                        project_summary: 'A sample report for testing submission status.',
                        participants: '25'
                      }
                    }
                  if (item.kind === 'claim')
                    return {
                      ...item,
                      lines: item.lines.map((line) => ({ ...line, amount: '25.00' }))
                    }
                  return {
                    ...item,
                    lines: item.lines.map((line) => ({ ...line, amount: '25.00' }))
                  }
                }),
                'submit'
              )
        const gcsStatus =
          status === 'draft'
            ? null
            : status === 'submitted'
              ? { en: 'Under review', fr: 'À l’étude', colour: '#245A80', isWithdrawable: true }
              : {
                  en: 'Documents requested',
                  fr: 'Documents demandés',
                  colour: '#795600',
                  isWithdrawable: true
                }
        const forecastIterations = Object.fromEntries(
          sample.snapshot.items.flatMap((entry) =>
            entry.item.kind === 'forecast' ? [[entry.item.fiscalYearId, index + 1] as const] : []
          )
        )
        const createdResponse = await db
          .insertInto('set_response')
          .values({
            setId: sample.id,
            organizationId: agreement.organizationId,
            setRevision: sample.revision,
            snapshot: sql`${JSON.stringify(sample.snapshot)}::jsonb`,
            items: sql`${JSON.stringify(items)}::jsonb`,
            locale: 'en',
            revision: 1,
            status: status as 'draft' | 'submitted' | 'awaiting_documentation',
            gcsStatus: gcsStatus ? sql`${JSON.stringify(gcsStatus)}::jsonb` : null,
            forecastIterations: sql`${JSON.stringify(forecastIterations)}::jsonb`,
            createdBy: owner.id,
            updatedBy: owner.id,
            submittedBy: submittedAt ? owner.id : null,
            createdAt,
            updatedAt: createdAt,
            submittedAt,
            export: submittedAt ? sql`'{}'::jsonb` : null
          })
          .returning('id')
          .executeTakeFirstOrThrow()
        if (submittedAt) {
          const exported = {
            ...buildSubmissionExport({
              submissionId: String(createdResponse.id),
              responseId: String(createdResponse.id),
              setId: String(sample.id),
              setRevision: sample.revision,
              organizationId: String(agreement.organizationId),
              locale: 'en',
              submittedAt: submittedAt.toISOString(),
              snapshot: sample.snapshot,
              items,
              forecastIterations
            }),
            attachments: [],
            balanceRevision: sample.snapshot.agreement?.revision ?? null,
            balancesAtSubmission: balances,
            balanceWarnings: []
          }
          await db
            .updateTable('set_response')
            .set({ export: sql`${JSON.stringify(exported)}::jsonb` })
            .where('id', '=', createdResponse.id)
            .execute()
        }
      }
    }
  }
}
