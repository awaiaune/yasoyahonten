INSERT INTO production_environment(id,instance_id,database_id,location_id)
SELECT 1,'0f1d8c9f-ae1b-40ef-bb42-f0b790bcd5fa','442fa9fd-25d3-4c01-bcc3-04be7b420cf5','LQ693S4H2NBZ8'
WHERE NOT EXISTS (SELECT 1 FROM production_environment WHERE id=1 AND instance_id='0f1d8c9f-ae1b-40ef-bb42-f0b790bcd5fa' AND database_id='442fa9fd-25d3-4c01-bcc3-04be7b420cf5' AND location_id='LQ693S4H2NBZ8');
