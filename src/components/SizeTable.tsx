import type { Category, Measurements, SizeSystem } from '../types'
import { recommendSize, sizeChart } from '../lib/measure'

interface SizeTableProps {
  measurements: Measurements
  category: Category
  system: SizeSystem
}

export function SizeTable({ measurements, category, system }: SizeTableProps) {
  const advice = recommendSize(measurements, category, system)
  const recommendedRu = advice.row?.ru
  const chart = sizeChart(system)

  return (
    <div className="size-table-wrap">
      <table className="size-table">
        <caption className="sr-only">
          {system === 'men' ? 'Мужская' : 'Женская'} размерная сетка и рекомендованный размер
        </caption>
        <thead>
          <tr>
            <th scope="col">RU</th>
            <th scope="col">Грудь</th>
            <th scope="col">Талия</th>
            <th scope="col">Бёдра</th>
          </tr>
        </thead>
        <tbody>
          {chart.map((row) => (
            <tr key={row.ru} className={row.ru === recommendedRu ? 'is-recommended' : undefined}>
              <th scope="row">
                {row.ru}
                <span className="size-letter">{row.label}</span>
              </th>
              <td>
                {row.chest[0]}–{row.chest[1]}
              </td>
              <td>
                {row.waist[0]}–{row.waist[1]}
              </td>
              <td>
                {row.hips[0]}–{row.hips[1]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
