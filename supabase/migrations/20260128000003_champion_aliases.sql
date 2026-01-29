-- Seed champions table with aliases for name normalization
-- Migration: 20260128000003_champion_aliases.sql
-- Created: 2026-01-29

-- Insert champions with alias data
-- This covers the most common picks from professional play

INSERT INTO champions (name, grid_name, riot_id, aliases, primary_roles)
VALUES
  -- Multi-word names
  ('TwistedFate', 'Twisted Fate', 'TwistedFate', ARRAY['TF'], ARRAY['mid']),
  ('MissFortune', 'Miss Fortune', 'MissFortune', ARRAY['MF'], ARRAY['adc']),
  ('DrMundo', 'Dr. Mundo', 'DrMundo', ARRAY['Dr Mundo', 'Mundo'], ARRAY['top', 'jungle']),
  ('LeeSin', 'Lee Sin', 'LeeSin', ARRAY['Lee'], ARRAY['jungle']),
  ('MasterYi', 'Master Yi', 'MasterYi', ARRAY['Yi'], ARRAY['jungle']),
  ('XinZhao', 'Xin Zhao', 'XinZhao', ARRAY['Xin'], ARRAY['jungle']),
  ('AurelionSol', 'Aurelion Sol', 'AurelionSol', ARRAY['Asol', 'ASol'], ARRAY['mid']),
  ('TahmKench', 'Tahm Kench', 'TahmKench', ARRAY['Tahm', 'TK'], ARRAY['support', 'top']),

  -- Apostrophe variations
  ('Wukong', 'Wukong', 'MonkeyKing', ARRAY['MonkeyKing', 'Kong'], ARRAY['top', 'jungle']),
  ('RekSai', 'Rek''Sai', 'RekSai', ARRAY['Reksai'], ARRAY['jungle']),
  ('KhaZix', 'Kha''Zix', 'Khazix', ARRAY['Khazix'], ARRAY['jungle']),
  ('VelKoz', 'Vel''Koz', 'VelKoz', ARRAY['Velkoz'], ARRAY['mid', 'support']),
  ('ChoGath', 'Cho''Gath', 'Chogath', ARRAY['Chogath'], ARRAY['top', 'jungle']),
  ('KogMaw', 'Kog''Maw', 'KogMaw', ARRAY['Kogmaw'], ARRAY['adc']),
  ('KaiSa', 'Kai''Sa', 'Kaisa', ARRAY['Kaisa'], ARRAY['adc']),
  ('BelVeth', 'Bel''Veth', 'Belveth', ARRAY['Belveth'], ARRAY['jungle']),
  ('KSante', 'K''Sante', 'KSante', ARRAY['Ksante'], ARRAY['top']),

  -- Roman numerals
  ('JarvanIV', 'Jarvan IV', 'JarvanIV', ARRAY['Jarvan 4', 'J4', 'Jarvan'], ARRAY['jungle']),

  -- Special cases
  ('Renata', 'Renata Glasc', 'Renata', ARRAY['RenataGlasc'], ARRAY['support']),
  ('Nunu', 'Nunu & Willump', 'Nunu', ARRAY['Nunu and Willump'], ARRAY['jungle']),
  ('Fiddlesticks', 'Fiddlesticks', 'Fiddlesticks', ARRAY['Fiddle'], ARRAY['jungle', 'support']),

  -- Pure ADCs
  ('Jinx', 'Jinx', 'Jinx', ARRAY[], ARRAY['adc']),
  ('Aphelios', 'Aphelios', 'Aphelios', ARRAY[], ARRAY['adc']),
  ('Caitlyn', 'Caitlyn', 'Caitlyn', ARRAY['Cait'], ARRAY['adc']),
  ('Ashe', 'Ashe', 'Ashe', ARRAY[], ARRAY['adc']),
  ('Vayne', 'Vayne', 'Vayne', ARRAY[], ARRAY['adc']),
  ('Xayah', 'Xayah', 'Xayah', ARRAY[], ARRAY['adc']),
  ('Ezreal', 'Ezreal', 'Ezreal', ARRAY['Ez'], ARRAY['adc', 'mid']),
  ('Lucian', 'Lucian', 'Lucian', ARRAY[], ARRAY['adc', 'mid']),
  ('Kalista', 'Kalista', 'Kalista', ARRAY[], ARRAY['adc']),
  ('Sivir', 'Sivir', 'Sivir', ARRAY[], ARRAY['adc']),
  ('Zeri', 'Zeri', 'Zeri', ARRAY[], ARRAY['adc']),
  ('Jhin', 'Jhin', 'Jhin', ARRAY[], ARRAY['adc']),

  -- Pure Supports
  ('Thresh', 'Thresh', 'Thresh', ARRAY[], ARRAY['support']),
  ('Nautilus', 'Nautilus', 'Nautilus', ARRAY['Naut'], ARRAY['support', 'top']),
  ('Leona', 'Leona', 'Leona', ARRAY[], ARRAY['support']),
  ('Alistar', 'Alistar', 'Alistar', ARRAY['Ali'], ARRAY['support']),
  ('Rakan', 'Rakan', 'Rakan', ARRAY[], ARRAY['support']),
  ('Bard', 'Bard', 'Bard', ARRAY[], ARRAY['support']),
  ('Braum', 'Braum', 'Braum', ARRAY[], ARRAY['support']),
  ('Lulu', 'Lulu', 'Lulu', ARRAY[], ARRAY['support']),
  ('Nami', 'Nami', 'Nami', ARRAY[], ARRAY['support']),
  ('Janna', 'Janna', 'Janna', ARRAY[], ARRAY['support']),
  ('Yuumi', 'Yuumi', 'Yuumi', ARRAY[], ARRAY['support']),
  ('Soraka', 'Soraka', 'Soraka', ARRAY['Raka'], ARRAY['support']),

  -- Pure Mid laners
  ('Azir', 'Azir', 'Azir', ARRAY[], ARRAY['mid']),
  ('Orianna', 'Orianna', 'Orianna', ARRAY['Ori'], ARRAY['mid']),
  ('Viktor', 'Viktor', 'Viktor', ARRAY[], ARRAY['mid']),
  ('Corki', 'Corki', 'Corki', ARRAY[], ARRAY['mid']),
  ('Ahri', 'Ahri', 'Ahri', ARRAY[], ARRAY['mid']),
  ('LeBlanc', 'LeBlanc', 'LeBlanc', ARRAY['LB'], ARRAY['mid']),
  ('Zoe', 'Zoe', 'Zoe', ARRAY[], ARRAY['mid']),
  ('Kassadin', 'Kassadin', 'Kassadin', ARRAY['Kass'], ARRAY['mid']),
  ('Akali', 'Akali', 'Akali', ARRAY[], ARRAY['mid', 'top']),
  ('Sylas', 'Sylas', 'Sylas', ARRAY[], ARRAY['mid', 'top']),

  -- Pure Junglers
  ('Elise', 'Elise', 'Elise', ARRAY[], ARRAY['jungle']),
  ('Nidalee', 'Nidalee', 'Nidalee', ARRAY['Nid'], ARRAY['jungle']),
  ('Graves', 'Graves', 'Graves', ARRAY[], ARRAY['jungle']),
  ('Kindred', 'Kindred', 'Kindred', ARRAY[], ARRAY['jungle']),
  ('Viego', 'Viego', 'Viego', ARRAY[], ARRAY['jungle']),
  ('Vi', 'Vi', 'Vi', ARRAY[], ARRAY['jungle']),
  ('Sejuani', 'Sejuani', 'Sejuani', ARRAY['Sej'], ARRAY['jungle', 'top']),

  -- Pure Top laners
  ('Gnar', 'Gnar', 'Gnar', ARRAY[], ARRAY['top']),
  ('Jayce', 'Jayce', 'Jayce', ARRAY[], ARRAY['top', 'mid']),
  ('Renekton', 'Renekton', 'Renekton', ARRAY['Renek'], ARRAY['top']),
  ('Camille', 'Camille', 'Camille', ARRAY[], ARRAY['top']),
  ('Jax', 'Jax', 'Jax', ARRAY[], ARRAY['top']),
  ('Fiora', 'Fiora', 'Fiora', ARRAY[], ARRAY['top']),
  ('Gangplank', 'Gangplank', 'Gangplank', ARRAY['GP'], ARRAY['top']),
  ('Aatrox', 'Aatrox', 'Aatrox', ARRAY[], ARRAY['top']),
  ('Ornn', 'Ornn', 'Ornn', ARRAY[], ARRAY['top']),

  -- Flex picks
  ('Swain', 'Swain', 'Swain', ARRAY[], ARRAY['support', 'mid', 'adc', 'top']),
  ('Seraphine', 'Seraphine', 'Seraphine', ARRAY['Sera'], ARRAY['support', 'mid', 'adc']),
  ('Syndra', 'Syndra', 'Syndra', ARRAY[], ARRAY['mid', 'support']),
  ('Xerath', 'Xerath', 'Xerath', ARRAY[], ARRAY['mid', 'support']),
  ('Zyra', 'Zyra', 'Zyra', ARRAY[], ARRAY['support', 'mid']),
  ('Brand', 'Brand', 'Brand', ARRAY[], ARRAY['support', 'mid']),
  ('Sett', 'Sett', 'Sett', ARRAY[], ARRAY['top', 'jungle', 'support']),
  ('Shen', 'Shen', 'Shen', ARRAY[], ARRAY['top', 'support']),
  ('Poppy', 'Poppy', 'Poppy', ARRAY[], ARRAY['top', 'jungle', 'support']),
  ('Gragas', 'Gragas', 'Gragas', ARRAY[], ARRAY['top', 'jungle', 'mid']),
  ('Rumble', 'Rumble', 'Rumble', ARRAY[], ARRAY['top', 'mid']),
  ('Kennen', 'Kennen', 'Kennen', ARRAY[], ARRAY['top', 'mid']),
  ('Trundle', 'Trundle', 'Trundle', ARRAY[], ARRAY['top', 'jungle']),
  ('Nocturne', 'Nocturne', 'Nocturne', ARRAY['Noct'], ARRAY['jungle']),
  ('Taliyah', 'Taliyah', 'Taliyah', ARRAY[], ARRAY['jungle', 'mid']),
  ('Qiyana', 'Qiyana', 'Qiyana', ARRAY[], ARRAY['mid', 'jungle']),
  ('Diana', 'Diana', 'Diana', ARRAY[], ARRAY['jungle', 'mid']),
  ('Tristana', 'Tristana', 'Tristana', ARRAY['Trist'], ARRAY['adc', 'mid']),
  ('Varus', 'Varus', 'Varus', ARRAY[], ARRAY['adc', 'mid']),
  ('Galio', 'Galio', 'Galio', ARRAY[], ARRAY['mid', 'top', 'support']),
  ('Pantheon', 'Pantheon', 'Pantheon', ARRAY[], ARRAY['mid', 'top', 'support']),
  ('Pyke', 'Pyke', 'Pyke', ARRAY[], ARRAY['support', 'mid'])

ON CONFLICT (name) DO UPDATE SET
  grid_name = EXCLUDED.grid_name,
  riot_id = EXCLUDED.riot_id,
  aliases = EXCLUDED.aliases,
  primary_roles = EXCLUDED.primary_roles;

-- Create index on aliases for faster lookups
CREATE INDEX IF NOT EXISTS idx_champions_aliases ON champions USING GIN (aliases);
