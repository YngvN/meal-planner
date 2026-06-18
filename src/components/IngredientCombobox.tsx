import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Plus, X } from 'lucide-react'
import type { Ingredient } from '../features/ingredients/types'
import './IngredientCombobox.scss'

interface IngredientComboboxProps {
  /** Currently selected ingredient id. */
  value: string | undefined
  onChange: (ingredientId: string) => void
  options: Ingredient[]
  /**
   * Called when the user types a name that doesn't exist and confirms (Enter).
   * Should dispatch createIngredient and return the new ingredient's id.
   */
  onCreateNew: (name: string) => Promise<string>
  placeholder?: string
  className?: string
}

/**
 * Search-as-you-type ingredient selector.
 * Filters the ingredient library as the user types.
 * Pressing Enter when no match exists creates a new ingredient with the typed name.
 * Keyboard: ↑/↓ to navigate, Enter to select/create, Esc to dismiss.
 */
export function IngredientCombobox({
  value,
  onChange,
  options,
  onCreateNew,
  placeholder = 'Search ingredients…',
  className,
}: IngredientComboboxProps) {
  const selected = options.find((o) => o.id === value)

  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(0)
  const [creating, setCreating] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Close on click-outside
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  // Reset highlight when results change
  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(inputValue.toLowerCase()),
  )
  const showCreate = inputValue.trim().length > 0 && !options.some(
    (o) => o.name.toLowerCase() === inputValue.trim().toLowerCase(),
  )
  const totalItems = filtered.length + (showCreate ? 1 : 0)

  function openWithInput(val: string) {
    setInputValue(val)
    setIsOpen(true)
    setHighlightIdx(0)
  }

  function handleSelect(ingredient: Ingredient) {
    onChange(ingredient.id)
    setInputValue('')
    setIsOpen(false)
  }

  function handleClear() {
    setInputValue('')
    setIsOpen(false)
    // Signal no selection by calling onChange with empty string — callers treat '' as cleared
    onChange('')
    inputRef.current?.focus()
  }

  async function handleCreate() {
    const name = inputValue.trim()
    if (!name || creating) return
    setCreating(true)
    try {
      const id = await onCreateNew(name)
      onChange(id)
      setInputValue('')
      setIsOpen(false)
    } finally {
      setCreating(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) {
      if (e.key !== 'Escape') setIsOpen(true)
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightIdx((i) => Math.min(i + 1, totalItems - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightIdx((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightIdx < filtered.length) {
          handleSelect(filtered[highlightIdx])
        } else if (showCreate) {
          handleCreate()
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current) return
    const item = listRef.current.children[highlightIdx] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [highlightIdx])

  return (
    <div
      ref={containerRef}
      className={['ingredient-combobox', className].filter(Boolean).join(' ')}
    >
      {selected && !isOpen ? (
        // Selected state — show name + clear button
        <div className="ingredient-combobox__selected">
          {selected.imageUrl && (
            <img
              src={selected.imageUrl}
              alt=""
              className="ingredient-combobox__thumb"
              loading="lazy"
            />
          )}
          <span className="ingredient-combobox__selected-name">{selected.name}</span>
          <button
            type="button"
            className="ingredient-combobox__clear"
            onClick={handleClear}
            aria-label="Clear selection"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      ) : (
        // Search input
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-activedescendant={isOpen ? `icb-item-${highlightIdx}` : undefined}
          className="ingredient-combobox__input"
          value={inputValue}
          placeholder={selected ? selected.name : placeholder}
          onChange={(e) => openWithInput(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
      )}

      {isOpen && (
        <ul
          ref={listRef}
          role="listbox"
          className="ingredient-combobox__dropdown"
        >
          {filtered.map((ing, idx) => (
            <li
              key={ing.id}
              id={`icb-item-${idx}`}
              role="option"
              aria-selected={idx === highlightIdx}
              className={[
                'ingredient-combobox__option',
                idx === highlightIdx && 'ingredient-combobox__option--highlighted',
              ].filter(Boolean).join(' ')}
              onMouseDown={(e) => {
                e.preventDefault() // prevent blur before click
                handleSelect(ing)
              }}
              onMouseEnter={() => setHighlightIdx(idx)}
            >
              {ing.imageUrl && (
                <img
                  src={ing.imageUrl}
                  alt=""
                  className="ingredient-combobox__option-thumb"
                  loading="lazy"
                />
              )}
              <span className="ingredient-combobox__option-name">{ing.name}</span>
              <span className="ingredient-combobox__option-category">{ing.category}</span>
            </li>
          ))}

          {showCreate && (
            <li
              id={`icb-item-${filtered.length}`}
              role="option"
              aria-selected={highlightIdx === filtered.length}
              className={[
                'ingredient-combobox__option',
                'ingredient-combobox__option--create',
                highlightIdx === filtered.length && 'ingredient-combobox__option--highlighted',
              ].filter(Boolean).join(' ')}
              onMouseDown={(e) => {
                e.preventDefault()
                handleCreate()
              }}
              onMouseEnter={() => setHighlightIdx(filtered.length)}
            >
              <span className="ingredient-combobox__create-icon"><Plus size={16} aria-hidden /></span>
              <span>
                {creating ? 'Creating…' : `Create "${inputValue.trim()}"`}
              </span>
            </li>
          )}

          {filtered.length === 0 && !showCreate && (
            <li className="ingredient-combobox__empty">No ingredients found</li>
          )}
        </ul>
      )}
    </div>
  )
}
