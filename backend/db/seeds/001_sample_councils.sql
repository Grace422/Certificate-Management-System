-- Sample seed data - a handful of councils across regions for local dev/testing.
-- Your full ~360-council dataset should be bulk-inserted via the
-- Super Admin "upload database" feature (CSV -> COPY/batch INSERT), not hardcoded here.

INSERT INTO councils (name, region, division, location, address, contact_phone) VALUES
  ('Buea Council', 'Southwest', 'Fako', ST_GeogFromText('POINT(9.2374 4.1560)'), 'Buea, Fako Division', '+237670000001'),
  ('Limbe Council', 'Southwest', 'Fako', ST_GeogFromText('POINT(9.2145 4.0227)'), 'Limbe, Fako Division', '+237670000002'),
  ('Ebolowa Council', 'South', 'Mvila', ST_GeogFromText('POINT(11.1546 2.9167)'), 'Ebolowa, Mvila Division', '+237670000003'),
  ('Yaounde I Council', 'Centre', 'Mfoundi', ST_GeogFromText('POINT(11.5174 3.8689)'), 'Yaounde, Mfoundi Division', '+237670000004'),
  ('Douala I Council', 'Littoral', 'Wouri', ST_GeogFromText('POINT(9.7043 4.0511)'), 'Douala, Wouri Division', '+237670000005'),
  ('Bamenda Council', 'Northwest', 'Mezam', ST_GeogFromText('POINT(10.1591 5.9631)'), 'Bamenda, Mezam Division', '+237670000006'),
  ('Bafoussam Council', 'West', 'Mifi', ST_GeogFromText('POINT(10.4167 5.4737)'), 'Bafoussam, Mifi Division', '+237670000007'),
  ('Garoua Council', 'North', 'Benoue', ST_GeogFromText('POINT(13.3936 9.3017)'), 'Garoua, Benoue Division', '+237670000008'),
  ('Maroua Council', 'Far North', 'Diamare', ST_GeogFromText('POINT(14.3153 10.5956)'), 'Maroua, Diamare Division', '+237670000009'),
  ('Bertoua Council', 'East', 'Lom-et-Djerem', ST_GeogFromText('POINT(13.6846 4.5771)'), 'Bertoua, Lom-et-Djerem Division', '+237670000010'),
  ('Ngaoundere Council', 'Adamawa', 'Vina', ST_GeogFromText('POINT(13.5837 7.3167)'), 'Ngaoundere, Vina Division', '+237670000011');
