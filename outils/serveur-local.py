"""Petit serveur de test : http://localhost:5174/?demo  (Ctrl+C pour arrêter)."""
import functools
import http.server
import os

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
Gestion = functools.partial(http.server.SimpleHTTPRequestHandler, directory=RACINE)
Gestion.extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript", ".json": "application/json"}

if __name__ == "__main__":
    print("Serveur sur http://localhost:5174/?demo")
    http.server.ThreadingHTTPServer(("127.0.0.1", 5174), Gestion).serve_forever()
