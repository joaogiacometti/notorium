import { Bell, Layers, type LucideIcon, Palette, User } from "lucide-react";

/** Stable section keys; also used as the `?settings=` deep-link value. */
export type SettingsSectionId =
  | "account"
  | "appearance"
  | "notifications"
  | "flashcards";

export interface SettingsSection {
  id: SettingsSectionId;
  label: string;
  icon: LucideIcon;
}

/**
 * Sidebar entries for the settings dialog, in display order. Notifications is
 * filtered out by the dialog when email delivery is not configured.
 */
export const settingsSections: SettingsSection[] = [
  { id: "account", label: "Account", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "flashcards", label: "Flashcards", icon: Layers },
];

/**
 * Resolve a raw `?settings=` value to a known section, falling back to the
 * Account section so a malformed deep link still opens somewhere sensible.
 *
 * @example
 * resolveSettingsSection("notifications"); // "notifications"
 * resolveSettingsSection("bogus"); // "account"
 */
export function resolveSettingsSection(
  value: string | null,
): SettingsSectionId {
  const match = settingsSections.find((section) => section.id === value);
  return match?.id ?? "account";
}
