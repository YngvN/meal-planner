import { ShoppingCart, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '../../../i18n'
import { useRecipeFeasibility } from '../useRecipeFeasibility'
import type { RecipeIngredient } from '../../recipes/types'
import './RecipePantryCheck.scss'

interface Props {
  ingredients: RecipeIngredient[]
}

/**
 * Shows whether the user can make a recipe based on their current pantry.
 * Accounts for ingredient alternatives — having ANY member of a group in
 * stock counts as satisfied.
 */
export function RecipePantryCheck({ ingredients }: Props) {
  const { t } = useLanguage()
  const { canMake, missingCount, missingGroups, matchRatio } = useRecipeFeasibility(ingredients)

  if (ingredients.length === 0) return null

  return (
    <div className={`recipe-pantry-check ${canMake ? 'recipe-pantry-check--ok' : 'recipe-pantry-check--missing'}`}>
      <div className="recipe-pantry-check__header">
        {canMake ? (
          <CheckCircle2 size={18} aria-hidden className="recipe-pantry-check__icon" />
        ) : (
          <ShoppingCart size={18} aria-hidden className="recipe-pantry-check__icon" />
        )}
        <span className="recipe-pantry-check__title">
          {canMake
            ? t('pantry.feasibility.canMake')
            : t('pantry.feasibility.missing', { count: String(missingCount) })}
        </span>
        <span className="recipe-pantry-check__ratio">
          {Math.round(matchRatio * 100)}%
        </span>
      </div>

      {!canMake && missingGroups.length > 0 && (
        <ul className="recipe-pantry-check__missing-list">
          {missingGroups.map((g) => (
            <li key={g.ids[0]} className="recipe-pantry-check__missing-item">
              {g.name}
              {g.ids.length > 1 && (
                <span className="recipe-pantry-check__missing-alternatives">
                  {' '}({t('pantry.feasibility.orAlternatives', { alts: g.ids.slice(1).join(', ') })})
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
