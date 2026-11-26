"""Serve static Expo routes on an ephemeral loopback port for browser QA."""
import os
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread


class ExportHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        base = Path(super().translate_path(path))
        html = Path(str(base) + '.html')
        return str(html if html.is_file() else base)

    def log_message(self, *args):
        pass


@contextmanager
def exported_site():
    handler = partial(ExportHandler, directory=os.environ['QA_EXPORT'])
    with ThreadingHTTPServer(('127.0.0.1', 0), handler) as server:
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            yield f'http://127.0.0.1:{server.server_port}'
        finally:
            server.shutdown()
            thread.join()
