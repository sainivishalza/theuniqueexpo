-- Tags the 150 buyers imported from the CPHI & PMEC Shenzhen 2026
-- spreadsheet (038-import-cphi-shenzhen-buyers.sql) with their source
-- exhibition. Identifies them via buyer_pending_documents rather than
-- repeating that migration's 150 login emails here: every one of those
-- buyers (and no one else) has rows there, since that table only exists to
-- track their still-unmatched document photos. Safe to re-run even after
-- those pending rows are cleared out by the later photo-matching step --
-- it just won't find any user_ids to update on a rerun, leaving whatever
-- was already set here alone.
UPDATE buyer_profiles p
JOIN (SELECT DISTINCT user_id FROM buyer_pending_documents) d ON d.user_id = p.user_id
SET p.source_exhibitions = 'CPHI'
WHERE p.source_exhibitions = '';
