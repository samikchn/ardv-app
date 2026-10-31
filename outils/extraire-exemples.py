"""Extrait les réponses aux avis validées par Rafiza depuis l'export claude.ai (conversations.json)
et écrit un script SQL qui remplit la table `exemples` (exemples de ton pour l'IA).

Usage : python -I outils/extraire-exemples.py <conversations.json> <sortie.sql> [e-mails autorisés…]
Le fichier produit contient de vrais avis : il ne doit JAMAIS aller dans le dépôt public.
"""
import json
import re
import sys

SIGNATURE = re.compile(r"(L['’]équipe du Café Au Rendez-Vous|^Rafiza\s*$)", re.M)
SUJET = re.compile(r"avis|review|anis", re.I)
MAX = 100


def morceau_reponse(texte):
    """Garde le bloc réponse : sans les phrases d'intro (« Voici… : ») ni ce qui suit la signature."""
    texte = re.sub(r"```[\s\S]*?```", "", texte or "").strip()
    m = SIGNATURE.search(texte)
    if not m:
        return None
    paragraphes = re.split(r"\n\s*\n", texte[: m.end()])
    while paragraphes and paragraphes[0].strip().endswith(":"):
        paragraphes.pop(0)
    fin = texte[m.end():].split("\n")
    corps = "\n\n".join(p.strip() for p in paragraphes if p.strip())
    # la ligne du site juste après la signature
    suite = [l for l in fin[1:3] if "aurendezvous-saintdenis" in l]
    if suite:
        corps += "\n" + suite[0].strip()
    corps = corps.replace("**", "").strip()
    return corps if len(corps) > 40 else None


def reponses(conversations):
    for c in conversations:
        if not SUJET.search(c.get("name") or ""):
            continue
        for m in c.get("chat_messages", []):
            if m.get("sender") != "assistant":
                continue
            for bloc in m.get("content") or []:
                if bloc.get("type") == "tool_use":
                    entree = bloc.get("input") or {}
                    variantes = entree.get("variants") if isinstance(entree, dict) else None
                    for v in variantes if isinstance(variantes, list) else []:
                        r = morceau_reponse(v.get("body", "") if isinstance(v, dict) else str(v))
                        if r:
                            yield r
            r = morceau_reponse(m.get("text", ""))
            if r:
                yield r


def main(entree, sortie, emails=()):
    with open(entree, encoding="utf-8") as f:
        conversations = json.load(f)
    vus, garde = set(), []
    for r in reponses(conversations):
        cle = r[:80]
        if cle in vus:
            continue
        vus.add(cle)
        garde.append(r)
    garde = garde[-MAX:]  # les plus récentes reflètent le mieux son style actuel
    with open(sortie, "w", encoding="utf-8") as f:
        f.write("-- Exemples de ton (réponses aux avis validées par Rafiza). Fichier privé : ne pas publier.\n")
        f.write("delete from ardv_exemples;\n")
        for email in emails:
            f.write("insert into ardv_autorises(email) values ('" + email.strip().lower().replace("'", "''") + "') on conflict do nothing;\n")
        for r in garde:
            f.write("insert into ardv_exemples(texte) values ('" + r.replace("'", "''") + "');\n")
    print(f"{len(garde)} exemples écrits dans {sortie}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3:])
