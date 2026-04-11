"use client";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_DECK_NAME } from "@/features/decks/constants";
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
  placeholder = DEFAULT_DECK_NAME,
  id,
  label = "Deck",
  error,
  ariaInvalid,
  disabled,
}: Readonly<DeckSelectProps>) {
  const defaultDeck = decks.find((d) => d.isDefault);
  const nonDefaultDecks = decks.filter((d) => !d.isDefault);

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        value={value ?? undefined}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger id={id} aria-invalid={ariaInvalid}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {defaultDeck && (
            <SelectItem value={defaultDeck.id}>
              <span className="text-muted-foreground">{defaultDeck.name}</span>
            </SelectItem>
          )}
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
