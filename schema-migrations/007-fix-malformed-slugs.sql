-- Exhibitions created before slug sanitization was enforced (see
-- src/lib/slugify.ts and the POST/PUT handlers in
-- src/app/api/admin/exhibitions) could end up with a slug containing
-- whatever the admin typed verbatim -- e.g. a leading space and a literal
-- '&' left over from hand-abbreviating an emoji title. The exhibition's own
-- detail page still rendered fine (it reuses the exact same in-memory slug
-- string for every link), but a fresh navigation -- where the browser
-- percent-decodes the URL first -- no longer matched that exact stored
-- string, so /register (and floor-plan/hotels/book) 404'd with
-- "Exhibition not found". Clean up any slug like that so it matches what
-- the new sanitizer would have produced. Idempotent: every clause only
-- touches rows that still need it, so it's a no-op on repeat runs.
UPDATE exhibitions SET slug = TRIM(slug) WHERE slug != TRIM(slug);
UPDATE exhibitions SET slug = REPLACE(slug, '&', '') WHERE slug LIKE '%&%';
UPDATE exhibitions SET slug = REPLACE(slug, '--', '-') WHERE slug LIKE '%--%';
UPDATE exhibitions SET slug = TRIM(BOTH '-' FROM slug) WHERE slug LIKE '-%' OR slug LIKE '%-';
UPDATE exhibitions SET slug = LOWER(slug) WHERE slug != LOWER(slug);
