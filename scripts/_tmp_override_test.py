import json, urllib.request
def post(p, b):
    r = urllib.request.Request('http://127.0.0.1:8000' + p, data=json.dumps(b).encode(), headers={'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(r))
s = post('/api/reset', {'user_profile': {'preference_tags': ['material']}})['session_id']
r1 = post('/api/respond', {'session_id': s, 'message': "I'm looking for running shoes, must be breathable", 'turn': 1})
print('T1 hard:', r1['state']['hard_constraints'])
r2 = post('/api/respond', {'session_id': s, 'message': 'Actually, ignore my earlier preference. What I need is: waterproof.', 'turn': 2})
print('T2 hard:', r2['state']['hard_constraints'], '| soft:', r2['state']['soft_preferences'])
print('override fired (breathable gone):', 'breathable' not in str(r2['state']))
