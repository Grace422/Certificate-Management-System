-- Notes from the reviewer (e.g. reason for rejection, or verification
-- remarks) - added separately rather than editing migration 007, since
-- past migrations must never change once applied.
ALTER TABLE loss_declarations ADD COLUMN review_notes TEXT;
