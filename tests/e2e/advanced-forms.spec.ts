import { expect, test } from '@playwright/test'

const label = (en: string, fr: string) => ({ en, fr })

test('published advanced form supports dependent choices, nested repeats and tabular application answers', async ({
  page,
  browser,
  baseURL
}) => {
  test.setTimeout(120000)
  const suffix = Date.now()
  expect(
    (
      await page.request.post('/api/admin/login', {
        data: { email: 'root@example.test', password: 'Root-test-only-2026!' }
      })
    ).ok()
  ).toBe(true)
  const agency = (
    await (
      await page.request.post('/api/admin/agencies', {
        data: { nameEn: `Advanced agency ${suffix}`, nameFr: `Organisme avancé ${suffix}` }
      })
    ).json()
  ).agency
  const key = (
    await (
      await page.request.post('/api/admin/integration-tokens', {
        data: { name: 'Advanced forms', agencyId: agency.id }
      })
    ).json()
  ).token
  const machine = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { Authorization: `Bearer ${key}` }
  })
  const applicantContext = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { Origin: baseURL! }
  })
  try {
    const program = (
      await (
        await machine.request.post('/api/government/programs', {
          data: {
            agencyId: agency.id,
            nameEn: 'Community program',
            nameFr: 'Programme communautaire'
          }
        })
      ).json()
    ).program
    const stream = (
      await (
        await machine.request.post('/api/government/streams', {
          data: { programId: program.id, nameEn: 'Projects', nameFr: 'Projets' }
        })
      ).json()
    ).stream
    const definition = {
      schemaVersion: 3,
      title: label('Community project plan', 'Plan de projet communautaire'),
      questions: [
        {
          id: 'sector',
          type: 'select',
          label: label('Sector', 'Secteur'),
          required: true,
          options: [
            { value: 'arts', label: label('Arts', 'Arts') },
            { value: 'science', label: label('Science', 'Sciences') }
          ]
        },
        {
          id: 'discipline',
          type: 'select',
          label: label('Discipline', 'Discipline'),
          required: true,
          options: [
            { value: 'painting', label: label('Painting', 'Peinture') },
            { value: 'physics', label: label('Physics', 'Physique') }
          ],
          dependsOn: {
            questionId: 'sector',
            optionsByValue: {
              arts: [{ value: 'painting', label: label('Painting', 'Peinture') }],
              science: [{ value: 'physics', label: label('Physics', 'Physique') }]
            }
          }
        },
        {
          id: 'projects',
          type: 'list',
          label: label('Projects', 'Projets'),
          required: true,
          maxItems: 5
        },
        { id: 'tasks', type: 'list', label: label('Tasks', 'Tâches'), required: true, maxItems: 5 },
        {
          id: 'costs',
          type: 'table',
          label: label('Task costs', 'Coûts de la tâche'),
          required: true,
          maxRows: 10,
          columns: [
            { id: 'item', label: label('Item', 'Élément'), type: 'text', required: true },
            { id: 'amount', label: label('Amount', 'Montant'), type: 'number', required: true }
          ]
        },
        {
          id: 'impact',
          type: 'text',
          label: label('Expected impact', 'Retombées attendues'),
          hint: label('Describe the benefit.', 'Décrivez les avantages.'),
          required: true,
          maxLength: 500
        }
      ],
      pages: [
        {
          id: 'main',
          title: label('Your project', 'Votre projet'),
          questionIds: ['sector', 'discipline', 'projects'],
          groups: [
            {
              id: 'project',
              title: label('Project: {{item}}', 'Projet : {{item}}'),
              repeatFor: 'projects',
              questionIds: ['tasks'],
              groups: [
                {
                  id: 'task',
                  title: label('Task: {{item}}', 'Tâche : {{item}}'),
                  repeatFor: 'tasks',
                  questionIds: ['costs'],
                  groups: []
                }
              ]
            }
          ],
          branches: [
            {
              when: {
                match: 'all',
                conditions: [{ questionId: 'sector', operator: 'equals', value: 'arts' }]
              },
              destination: { kind: 'page', pageId: 'impact_page' }
            }
          ],
          next: { kind: 'end' }
        },
        {
          id: 'impact_page',
          title: label('Community impact', 'Retombées communautaires'),
          description: label('Explain the expected result.', 'Expliquez le résultat attendu.'),
          questionIds: ['impact'],
          groups: [],
          branches: []
        }
      ]
    }
    const surveyResponse = await machine.request.post('/api/government/surveys', {
      data: { agencyId: agency.id, definition }
    })
    expect(surveyResponse.ok(), await surveyResponse.text()).toBe(true)
    const survey = (await surveyResponse.json()).survey
    const secondResponse = await machine.request.post('/api/government/surveys', {
      data: {
        agencyId: agency.id,
        definition: {
          schemaVersion: 3,
          title: label('Follow-up report', 'Rapport de suivi'),
          questions: [
            {
              id: 'progress',
              type: 'text',
              label: label('Progress', 'Progrès'),
              required: true,
              maxLength: 500
            }
          ],
          pages: [
            {
              id: 'report',
              title: label('Report', 'Rapport'),
              questionIds: ['progress'],
              groups: [],
              branches: []
            }
          ]
        }
      }
    })
    expect(secondResponse.ok()).toBe(true)
    const second = (await secondResponse.json()).survey
    for (const [index, form] of [survey, second].entries()) {
      const callResponse = await machine.request.post('/api/government/calls', {
        data: {
          streamId: stream.id,
          nameEn: form.definition.title.en,
          nameFr: form.definition.title.fr,
          startDate: '2020-01-01',
          endDate: '2099-12-31',
          sourceSystem: 'gcs-ssc-opportunity-shim',
          foreignSystemId: String(900000 + index + Number(suffix % 100000))
        }
      })
      expect(callResponse.ok()).toBe(true)
      const callId = (await callResponse.json()).id
      expect(
        (
          await machine.request.put(`/api/government/calls/${callId}/survey`, {
            data: { surveyId: form.id, revision: form.revision }
          })
        ).ok()
      ).toBe(true)
      expect(
        (
          await machine.request.patch(`/api/government/calls/${callId}/publication`, {
            data: { published: true }
          })
        ).ok()
      ).toBe(true)
    }
    const applicant = await applicantContext.newPage()
    expect(
      (
        await applicant.request.post('/api/auth/sign-up/email', {
          data: {
            name: 'Advanced applicant',
            email: `advanced-${suffix}@example.test`,
            password: 'Applicant-test-only-2026!'
          }
        })
      ).ok()
    ).toBe(true)
    const userId = (await (await applicant.request.get('/api/session')).json()).user.id
    const organization = (
      await (
        await applicant.request.post('/api/organizations', {
          data: { name: `Advanced organization ${suffix}` }
        })
      ).json()
    ).organization
    expect(
      (
        await applicant.request.patch(`/api/organizations/${organization.id}/members/${userId}`, {
          data: {
            permissions: ['user', 'admin', 'application:manager', 'form:manager']
          }
        })
      ).ok()
    ).toBe(true)
    await applicant.goto(`/organizations/${organization.id}?section=funding`)
    await expect(applicant.getByRole('heading', { name: 'Community project plan' })).toBeVisible()
    await expect(applicant.getByRole('heading', { name: 'Follow-up report' })).toBeVisible()
    const project = applicant
      .locator('section.record-summary')
      .filter({ hasText: 'Community project plan' })
    await project.getByRole('button', { name: 'Start application' }).click()
    await expect(
      applicant.getByRole('heading', { level: 1, name: 'Community project plan' })
    ).toBeVisible()
    await expect(applicant.getByRole('heading', { name: 'Your project' })).toBeVisible()
    await applicant.getByRole('combobox', { name: 'Sector' }).selectOption('arts')
    await expect(
      applicant.getByRole('combobox', { name: 'Discipline' }).locator('option')
    ).toHaveText(['Select an option', 'Painting'])
    await applicant.getByRole('combobox', { name: 'Discipline' }).selectOption('painting')
    await applicant.getByRole('button', { name: 'Add item' }).first().click()
    await applicant.getByRole('textbox', { name: 'Projects 1' }).fill('Garden')
    await expect(applicant.getByRole('heading', { name: 'Project: Garden' })).toBeVisible()
    await applicant.getByRole('button', { name: 'Add item' }).last().click()
    await applicant.getByRole('textbox', { name: 'Tasks 1' }).fill('Planting')
    await expect(applicant.getByRole('heading', { name: 'Task: Planting' })).toBeVisible()
    await applicant.getByRole('button', { name: 'Add row' }).click()
    await applicant.getByRole('textbox', { name: 'Item' }).fill('Seeds')
    await applicant.getByRole('textbox', { name: 'Amount' }).fill('0')
    await applicant.getByRole('button', { name: 'Next page' }).click()
    await expect(applicant.getByRole('heading', { name: /Community impact/ })).toBeVisible()
    await applicant.locator('gcds-lang-toggle').getByRole('link').click()
    await expect(applicant.getByRole('heading', { name: /Retombées communautaires/ })).toBeVisible()
    await expect(applicant.getByText('Expliquez le résultat attendu.')).toBeVisible()
    await expect(applicant.getByText('Décrivez les avantages.')).toBeVisible()
    await applicant.getByRole('textbox', { name: 'Retombées attendues' }).fill('Un jardin partagé')
    await applicant.locator('gcds-lang-toggle').getByRole('link').click()
    await expect(applicant.getByRole('textbox', { name: 'Expected impact' })).toHaveValue(
      'Un jardin partagé'
    )
    await applicant.getByRole('button', { name: 'Check responses' }).click()
    await expect(applicant.getByText('The responses are valid.')).toBeVisible()
    await applicant.getByRole('button', { name: 'Save draft' }).click()
    await expect(applicant.getByText('You have unsaved changes.')).toHaveCount(0)
    await expect(applicant.getByRole('heading', { name: /Community impact/ })).toBeVisible()
    await expect(applicant.getByRole('textbox', { name: 'Expected impact' })).toHaveValue(
      'Un jardin partagé'
    )
    const responseId = applicant.url().split('/').at(-1)!
    let draft = (
      await (
        await applicant.request.get(`/api/organizations/${organization.id}/responses/${responseId}`)
      ).json()
    ).response
    expect(draft.items[0].answers).toMatchObject({
      sector: 'arts',
      discipline: 'painting',
      impact: 'Un jardin partagé'
    })
    await applicant.reload()
    await expect(applicant.getByRole('combobox', { name: 'Sector' })).toHaveValue('arts')
    await applicant.getByRole('button', { name: 'Next page' }).click()
    await expect(applicant.getByRole('textbox', { name: 'Expected impact' })).toHaveValue(
      'Un jardin partagé'
    )
    await applicant.getByRole('button', { name: 'Previous page' }).click()
    await applicant.getByRole('combobox', { name: 'Sector' }).selectOption('science')
    await expect(
      applicant.getByRole('combobox', { name: 'Discipline' }).locator('option')
    ).toHaveText(['Select an option', 'Physics'])
    await expect(applicant.getByRole('combobox', { name: 'Discipline' })).toHaveValue('')
    await applicant.getByRole('combobox', { name: 'Discipline' }).selectOption('physics')
    await expect(applicant.getByRole('heading', { name: /Community impact/ })).toHaveCount(0)
    await applicant.getByRole('button', { name: 'Check responses' }).click()
    await applicant.getByRole('button', { name: 'Save draft' }).click()
    draft = (
      await (
        await applicant.request.get(`/api/organizations/${organization.id}/responses/${responseId}`)
      ).json()
    ).response
    expect(draft.items[0].answers).toMatchObject({ sector: 'science', discipline: 'physics' })
    expect(draft.items[0].answers).not.toHaveProperty('impact')
    expect(JSON.stringify(draft.items)).toContain('costs@r_')
    expect(
      (
        await applicant.request.post(
          `/api/organizations/${organization.id}/responses/${responseId}/check`,
          {
            data: { expectedRevision: draft.revision }
          }
        )
      ).ok()
    ).toBe(true)
    expect(
      (
        await applicant.request.post(
          `/api/organizations/${organization.id}/responses/${responseId}/submit`,
          {
            data: {
              expectedRevision: draft.revision,
              balanceRevision: null,
              warningsAcknowledged: true
            }
          }
        )
      ).ok()
    ).toBe(true)
    const exported = await machine.request.get(`/api/government/submissions/${responseId}/response`)
    expect(exported.ok()).toBe(true)
    const raw = await exported.json()
    expect(JSON.stringify(raw)).toContain('costs@r_')
  } finally {
    await applicantContext.close()
    await machine.close()
  }
})
