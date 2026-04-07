"use client";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DeckEntity } from "@/lib/server/api-contracts";

interface DeckSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  decks: DeckEntity[];
  placeholder?: string;
  id?: string;
  label?: string;
  error?: string;
  ariaInvalid?: boolean;
  disabled?: boolean;
}

export function DeckSelect({
  value,
  onChange,
  decks,
  placeholder = "General",
  id,
  label = "Deck",
  error,
  ariaInvalid,
  disabled,
}: Readonly<DeckSelectProps>) {
  const defaultDeck = decks.find((d) => d.isDefault);
  const nonDefaultDecks = decks.filter((d) => !d.isDefault);

  function handleValueChange(newValue: string) {
    if (newValue === "__default__") {
      onChange(null);
    } else {
      onChange(newValue);
    }
  }

  const isDefaultDeckSelected = value !== null && value === defaultDeck?.id;
  const selectValue =
    value === null || isDefaultDeckSelected ? "__default__" : value;

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        value={selectValue}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger id={id} aria-invalid={ariaInvalid}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__default__">
            <span className="text-muted-foreground">
              {defaultDeck ? defaultDeck.name : "General"}
            </span>
          </SelectItem>
          {nonDefaultDecks.map((deck) => (
            <SelectItem key={deck.id} value={deck.id}>
              {deck.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <FieldError errors={[{ message: error }]} /> : null}
    </Field>
  );
}
