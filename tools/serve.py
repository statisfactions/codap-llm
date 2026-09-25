"""Static file server for testing CODAP documents and plugins locally.

Adds the CORS and Private Network Access headers that let codap3.concord.org
fetch from localhost. Usage: python3 serve.py [directory] [port]
"""
import functools
import http.server
import sys


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Allow-Headers", "*")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()


directory = sys.argv[1] if len(sys.argv) > 1 else "."
port = int(sys.argv[2]) if len(sys.argv) > 2 else 8765
server = http.server.ThreadingHTTPServer(
    ("127.0.0.1", port), functools.partial(Handler, directory=directory)
)
server.serve_forever()
