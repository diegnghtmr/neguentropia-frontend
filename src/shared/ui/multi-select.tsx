"use client";
import { ScrollAreaList } from "@/shared/ui/scroll-area";

import * as React from "react";
import { cn } from "@/shared/lib/utils";
import {
  controlRadiusStyle,
  type ControlAppearanceProps,
} from "@/shared/lib/cojeev/control-appearance";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  ItemAdornment,
  type ItemAdornmentValue,
} from "@/shared/ui/item-adornment";
import { StateChevron } from "@/shared/ui/animated-icon";
import { Icon } from "@/shared/ui/icon";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/popover";

function countLabel(count: number) {
  return `${count} ${count === 1 ? "seleccionado" : "seleccionados"}`;
}

export type MultiSelectOption = {
  /** Stable, unique value submitted with the form. */
  value: string;
  label: string;
  /** Optional short text for the selected token; the full label stays in its title and accessible name. */
  tokenLabel?: string;
  /** A disabled option cannot be selected or removed. */
  disabled?: boolean;
  adornment?: ItemAdornmentValue;
};

export type MultiSelectProps = ControlAppearanceProps & {
  /** Tokens are individually removable; summary is compact; checklist stays open. */
  presentation?: "tokens" | "summary" | "checklist";
  /** Visible accessible label for the trigger and its choices. */
  label: string;
  options: readonly MultiSelectOption[];
  /** Per-option adornments take precedence over this shared default. */
  adornment?: ItemAdornmentValue;
  /** Controlled selected values. Values absent from options remain removable. */
  value?: readonly string[];
  /** Initial selection when value is omitted. */
  defaultValue?: readonly string[];
  onValueChange?: (value: string[]) => void;
  /** Submits one hidden form entry per selected value. */
  name?: string;
  id?: string;
  disabled?: boolean;
  description?: string;
  /** Sets the trigger's invalid state and announces the error. */
  error?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  noResultsMessage?: string;
  className?: string;
};

const unique = (values: readonly string[]) => [...new Set(values)];

