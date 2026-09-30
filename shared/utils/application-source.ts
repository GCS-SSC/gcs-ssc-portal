/** GCS opportunity calls use a domain namespace; their parent streams use the GCS core namespace. */
export const applicationStreamReference = (
  callSourceSystem: string,
  stream: { sourceSystem: string; foreignSystemId: string | null }
): string | null => {
  const sameSource = stream.sourceSystem === callSourceSystem
  const gcsOpportunity =
    callSourceSystem === 'gcs-ssc-opportunity' && stream.sourceSystem === 'gcs-ssc'
  return sameSource || gcsOpportunity ? stream.foreignSystemId : null
}
