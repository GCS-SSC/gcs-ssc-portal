import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Kysely } from 'kysely'
import pg from 'pg'
import { createDatabase } from '../../server/utils/database'
import type { Database } from '../../server/db/schema'
import type { GovernmentActor } from '../../server/utils/government-access'
import {
  upgradeSurvey,
  validateSurveyAnswers,
  type AdvancedSurvey,
  type SurveyDefinition
} from '@gcs-ssc/survey'
import * as surveys from '../../server/utils/surveys'
import * as structure from '../../server/utils/government-structure'
import { createAdministrator } from '../../server/utils/administrator-accounts'
import * as admin from '../../server/utils/government-admin'
import * as portal from '../../server/utils/portal'
import { decodePublicId } from '../../server/utils/public-identifiers'
import { secretHash } from '../../server/utils/government-access'
let db: Kysely<Database>, actor: GovernmentActor, agencyId: number, otherId: number
const owner = { id: 0, name: 'Applicant', email: 'survey@example.test' }
const names = { nameEn: 'Agency', nameFr: 'Organisme' }
const definition: SurveyDefinition = {
  schemaVersion: 1,
  title: { en: 'Application', fr: 'Demande' },
  questions: [
    {
      id: 'name',
      type: 'text',
      label: { en: 'Project name', fr: 'Nom du projet' },
      required: true,
      maxLength: 200
    }
  ]
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
  owner.id = (
    await db
      .insertInto('user')
      .values({
        name: owner.name,
        email: owner.email,
        emailVerified: false,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning('id')
      .executeTakeFirstOrThrow()
  ).id
  const root = await createAdministrator(db, {
    name: 'Root',
    email: 'survey-root@example.test',
    password: 'Survey-root-test-2026!'
  })
  actor = { kind: 'administrator', administratorId: root.id }
  agencyId = (await structure.createAgency(db, actor, names)).agency.id
  otherId = (await structure.createAgency(db, actor, names)).agency.id
}, 60000)
afterAll(async () => {
  await db?.destroy()
})
describe('survey persistence and access', () => {
  it('deletes an unused draft call and rejects deletion while published', async () => {
    const { program } = await structure.createProgram(db, actor, { agencyId, ...names })
    const { stream } = await structure.createStream(db, actor, { programId: program.id, ...names })
    const call = await structure.saveCall(db, actor, {
      streamId: stream.id, ...names, startDate: '2027-01-01', endDate: '2027-12-31'
    })
    await structure.publishCall(db, actor, call.id, { published: true })
    await expect(structure.deleteDraftCall(db, actor, call.id)).rejects.toMatchObject({ statusCode: 409 })
    await structure.publishCall(db, actor, call.id, { published: false })
    expect(await structure.deleteDraftCall(db, actor, call.id)).toEqual({ success: true })
    expect(await db.selectFrom('funding_call').select('id').where('id', '=', call.id).executeTakeFirst())
      .toBeUndefined()
  })
  it('persists strict bilingual definitions, serializes concurrent revisions, and never rewrites old revisions', async () => {
    const { survey } = await surveys.createSurvey(db, actor, { agencyId, definition })
    expect(survey.definition).toEqual(definition)
    const changed = { ...definition, title: { en: 'Changed', fr: 'Modifié' } }
    const updates = await Promise.allSettled([
      surveys.updateSurvey(db, actor, survey.id, { expectedRevision: 1, definition: changed }),
      surveys.updateSurvey(db, actor, survey.id, { expectedRevision: 1, definition })
    ])
    expect(updates.filter((item) => item.status === 'fulfilled')).toHaveLength(1)
    expect((await surveys.getSurvey(db, actor, survey.id)).survey.revision).toBe(2)
    expect(
      (
        await db
          .selectFrom('survey_revision')
          .select('definition')
          .where('surveyId', '=', survey.id)
          .where('revision', '=', 1)
          .executeTakeFirstOrThrow()
      ).definition
    ).toEqual(definition)
    await expect(
      surveys.createSurvey(db, actor, { agencyId, definition: { ...definition, schemaVersion: 2 } })
    ).rejects.toThrow()
  })
  it('pins an explicit agency-matched revision to a draft call and hides it without publication and application permission', async () => {
    const { survey } = await surveys.createSurvey(db, actor, { agencyId, definition })
    const { program } = await structure.createProgram(db, actor, { agencyId, ...names })
    const { stream } = await structure.createStream(db, actor, { programId: program.id, ...names })
    const call = await structure.saveCall(db, actor, {
      streamId: stream.id,
      ...names,
      startDate: '2027-01-01',
      endDate: '2027-12-31'
    })
    const { organization } = await portal.createOrganization(db, owner.id, {
      name: 'Applicant organization'
    })
    const organizationId = decodePublicId(organization.id, 'organization')
    await surveys.attachSurvey(db, actor, call.id, { surveyId: survey.id, revision: 1 })
    await expect(
      surveys.applicantSurvey(db, organizationId, owner.id, call.id)
    ).rejects.toMatchObject({ statusCode: 403 })
    await portal.updatePermissions(db, organizationId, owner.id, owner.id, {
      permissions: ['user', 'admin', 'application']
    })
    await expect(
      surveys.applicantSurvey(db, organizationId, owner.id, call.id)
    ).rejects.toMatchObject({ statusCode: 404 })
    await structure.publishCall(db, actor, call.id, { published: true })
    expect(
      (await surveys.applicantSurvey(db, organizationId, owner.id, call.id)).survey.definition
    ).toEqual(definition)
    await surveys.updateSurvey(db, actor, survey.id, {
      expectedRevision: 1,
      definition: { ...definition, title: { en: 'New', fr: 'Nouveau' } }
    })
    expect(
      (await surveys.applicantSurvey(db, organizationId, owner.id, call.id)).survey.revision
    ).toBe(1)
    await expect(
      surveys.attachSurvey(db, actor, call.id, { surveyId: survey.id, revision: 2 })
    ).rejects.toMatchObject({ statusCode: 409 })
    await structure.publishCall(db, actor, call.id, { published: false })
    const foreign = (await surveys.createSurvey(db, actor, { agencyId: otherId, definition }))
      .survey
    await expect(
      surveys.attachSurvey(db, actor, call.id, { surveyId: foreign.id, revision: 1 })
    ).rejects.toMatchObject({ statusCode: 404 })
    await surveys.attachSurvey(db, actor, call.id, { surveyId: survey.id, revision: 2 })
    await structure.publishCall(db, actor, call.id, { published: true })
    expect(
      (await surveys.applicantSurvey(db, organizationId, owner.id, call.id)).survey.revision
    ).toBe(2)
    await expect(surveys.applicantSurvey(db, organizationId, -1, call.id)).rejects.toMatchObject({
      statusCode: 404
    })
  })
  it('saves a structured revision without rewriting v1 and rejects invalid flow at the API boundary', async () => {
    const { survey } = await surveys.createSurvey(db, actor, { agencyId, definition })
    const structured = upgradeSurvey(definition)
    structured.description = { en: 'Application details', fr: 'Détails de la demande' }
    structured.pages[0]!.branches = [
      {
        when: { match: 'all', conditions: [{ questionId: 'name', operator: 'answered' }] },
        destination: { kind: 'end' }
      }
    ]
    const result = await surveys.updateSurvey(db, actor, survey.id, {
      expectedRevision: 1,
      definition: structured
    })
    expect(result.survey.definition).toEqual(structured)
    expect(
      (
        await db
          .selectFrom('survey_revision')
          .select('definition')
          .where('surveyId', '=', survey.id)
          .where('revision', '=', 1)
          .executeTakeFirstOrThrow()
      ).definition
    ).toEqual(definition)
    const invalid = structuredClone(structured)
    invalid.pages[0]!.next = { kind: 'page', pageId: invalid.pages[0]!.id }
    await expect(
      surveys.updateSurvey(db, actor, survey.id, { expectedRevision: 2, definition: invalid })
    ).rejects.toThrow()
    invalid.pages[0]!.next = undefined
    invalid.description!.fr = ''
    await expect(
      surveys.createSurvey(db, actor, { agencyId, definition: invalid })
    ).rejects.toThrow()
    expect((await surveys.getSurvey(db, actor, survey.id)).survey.revision).toBe(2)
  })
  it('accepts agency-scoped integration writes but forbids cross-agency reads and writes', async () => {
    const credential = await admin.createToken(db, actor, { agencyId, name: 'Survey publisher' })
    const machine: GovernmentActor = {
      kind: 'integration',
      tokenHash: secretHash(credential.token)
    }
    const { survey } = await surveys.createSurvey(db, machine, { agencyId, definition })
    await surveys.updateSurvey(db, machine, survey.id, { expectedRevision: 1, definition })
    const foreign = (await surveys.createSurvey(db, actor, { agencyId: otherId, definition }))
      .survey
    await expect(surveys.getSurvey(db, machine, foreign.id)).rejects.toMatchObject({
      statusCode: 404
    })
    await expect(
      surveys.updateSurvey(db, machine, foreign.id, { expectedRevision: 1, definition })
    ).rejects.toMatchObject({ statusCode: 404 })
    await expect(
      surveys.createSurvey(db, machine, { agencyId: otherId, definition })
    ).rejects.toMatchObject({ statusCode: 404 })
    await expect(
      surveys.listSurveys(db, { kind: 'integration', tokenHash: 'not-a-token' }, agencyId)
    ).rejects.toMatchObject({ statusCode: 401 })
    await admin.revokeToken(db, actor, credential.id)
    await expect(
      surveys.updateSurvey(db, machine, survey.id, { expectedRevision: 2, definition })
    ).rejects.toMatchObject({ statusCode: 401 })
  })
  it('persists a nested v3 form and validates repeated answers at the portal boundary', async () => {
    const label = (en: string, fr: string) => ({ en, fr })
    const advanced: AdvancedSurvey = {
      schemaVersion: 3,
      title: label('Project plan', 'Plan de projet'),
      questions: [
        {
          id: 'projects',
          type: 'list',
          label: label('Projects', 'Projets'),
          required: true,
          maxItems: 5
        },
        { id: 'tasks', type: 'list', label: label('Tasks', 'Tâches'), required: true, maxItems: 5 },
        { id: 'cost', type: 'number', label: label('Cost', 'Coût'), required: true }
      ],
      pages: [
        {
          id: 'overview',
          title: label('Overview', 'Aperçu'),
          questionIds: ['projects'],
          groups: [
            {
              id: 'project',
              title: label('Project {{item}}', 'Projet {{item}}'),
              repeatFor: 'projects',
              questionIds: ['tasks'],
              groups: [
                {
                  id: 'task',
                  title: label('Task {{item}}', 'Tâche {{item}}'),
                  repeatFor: 'tasks',
                  questionIds: ['cost'],
                  groups: []
                }
              ]
            }
          ],
          branches: []
        }
      ]
    }
    const created = await surveys.createSurvey(db, actor, { agencyId, definition: advanced })
    expect((await surveys.getSurvey(db, actor, created.survey.id)).survey.definition).toEqual(
      advanced
    )
    const answers = {
      projects: '[{"id":"r_a","value":"A"}]',
      'tasks@r_a': '[{"id":"r_b","value":"B"}]',
      'cost@r_a@r_b': '0'
    }
    expect(validateSurveyAnswers(advanced, answers).errors).toEqual({})
    expect(
      validateSurveyAnswers(advanced, { ...answers, 'cost@r_a@r_b': 'invalid' }).errors[
        'cost@r_a@r_b'
      ]
    ).toBe('number')
  })
})
