-- Category + image for the rewards catalog UI. image_key maps to a static asset
-- bundled in the consumer app (apps/consumer/assets/rewards/) rather than a remote
-- URL — these are generic promotional images that don't change per-user, same
-- pattern as the pickup-material reference photo in Request Pickup.
--
-- Deliberately NOT added here: a stock/quantity column ("143 left" in the design).
-- That's not just a UI column — redeem_reward() would need to check-and-decrement
-- remaining stock inside the same locked transaction it already uses for the points
-- balance check, to avoid two people redeeming the last unit at once. Left for when
-- there's a real limited-quantity partner offer to enforce.
alter table rewards
  add column category text,
  add column image_key text;

update rewards set category = 'airtime', image_key = 'mtn' where name = 'GH₵20 MTN Airtime';
update rewards set category = 'shopping', image_key = 'shoprite' where name = 'GH₵50 Shoprite Voucher';
update rewards set category = 'merch', image_key = 'tote-bag' where name = 'Takacycle Tote Bag';
update rewards set category = 'merch', image_key = 'tshirt' where name = 'Takacycle T-Shirt';
