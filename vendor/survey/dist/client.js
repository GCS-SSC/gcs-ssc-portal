import { z } from 'zod';
import { surveySchema } from './index.js';
/** Call from an extension's server process. Never expose agency bearer credentials to a browser. */
export const pushSurvey = async (options) => {
    const origin = new URL(options.portalUrl);
    if (!['https:', 'http:'].includes(origin.protocol) ||
        origin.username ||
        origin.password ||
        origin.pathname !== '/' ||
        origin.search ||
        origin.hash)
        throw new Error('Portal URL must be an HTTP(S) origin');
    const definition = surveySchema.parse(options.definition);
    const path = options.existing
        ? `/api/government/surveys/${encodeURIComponent(options.existing.id)}`
        : '/api/government/surveys';
    const response = await (options.fetch ?? globalThis.fetch)(new URL(path, origin), {
        method: options.existing ? 'PUT' : 'POST',
        redirect: 'error',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${options.token}`
        },
        body: JSON.stringify(options.existing
            ? { definition, expectedRevision: options.existing.revision }
            : { definition, agencyId: options.agencyId })
    });
    if (!response.ok)
        throw new Error(`Survey import failed (${response.status})`);
    const result = z
        .object({
        survey: z.object({
            id: z.uuid(),
            agencyId: z.uuid(),
            revision: z.number().int().positive(),
            definition: surveySchema,
            updatedAt: z.iso.datetime()
        })
    })
        .parse(await response.json());
    if (result.survey.agencyId !== options.agencyId ||
        (options.existing && result.survey.id !== options.existing.id))
        throw new Error('Survey import returned an unexpected identity');
    return result;
};
