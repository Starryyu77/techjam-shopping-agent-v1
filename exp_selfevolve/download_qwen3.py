import os, sys
os.environ.setdefault("MODELSCOPE_CACHE", os.path.expanduser("~/shopagent/models/.mscache"))
from modelscope import snapshot_download
target = os.path.expanduser("~/shopagent/models/Qwen3-8B")
print("downloading Qwen/Qwen3-8B -> " + target, flush=True)
path = snapshot_download("Qwen/Qwen3-8B", local_dir=target)
print("DOWNLOAD_DONE path=" + str(path), flush=True)
# sanity: list key files
import glob
for f in ["config.json","tokenizer.json","tokenizer_config.json"]:
    fp = os.path.join(target, f)
    print(f, "OK" if os.path.exists(fp) else "MISSING", flush=True)
safet = glob.glob(os.path.join(target, "*.safetensors"))
print("safetensors shards:", len(safet), flush=True)
print("ALL_DONE", flush=True)
