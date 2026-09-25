import type { SetSnapshot, ResponseItem } from '../../shared/schemas/agreements'
import { moneyCents, centsMoney } from '../../shared/utils/money'
import { agreementRow } from './agreements'
import type { GovernmentDb } from './government-access'
export const currentBalances = async (db: GovernmentDb, snapshot: SetSnapshot) => {
  if (!snapshot.agreement) return []
  const current = await agreementRow(db, snapshot.agreement.id)
  return snapshot.agreement.config.budgetLines.map((original) => {
    const originalYear = snapshot.agreement!.config.fiscalYears.find(
      (year) => year.id === original.fiscalYearId
    )
    const liveYear = current.config.fiscalYears.find((year) => year.id === original.fiscalYearId)
    const sameYear =
      originalYear &&
      liveYear &&
      originalYear.startYear === liveYear.startYear &&
      (!originalYear.foreignSystemId || originalYear.foreignSystemId === liveYear.foreignSystemId)
    const live = sameYear
      ? current.config.budgetLines.find(
          (line) =>
            (original.foreignSystemId
              ? line.foreignSystemId === original.foreignSystemId
              : line.id === original.id) &&
            line.currency === original.currency &&
            line.fiscalYearId === original.fiscalYearId &&
            current.config.sourceSystem === snapshot.agreement!.config.sourceSystem
        )
      : undefined
    return {
      budgetLineId: original.id,
      foreignSystemId: original.foreignSystemId,
      currency: original.currency,
      available: Boolean(live),
      budgetedAmount: live?.budgetedAmount ?? null,
      balance: live?.balance ?? null,
      claimedAmount: live?.claimedAmount ?? null,
      forecastAmount: live?.forecastAmount ?? null,
      balanceAsOf: live?.balanceAsOf ?? null
    }
  })
}
export const balanceWarnings = (
  items: ResponseItem[],
  balances: Awaited<ReturnType<typeof currentBalances>>
) => {
  const totals = new Map<
    string,
    { kind: 'claim' | 'forecast'; budgetLineId: string; cents: bigint }
  >()
  for (const item of items)
    if (item.kind !== 'survey')
      for (const line of item.lines) {
        const key = `${item.kind}:${line.budgetLineId}`,
          prior = totals.get(key)
        totals.set(key, {
          kind: item.kind,
          budgetLineId: line.budgetLineId,
          cents: (prior?.cents ?? BigInt('0')) + moneyCents(line.amount)
        })
      }
  return [...totals.values()].flatMap((total) => {
    const balance = balances.find((line) => line.budgetLineId === total.budgetLineId)
    return !balance?.available ||
      balance.balance === null ||
      total.cents > moneyCents(balance.balance)
      ? [
          {
            kind: total.kind,
            budgetLineId: total.budgetLineId,
            amount: centsMoney(total.cents),
            balance: balance?.balance ?? null,
            reason: !balance?.available
              ? 'lineUnavailable'
              : balance.balance === null
                ? 'balanceUnknown'
                : 'overBalance'
          }
        ]
      : []
  })
}
