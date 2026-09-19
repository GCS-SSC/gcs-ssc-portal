import type { SurveyDefinition } from '@gcs-ssc/survey'
export interface SurveyRecord {
  id: string
  agencyId: string
  revision: number
  definition: SurveyDefinition
  updatedAt: string
}
export interface SurveySummary {
  id: string
  agencyId: string
  revision: number
  title: SurveyDefinition['title']
  updatedAt: string
}
