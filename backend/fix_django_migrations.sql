-- backend/fix_django_migrations.sql
-- Insère dans django_migrations les migrations déjà matérialisées par les tables existantes.
-- À exécuter uniquement si le schéma est déjà présent mais que django_migrations est vide ou incomplet.
--
-- NOTE: On utilise INSERT ... WHERE NOT EXISTS plutôt que ON CONFLICT car la table
-- django_migrations ne possède aucune contrainte UNIQUE sur (app, name), ce qui rendrait
-- ON CONFLICT inopérant (il lèverait une erreur).

BEGIN;

INSERT INTO django_migrations (app, name, applied)
SELECT 'contenttypes', '0001_initial', NOW()
WHERE NOT EXISTS (SELECT 1 FROM django_migrations WHERE app = 'contenttypes' AND name = '0001_initial');

INSERT INTO django_migrations (app, name, applied)
SELECT 'contenttypes', '0002_remove_content_type_name', NOW()
WHERE NOT EXISTS (SELECT 1 FROM django_migrations WHERE app = 'contenttypes' AND name = '0002_remove_content_type_name');

INSERT INTO django_migrations (app, name, applied)
SELECT 'auth', '0001_initial', NOW()
WHERE NOT EXISTS (SELECT 1 FROM django_migrations WHERE app = 'auth' AND name = '0001_initial');

INSERT INTO django_migrations (app, name, applied)
SELECT 'auth', '0002_alter_permission_name_max_length', NOW()
WHERE NOT EXISTS (SELECT 1 FROM django_migrations WHERE app = 'auth' AND name = '0002_alter_permission_name_max_length');

INSERT INTO django_migrations (app, name, applied)
SELECT 'auth', '0003_alter_user_email_max_length', NOW()
WHERE NOT EXISTS (SELECT 1 FROM django_migrations WHERE app = 'auth' AND name = '0003_alter_user_email_max_length');

INSERT INTO django_migrations (app, name, applied)
SELECT 'auth', '0004_alter_user_username_opts', NOW()
WHERE NOT EXISTS (SELECT 1 FROM django_migrations WHERE app = 'auth' AND name = '0004_alter_user_username_opts');

INSERT INTO django_migrations (app, name, applied)
SELECT 'auth', '0005_alter_user_last_login_null', NOW()
WHERE NOT EXISTS (SELECT 1 FROM django_migrations WHERE app = 'auth' AND name = '0005_alter_user_last_login_null');

INSERT INTO django_migrations (app, name, applied)
SELECT 'auth', '0006_require_contenttypes_0002', NOW()
WHERE NOT EXISTS (SELECT 1 FROM django_migrations WHERE app = 'auth' AND name = '0006_require_contenttypes_0002');

INSERT INTO django_migrations (app, name, applied)
SELECT 'auth', '0007_alter_validators_add_error_messages', NOW()
WHERE NOT EXISTS (SELECT 1 FROM django_migrations WHERE app = 'auth' AND name = '0007_alter_validators_add_error_messages');

INSERT INTO django_migrations (app, name, applied)
SELECT 'auth', '0008_alter_user_username_max_length', NOW()
WHERE NOT EXISTS (SELECT 1 FROM django_migrations WHERE app = 'auth' AND name = '0008_alter_user_username_max_length');

INSERT INTO django_migrations (app, name, applied)
SELECT 'auth', '0009_alter_user_last_name_max_length', NOW()
WHERE NOT EXISTS (SELECT 1 FROM django_migrations WHERE app = 'auth' AND name = '0009_alter_user_last_name_max_length');

INSERT INTO django_migrations (app, name, applied)
SELECT 'auth', '0010_alter_group_name_max_length', NOW()
WHERE NOT EXISTS (SELECT 1 FROM django_migrations WHERE app = 'auth' AND name = '0010_alter_group_name_max_length');

INSERT INTO django_migrations (app, name, applied)
SELECT 'auth', '0011_update_proxy_permissions', NOW()
WHERE NOT EXISTS (SELECT 1 FROM django_migrations WHERE app = 'auth' AND name = '0011_update_proxy_permissions');

INSERT INTO django_migrations (app, name, applied)
SELECT 'auth', '0012_alter_user_first_name_max_length', NOW()
WHERE NOT EXISTS (SELECT 1 FROM django_migrations WHERE app = 'auth' AND name = '0012_alter_user_first_name_max_length');

INSERT INTO django_migrations (app, name, applied)
SELECT 'admin', '0001_initial', NOW()
WHERE NOT EXISTS (SELECT 1 FROM django_migrations WHERE app = 'admin' AND name = '0001_initial');

INSERT INTO django_migrations (app, name, applied)
SELECT 'admin', '0002_logentry_remove_auto_add', NOW()
WHERE NOT EXISTS (SELECT 1 FROM django_migrations WHERE app = 'admin' AND name = '0002_logentry_remove_auto_add');

INSERT INTO django_migrations (app, name, applied)
SELECT 'admin', '0003_logentry_add_action_flag_choices', NOW()
WHERE NOT EXISTS (SELECT 1 FROM django_migrations WHERE app = 'admin' AND name = '0003_logentry_add_action_flag_choices');

INSERT INTO django_migrations (app, name, applied)
SELECT 'sessions', '0001_initial', NOW()
WHERE NOT EXISTS (SELECT 1 FROM django_migrations WHERE app = 'sessions' AND name = '0001_initial');

INSERT INTO django_migrations (app, name, applied)
SELECT 'users', '0001_initial', NOW()
WHERE NOT EXISTS (SELECT 1 FROM django_migrations WHERE app = 'users' AND name = '0001_initial');

INSERT INTO django_migrations (app, name, applied)
SELECT 'users', '0002_systemadmin_userplainpassword', NOW()
WHERE NOT EXISTS (SELECT 1 FROM django_migrations WHERE app = 'users' AND name = '0002_systemadmin_userplainpassword');

COMMIT;
