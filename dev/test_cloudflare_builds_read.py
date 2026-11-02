import contextlib
import importlib.util
import io
import json
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('builds_read', ROOT / 'production/read-builds-settings.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
TAG = 'a' * 32
DUMMY = 'offline-not-a-real-api-credential'


def responses(path):
    if path.endswith('/workers/scripts'):
        return [{'id': module.WORKER, 'tag': TAG}, {'id': 'unrelated', 'tag': 'b' * 32}]
    return {'script_tag': TAG, 'git_repository': {'branch': module.BRANCH},
            'production_settings': {**module.TARGET, 'environment_variables': {'TOKEN': {'value': DUMMY}}},
            'previews_base_config': {'deploy_command': 'do not use Preview settings'}, 'previews_enabled': False}


class BuildsReadTests(unittest.TestCase):
    def test_read_only_paths_and_safe_projection(self):
        paths = []
        def get(path):
            paths.append(path)
            return responses(path)
        result = module.inspect(get)
        self.assertEqual(paths, [f'/accounts/{module.ACCOUNT}/workers/scripts', f'/accounts/{module.ACCOUNT}/builds/workers/{TAG}'])
        self.assertTrue(all(v['matches_target'] for v in result['production_settings'].values()))
        self.assertNotIn(DUMMY, json.dumps(result))
        self.assertIn('NOT_EXPOSED', result['disable_builds'])

    def test_preview_is_not_a_production_fallback(self):
        def get(path):
            result = responses(path)
            if isinstance(result, dict):
                result.pop('production_settings')
                result['previews_base_config'] = module.TARGET
            return result
        with self.assertRaises(ValueError):
            module.inspect(get)

    def test_identity_mismatch_stops(self):
        def get(path):
            result = responses(path)
            if isinstance(result, dict):
                result['script_tag'] = 'b' * 32
            return result
        with self.assertRaises(ValueError):
            module.inspect(get)

    def test_unknown_command_content_is_not_printed(self):
        def get(path):
            result = responses(path)
            if isinstance(result, dict):
                result['production_settings']['deploy_command'] = DUMMY
            return result
        result = module.inspect(get)
        self.assertFalse(result['production_settings']['deploy_command']['matches_target'])
        self.assertNotIn(DUMMY, json.dumps(result))

    def test_http_transport_is_get_and_bearer_only(self):
        class Response:
            status = 200
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def read(self, size): return b'{"success":true,"result":[]}'
        class Opener:
            def open(_, request, timeout):
                self.assertEqual(request.get_method(), 'GET')
                self.assertEqual(request.get_header('Authorization') == 'Bearer ' + DUMMY, True)
                self.assertEqual(request.full_url, 'https://api.cloudflare.com/client/v4/accounts/' + module.ACCOUNT + '/workers/scripts')
                return Response()
        with patch.object(module.urllib.request, 'build_opener', return_value=Opener()):
            self.assertEqual(module.reader(DUMMY)(f'/accounts/{module.ACCOUNT}/workers/scripts'), [])
            with self.assertRaises(ValueError):
                module.reader(DUMMY)(f'/accounts/{module.ACCOUNT}/builds/triggers/anything/builds')

    def test_main_does_not_echo_token(self):
        output = io.StringIO()
        with patch.object(module.sys.stdin, 'isatty', return_value=True), patch.object(module.getpass, 'getpass', return_value=DUMMY), patch.object(module, 'reader', return_value=responses), contextlib.redirect_stdout(output):
            self.assertEqual(module.main(), 0)
        self.assertNotIn(DUMMY, output.getvalue())

    def test_patch_is_limited_to_the_three_production_fields(self):
        payload = json.loads((ROOT / 'production/workers-builds-production.patch.json').read_text())
        self.assertEqual(payload, {'production_settings': module.TARGET})

    def test_redirects_are_not_followed(self):
        self.assertIsNone(module.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://other.invalid'))


if __name__ == '__main__':
    unittest.main()
