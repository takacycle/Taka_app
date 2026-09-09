-- Starter reward catalog, matching the non-cash-only decision from the tech-stack
-- plan (vouchers/merch/discounts, never a cash payout). Point costs are sensible
-- placeholders derived from the point economy (20 points/kg at the 1.0x Clean PET
-- rate) — adjust freely, these aren't derived from any real partner agreement.
insert into rewards (name, description, points_cost, is_active) values
  ('GH₵20 MTN Airtime', 'Airtime top-up credited directly to your registered number.', 500, true),
  ('GH₵50 Shoprite Voucher', 'Redeemable in-store at any Shoprite Ghana location.', 1200, true),
  ('Takacycle Tote Bag', 'Reusable canvas tote — carry your next batch of recyclables in style.', 400, true),
  ('Takacycle T-Shirt', 'Branded cotton t-shirt, available in S–XL.', 800, true);
