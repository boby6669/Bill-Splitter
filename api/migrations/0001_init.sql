-- Money is always stored as whole cents (INTEGER). Never REAL.

CREATE TABLE homes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CONSTRAINT homes_name_not_blank CHECK (length(trim(name)) > 0)
);

CREATE TABLE members (
  id TEXT PRIMARY KEY,
  home_id TEXT NOT NULL,
  name TEXT NOT NULL,
  -- 1, 2, 3 ... per home. This is the "order members were added" used for splitting.
  position INTEGER NOT NULL,
  CONSTRAINT members_home_fk FOREIGN KEY (home_id) REFERENCES homes (id),
  CONSTRAINT members_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT members_position_positive CHECK (position >= 1),
  CONSTRAINT members_unique_position_per_home UNIQUE (home_id, position)
);

CREATE TABLE bills (
  id TEXT PRIMARY KEY,
  home_id TEXT NOT NULL,
  title TEXT NOT NULL,
  total_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  -- Not an INTEGER in practice (SQLite is loose), so typeof() is checked too.
  CONSTRAINT bills_total_positive_integer CHECK (typeof(total_cents) = 'integer' AND total_cents > 0),
  CONSTRAINT bills_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT bills_home_fk FOREIGN KEY (home_id) REFERENCES homes (id)
);

CREATE TABLE shares (
  id TEXT PRIMARY KEY,
  bill_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  paid_at TEXT,
  idempotency_key TEXT,
  CONSTRAINT shares_bill_fk FOREIGN KEY (bill_id) REFERENCES bills (id),
  CONSTRAINT shares_member_fk FOREIGN KEY (member_id) REFERENCES members (id),
  CONSTRAINT shares_amount_non_negative CHECK (typeof(amount_cents) = 'integer' AND amount_cents >= 0),
  -- One share per member per bill.
  CONSTRAINT shares_unique_member_per_bill UNIQUE (bill_id, member_id),
  -- A share is either unpaid (both NULL) or paid (both set). Never half-paid.
  CONSTRAINT shares_paid_state_consistent CHECK ((paid_at IS NULL) = (idempotency_key IS NULL))
);

CREATE INDEX idx_members_home ON members (home_id, position);
CREATE INDEX idx_bills_home ON bills (home_id, created_at);
CREATE INDEX idx_shares_bill ON shares (bill_id);
CREATE INDEX idx_shares_member ON shares (member_id);
