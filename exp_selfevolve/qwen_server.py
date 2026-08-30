"""Localhost OpenAI-compatible chat server backed by a local Qwen model.
Stdlib HTTP server + transformers. Bind 127.0.0.1 only (matches agent's LocalModelClient
security check). Supports response_schema via guided prompt (Qwen follows JSON schema well).
"""
import json, sys, os, argparse, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MODEL_DIR = os.path.expanduser(os.environ.get("QWEN_MODEL_DIR", "~/shopagent/models/Qwen3-8B"))

_tok = None; _model = None; _lock = threading.Lock()

def _load():
    global _tok, _model
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    print("loading model from", MODEL_DIR, flush=True)
    _tok = AutoTokenizer.from_pretrained(MODEL_DIR)
    _model = AutoModelForCausalLM.from_pretrained(MODEL_DIR, torch_dtype=torch.float16, device_map="cuda")
    print("model loaded", flush=True)

def _generate(messages, schema=None, max_new_tokens=2048, enable_thinking=False):
    import torch
    # If a JSON schema is requested, append an instruction (Qwen respects it well).
    if schema is not None:
        messages = list(messages) + [{"role":"system","content":
            "Return ONLY one JSON object matching this schema, no prose:\n"+json.dumps(schema)}]
    try:
        text = _tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=True,
                                        enable_thinking=enable_thinking)
    except TypeError:
        text = _tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = _tok([text], return_tensors="pt").to(_model.device)
    with _lock:
        with torch.no_grad():
            out = _model.generate(**inputs, max_new_tokens=max_new_tokens, do_sample=False,
                                  temperature=None, top_p=None, top_k=None,
                                  pad_token_id=_tok.eos_token_id)
    gen = out[0][inputs.input_ids.shape[1]:]
    resp = _tok.decode(gen, skip_special_tokens=True)
    if "</think>" in resp:
        resp = resp.split("</think>", 1)[1].strip()
    ptoks = int(inputs.input_ids.shape[1]); ctoks = int(gen.shape[0])
    return resp, ptoks, ctoks

class H(BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def do_POST(self):
        if self.path not in ("/v1/chat/completions","/v1","/"):
            self.send_response(404); self.end_headers(); return
        n=int(self.headers.get("Content-Length",0))
        body=json.loads(self.rfile.read(n) or b"{}")
        messages=body.get("messages",[])
        schema=None
        rf=body.get("response_format") or {}
        if isinstance(rf,dict) and rf.get("type")=="json_schema":
            schema=rf.get("json_schema",{}).get("schema")
        schema=schema or body.get("response_schema")
        mnt=int(body.get("max_tokens") or 512)
        try:
            resp,pt,ct=_generate(messages,schema,max_new_tokens=mnt,enable_thinking=bool(body.get("enable_thinking",False)))
        except Exception as e:
            self.send_response(500); self.send_header("Content-Type","application/json"); self.end_headers()
            self.wfile.write(json.dumps({"error":str(e)}).encode()); return
        payload={"choices":[{"message":{"role":"assistant","content":resp}}],
                 "usage":{"prompt_tokens":pt,"completion_tokens":ct}}
        data=json.dumps(payload).encode()
        self.send_response(200); self.send_header("Content-Type","application/json")
        self.send_header("Content-Length",str(len(data))); self.end_headers(); self.wfile.write(data)

if __name__=="__main__":
    ap=argparse.ArgumentParser(); ap.add_argument("--port",type=int,default=8100); a=ap.parse_args()
    _load()
    srv=ThreadingHTTPServer(("127.0.0.1",a.port),H)
    print("serving on 127.0.0.1:%d"%a.port, flush=True)
    srv.serve_forever()
