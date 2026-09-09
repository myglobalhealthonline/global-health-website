INSERT INTO "Currency" ("id", "code", "symbol", "decimals", "createdAt", "updatedAt")
VALUES
  ('cur_seed_pkr', 'PKR', 'Rs', 2, NOW(), NOW()),
  ('cur_seed_cny', 'CNY', '¥', 2, NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;
