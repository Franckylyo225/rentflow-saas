
-- Supprimer les doublons français qui ont un équivalent ISO
DELETE FROM rent_payments WHERE id IN (
  '1ad5e74e-3672-478b-aec1-ecc35fba9d09',
  'c3d12555-3b62-4c42-9112-c24dea589e88'
);

-- Convertir les enregistrements français restants en format ISO
UPDATE rent_payments SET month = '2026-05' WHERE id = 'ac89efe9-8194-4547-9ac7-52799c2fd136';
UPDATE rent_payments SET month = '2026-06' WHERE id = '0a68f6ed-9fa1-4058-be04-d40108bbdea9';
UPDATE rent_payments SET month = '2026-04' WHERE id = '3ad963a8-b0d0-401d-b850-0051ad61274b';
