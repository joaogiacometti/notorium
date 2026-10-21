-- Custom migration: Drizzle cannot generate extensions or functions.
-- unaccent() is STABLE (its dictionary could change), so it cannot back an
-- index; this IMMUTABLE wrapper pins the dictionary by OID at creation time
-- and keeps search_path out of the lookup. Plain SQL (no LANGUAGE c) so it
-- runs without superuser on Neon.
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE OR REPLACE FUNCTION immutable_unaccent(value text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  RETURN unaccent('unaccent'::regdictionary, value);
