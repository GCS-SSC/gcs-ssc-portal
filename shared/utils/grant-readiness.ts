import { grantConfigurationReady, type SurveyDefinition } from '@gcs-ssc/survey'
/** Empty authoring catalogs may be saved as drafts but cannot be published. */
export const grantDefinitionReady = (definition: SurveyDefinition): boolean => definition.questions.every(question =>
  (question.type !== 'budget' && question.type !== 'activities') || grantConfigurationReady(question))
