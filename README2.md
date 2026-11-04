## Decisions

1. **Payment is one atomic UPDATE.** D1 has no interactive transactions, so
   "read the share, check it, then write" could let two requests both succeed.
   Instead I run `UPDATE shares SET paid_at = ... WHERE id = ? AND paid_at IS NULL`.
   The database lets only one request change the row. If nothing changed, I read
   the row: same Idempotency-Key gives 200 with the same result, a different key
   gives 409. Trade-off: the idempotency key is stored on the share, so it only
   protects that one share, which is all this task needs.

2. **Money is whole cents and the split is a pure function.** `splitCents(total, n)`
   gives everyone floor(total / n) and the leftover cents to the first members, so
   the shares always add up to the total. The bill and its shares are saved with
   `db.batch()`, which is one transaction. Trade-off: members are read just before
   the batch, so a member added in that tiny gap is not part of that bill. The
   shares still add up correctly.

3. **Member order comes from a `position` column.** Timestamps can be equal when
   two members are added in the same millisecond. `position` is picked inside the
   INSERT (`MAX(position) + 1`) and protected by `UNIQUE (home_id, position)`.

## Database constraints

- `bills_total_positive_integer`: stops zero, negative or non-integer totals.
- `shares_amount_non_negative`: stops negative shares.
- `shares_unique_member_per_bill`: one share per member per bill.
- `shares_paid_state_consistent`: a share is fully paid or fully unpaid.
- `members_unique_position_per_home`: no two members with the same order number.
- Foreign keys (`*_fk`): no rows pointing at a home, bill or member that doesn't exist.

## Extra endpoints

`GET /api/homes/:homeId` and `GET /api/homes/:homeId/bills` are not in the task.
The web page uses them to show members and bills.