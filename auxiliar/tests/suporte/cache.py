"""Cache falso de modelos no formato do Hugging Face."""


def criar_snapshot(cache, repo, hash_="abc123", arquivos=("config.json", "weights.safetensors")):
    base = cache / ("models--" + repo.replace("/", "--"))
    snapshot = base / "snapshots" / hash_
    snapshot.mkdir(parents=True)
    for nome in arquivos:
        (snapshot / nome).write_text("{}")
    (base / "refs").mkdir()
    (base / "refs" / "main").write_text(hash_ + "\n")
    return snapshot