export function MultiSelect({
  presentation = "tokens",
  radius,
  appearance,
  label,
  options,
  adornment = "auto",
  value,
  defaultValue = [],
  onValueChange,
  name,
  id,
  disabled = false,
  description,
  error,
  placeholder = "Elige opciones",
  searchPlaceholder = "Buscar opciones",
  emptyMessage = "No hay opciones disponibles.",
  noResultsMessage = "No hay opciones que coincidan.",
  className,
}: MultiSelectProps) {
  const generatedId = React.useId();
  const controlId = id ?? `multi-select-${generatedId}`;
  const [internalValue, setInternalValue] = React.useState(() =>
    unique(defaultValue),
  );
  const [popover, setPopover] = React.useState({
    open: false,
    disabled,
    presentation,
  });
  const [query, setQuery] = React.useState("");
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const choicesRef = React.useRef<HTMLDivElement>(null);
  const resetting = React.useRef(false);
  const selected = unique(value ?? internalValue);
  const indexed = [
    ...new Map(options.map((option) => [option.value, option])).values(),
  ];
  const selectedSet = new Set(selected);
  const term = query.trim().toLocaleLowerCase();
  const filtered = indexed.filter((option) =>
    option.label.toLocaleLowerCase().includes(term),
  );
  // Disabling a field closes it; re-enabling must not reopen a stale popup.
  if (popover.disabled !== disabled || popover.presentation !== presentation) {
    setPopover({ open: false, disabled, presentation });
    if (query) setQuery("");
  }
  React.useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;
    let resetTimer: ReturnType<typeof setTimeout> | undefined;
    // Child checkbox primitives also listen for reset. The collection owns
    // reset atomically, after the caller has had a chance to prevent it.
    const reset = (event: Event) => {
      resetting.current = true;
      clearTimeout(resetTimer);
      // A microtask may run between native event listeners. Defer beyond the
      // entire reset dispatch so a bubbling React handler can prevent it.
      resetTimer = setTimeout(() => {
        if (!event.defaultPrevented && value === undefined)
          setInternalValue(unique(defaultValue));
        resetting.current = false;
      }, 0);
    };
    form.addEventListener("reset", reset, true);
    return () => {
      form.removeEventListener("reset", reset, true);
      clearTimeout(resetTimer);
      resetting.current = false;
    };
  }, [defaultValue, value]);
  const descriptions = [
    description && `${controlId}-description`,
    error && `${controlId}-error`,
    `${controlId}-status`,
  ]
    .filter(Boolean)
    .join(" ");

  const change = (next: string[]) => {
    if (disabled || resetting.current) return;
    if (value === undefined) setInternalValue(next);
    onValueChange?.(next);
  };
  const toggle = (option: MultiSelectOption, checked: boolean) => {
    if (disabled || option.disabled) return;
    if (checked === selectedSet.has(option.value)) return;
    change(
      selectedSet.has(option.value)
        ? selected.filter((item) => item !== option.value)
        : [...selected, option.value],
    );
  };
  const changeOpen = (next: boolean) => {
    setPopover({ open: next && !disabled, disabled, presentation });
    if (!next) setQuery("");
  };
  const focusChoice = (index: number) => {
    const choices = choicesRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="checkbox"]:not(:disabled)',
    );
    if (choices?.length)
      choices[(index + choices.length) % choices.length]?.focus();
  };
  const remove = (item: string) => {
    const index = selected.indexOf(item);
    change(selected.filter((value) => value !== item));
    requestAnimationFrame(() => {
      const buttons = rootRef.current?.querySelectorAll<HTMLButtonElement>(
        '[data-slot="multi-select-remove"]:not(:disabled)',
      );
      (
        buttons?.[Math.min(index, buttons.length - 1)] ??
        triggerRef.current ??
        searchRef.current
      )?.focus();
    });
  };

  const choices = (
    <>
      <Input
        ref={searchRef}
        id={presentation === "checklist" ? controlId : `${controlId}-search`}
        appearance={appearance}
        radius={radius}
        type="search"
        size="sm"
        disabled={disabled}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={searchPlaceholder}
        aria-label={`Buscar en ${label}`}
        aria-describedby={descriptions}
        aria-invalid={!!error || undefined}
        autoComplete="off"
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            focusChoice(event.key === "ArrowDown" ? 0 : -1);
          }
          if (event.key === "Enter") event.preventDefault();
        }}
      />
      <ScrollAreaList maxHeight="min(280px,40dvh)">
        <div
          ref={choicesRef}
          data-slot="multi-select-options"
          className="v-multi-select__options"
          role="group"
          aria-label={`Opciones de ${label}`}
          onKeyDown={(event) => {
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
              return;
            const choices = [
              ...(choicesRef.current?.querySelectorAll<HTMLButtonElement>(
                '[role="checkbox"]:not(:disabled)',
              ) ?? []),
            ];
            const current = choices.indexOf(event.target as HTMLButtonElement);
            if (current < 0) return;
            event.preventDefault();
            focusChoice(
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? -1
                  : current + (event.key === "ArrowDown" ? 1 : -1),
            );
          }}
        >
          {filtered.map((option) => {
            const optionId = `${controlId}-option-${indexed.indexOf(option)}`;
            return (
              <div
                key={option.value}
                className="v-multi-select__option"
                data-disabled={option.disabled || undefined}
                data-selected={selectedSet.has(option.value) || undefined}
              >
                <Checkbox
                  id={optionId}
                  checked={selectedSet.has(option.value)}
                  disabled={disabled || option.disabled}
                  onCheckedChange={(next) => toggle(option, next === true)}
                />
                <label htmlFor={optionId}>
                  <ItemAdornment
                    identity={option.value}
                    value={option.adornment ?? adornment}
                  />
                  <span>{option.label}</span>
                </label>
              </div>
            );
          })}
          {!filtered.length && (
            <p className="v-multi-select__empty" role="status">
              {indexed.length ? noResultsMessage : emptyMessage}
            </p>
          )}
        </div>
      </ScrollAreaList>
      {presentation !== "tokens" &&
        selected.some(
          (item) => !indexed.some((option) => option.value === item),
        ) && (
          <div
            className="v-multi-select__unavailable"
            role="group"
            aria-label="Selecciones no disponibles"
          >
            <p className="v-multi-select__hint">
              Ya no están en la lista. Se conservan hasta que las quites.
            </p>
            {selected
              .filter(
                (item) => !indexed.some((option) => option.value === item),
              )
              .map((item) => (
                <Button
                  key={item}
                  data-stable-hit
                  data-slot="multi-select-remove"
                  variant="outline"
                  disabled={disabled}
                  aria-label={`Quitar ${item}`}
                  onClick={() => remove(item)}
                >
                  {item}
                  <Icon name="x" size="sm" />
                </Button>
              ))}
          </div>
        )}
      {presentation === "checklist" && (
        <p className="v-multi-select__hint">
          {`${countLabel(selected.length)}. Escribe o usa las flechas para buscar una opción.`}
        </p>
      )}
    </>
  );
  const summary = selected.map(
    (item) => indexed.find((option) => option.value === item)?.label ?? item,
  );
  return (
    <div
      ref={rootRef}
      data-slot="multi-select"
      data-presentation={presentation}
      data-appearance={appearance}
      style={controlRadiusStyle(radius)}
      data-disabled={disabled || undefined}
      data-invalid={!!error || undefined}
      className={cn("v-multi-select", className)}
    >
      <Label id={`${controlId}-label`} htmlFor={controlId} size="sm">
        {label}
      </Label>
      {presentation === "checklist" ? (
        <div className="v-multi-select__checklist">{choices}</div>
      ) : (
        <Popover open={popover.open && !disabled} onOpenChange={changeOpen}>
          <PopoverAnchor asChild>
            <div>
              <PopoverTrigger asChild>
                <Button
                  ref={triggerRef}
                  id={controlId}
                  data-stable-hit
                  data-appearance={appearance}
                  variant="outline"
                  disabled={disabled}
                  aria-labelledby={`${controlId}-label`}
                  aria-describedby={descriptions}
                  aria-invalid={!!error || undefined}
                  className="v-multi-select__trigger"
                >
                  <span className="v-multi-select__value">
                    {selected.length ? (
                      presentation === "summary" ? (
                        <>
                          <span>
                            {summary.slice(0, 2).join(", ")}
                            {summary.length > 2
                              ? ` +${summary.length - 2}`
                              : ""}
                          </span>
                          <small>
                            {countLabel(selected.length)}. Editar selección
                          </small>
                        </>
                      ) : (
                        countLabel(selected.length)
                      )
                    ) : (
                      placeholder
                    )}
                  </span>
                  <StateChevron open={popover.open && !disabled} />
                </Button>
              </PopoverTrigger>
            </div>
          </PopoverAnchor>
          <PopoverContent
            className="v-multi-select__popover"
            aria-labelledby={`${controlId}-label`}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              searchRef.current?.focus();
            }}
          >
            {choices}
          </PopoverContent>
        </Popover>
      )}
      {presentation === "tokens" && selected.length > 0 && (
        <ul className="v-multi-select__tokens" aria-label={`${label} seleccionados`}>
          {selected.map((item) => {
            const option = indexed.find((option) => option.value === item);
            const text = option?.label ?? item;
            return (
              <li key={item}>
                <Badge size="sm" className="v-multi-select__token">
                  <span className="v-multi-select__token-label" title={text}>{option?.tokenLabel ?? text}</span>
                  <Button
                    data-stable-hit
                    data-slot="multi-select-remove"
                    variant="ghost"
                    size="sm"
                    className="v-multi-select__remove"
                    aria-label={`Quitar ${text}`}
                    disabled={disabled || option?.disabled}
                    onClick={() => remove(item)}
                  >
                    <Icon name="x" aria-hidden="true" />
                  </Button>
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
      {description && (
        <p
          id={`${controlId}-description`}
          className="v-multi-select__description"
        >
          {description}
        </p>
      )}
      {error && (
        <p
          id={`${controlId}-error`}
          className="v-multi-select__error"
          role="alert"
        >
          {error}
        </p>
      )}
      <span id={`${controlId}-status`} className="v-sr" role="status">
        {countLabel(selected.length)}.
      </span>
      {name &&
        selected.map((item) => (
          <input
            key={item}
            type="hidden"
            name={name}
            value={item}
            disabled={disabled}
          />
        ))}
    </div>
  );
}
