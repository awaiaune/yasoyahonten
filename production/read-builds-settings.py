"""Read-only Workers Builds inspection from a user-controlled terminal.

Official schema: https://github.com/cloudflare/api-schemas/blob/main/openapi.yaml
GET builds/workers/{script_tag}: Workers CI Read.
GET workers/scripts (tag lookup): Workers Scripts Read.
Never prints raw API responses, environment variables, tokens or request headers.
"""
import getpass
import json
import re
import sys
import urllib.error
import urllib.request

ACCOUNT = 'fcf37e462257810df77e8fbc0e7f4317'
WORKER = 'yasoya-honten-payments'
BRANCH = 'production/v53-port-20261031'
TARGET = {
    'root_directory': 'worker',
    'build_command': '',
    'deploy_command': 'npx wrangler@4.155.0 deploy --config ../production/release/bootstrap.jsonc',
}


class ApiError(Exception):
    def __init__(self, status, codes=(), endpoint=None):
        self.status = status
        self.endpoint = endpoint
        self.codes = [c for c in codes if isinstance(c, int) or isinstance(c, str) and re.fullmatch(r'[A-Z0-9_]{1,80}', c)]


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def reader(token):
    opener = urllib.request.build_opener(NoRedirect())

    def get(path):
        # Only these two metadata GET destinations are ever reachable.
        allowed = path == f'/accounts/{ACCOUNT}/workers/scripts' or re.fullmatch(
            rf'/accounts/{ACCOUNT}/builds/workers/[a-f0-9]{{32}}', path)
        if not allowed:
            raise ValueError('Metadata path rejected')
        req = urllib.request.Request('https://api.cloudflare.com/client/v4' + path,
                                     headers={'Authorization': 'Bearer ' + token}, method='GET')
        try:
            with opener.open(req, timeout=15) as response:
                status, raw = response.status, response.read(4 * 1024 * 1024 + 1)
        except urllib.error.HTTPError as error:
            status, raw = error.code, error.read(65536)
        except Exception:
            raise ApiError(None, endpoint=path) from None
        try:
            data = json.loads(raw) if len(raw) <= 4 * 1024 * 1024 else {}
        except Exception:
            data = {}
        if status != 200 or data.get('success') is not True:
            raise ApiError(status, [e.get('code') for e in data.get('errors', []) if isinstance(e, dict)], path)
        return data.get('result')
    return get


def inspect(get):
    scripts = get(f'/accounts/{ACCOUNT}/workers/scripts')
    matches = [s for s in scripts if s.get('id') == WORKER] if isinstance(scripts, list) else []
    if len(matches) != 1 or not re.fullmatch(r'[a-f0-9]{32}', matches[0].get('tag', '')):
        raise ValueError('Worker tag was not uniquely identified')
    tag = matches[0]['tag']  # Immutable script tag, not Worker name or Version ID.
    config = get(f'/accounts/{ACCOUNT}/builds/workers/{tag}')
    if not isinstance(config, dict) or config.get('script_tag') != tag:
        raise ValueError('Worker build configuration identity mismatch')
    settings = config.get('production_settings')
    if not isinstance(settings, dict):
        raise ValueError('production_settings missing; Preview settings were not substituted')
    # Unknown command strings are not logged: they might contain embedded credentials.
    return {
        'worker': WORKER, 'script_tag': tag, 'http_status': 200,
        'production_branch_matches': config.get('git_repository', {}).get('branch') == BRANCH,
        'production_settings': {key: {'matches_target': settings.get(key) == expected,
                                     'target': expected} for key, expected in TARGET.items()},
        'previews_enabled': config.get('previews_enabled') if isinstance(config.get('previews_enabled'), bool) else 'UNCONFIRMED',
        'disable_builds': 'NOT_EXPOSED_BY_THIS_API; keep ON in Dashboard',
    }


def main():
    if not sys.stdin.isatty():
        print('Use an interactive terminal; credential input must not be echoed.', file=sys.stderr)
        return 1
    try:
        token = getpass.getpass('Cloudflare API token (hidden): ')
        if not token:
            return 1
        result = inspect(reader(token))
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except ApiError as error:
        print(json.dumps({'http_status': error.status, 'cloudflare_error_codes': error.codes,
                          'endpoint': error.endpoint, 'authentication_scheme': 'Bearer',
                          'stopped': True}))
    except Exception:
        print(json.dumps({'stopped': True, 'reason': 'Metadata unavailable or invalid; no settings changed'}))
    return 1


if __name__ == '__main__':
    sys.exit(main())
