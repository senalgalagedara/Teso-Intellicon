"""Reproducible HTTP integration demo. Only server-issued development identities.
Run from Agentic after starting Next.js and FastAPI. Never prints cookies or keys.
"""
import argparse
import asyncio
import json
import sys
from pathlib import Path
import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.assessment.worker import process_one
from app.assessment.provider import MockProvider

def run(base_url, mock=False):
    with httpx.Client(base_url=base_url, timeout=45) as client:
        def call(method, path, payload=None):
            response = client.request(method, '/api/assessments/' + path, json=payload,
                headers={'origin': base_url} if method != 'GET' else {})
            if response.status_code != 200:
                raise RuntimeError(f'{method} {path}: HTTP {response.status_code}')
            return response.json()
        status = call('GET', 'status')
        assert not status['authenticated'] and status['demo_available']
        assert client.get('/').status_code == 200
        call('POST', 'demo', {})
        assert call('GET', 'status')['authenticated']
        papers = call('GET', 'papers')['papers']
        assert any(p['id'] == 'physics-development-v1' for p in papers)
        sid = call('POST', 'sessions', {'paper_id': 'physics-development-v1', 'language': 'en'})['session_id']
        exam = call('GET', f'sessions/{sid}')
        assert 'correct_option_id' not in json.dumps(exam)
        draft = {'answers': [{'question_id': 'force-dev-v1', 'selected_option': 'a'}, {'question_id': 'speed-dev-v1', 'selected_option': 'a'}]}
        call('PUT', f'sessions/{sid}/draft', draft)
        assert call('GET', f'sessions/{sid}')['drafts']['force-dev-v1'] == 'a'
        saved = call('POST', f'sessions/{sid}/submit', draft)
        assert saved['score']['percentage'] == 40 and saved['score']['unanswered'] == 1
        duplicate = call('POST', f'sessions/{sid}/submit', {'answers': []})
        assert duplicate['score'] == saved['score'] and duplicate['job_id'] == saved['job_id']
        assert call('GET', f'sessions/{sid}/job')['state'] == 'queued'
        asyncio.run(process_one(provider=MockProvider() if mock else None, session_id=sid))
        result = call('GET', f'sessions/{sid}/results')
        assert result['analysis_status'] in ('completed', 'partial'), 'Transient retry is queued; run worker and reopen results.'
        assert all(q['analysis'] for q in result['questions'])
        assert all(q['success_rate']['percentage'] is None for q in result['questions'])
        plan = call('GET', f'sessions/{sid}/recommendation')
        assert plan['question_count'] == 10 and plan['target_concept_ids']
        next_id = call('POST', f'sessions/{sid}/next', {'question_count': 5})['session_id']
        assert call('POST', f'sessions/{sid}/next', {'question_count': 5})['session_id'] == next_id
        next_exam = call('GET', f'sessions/{next_id}')
        assert next_exam['plan']['source_session_id'] == sid
        assert len(next_exam['questions']) == 5
        # Developer-only lookup constructs a known-correct submission; keys never
        # appear in the student-facing exam payload.
        from app.assessment import db, service
        with db.engine.connect() as conn: approved = service.question_rows(conn, next_id)
        follow_score = call('POST', f'sessions/{next_id}/submit', {'answers': [{'question_id': q['id'], 'selected_option': q['correct_option_id']} for q in approved]})
        assert follow_score['score']['percentage'] == 100
        asyncio.run(process_one(provider=MockProvider() if mock else None, session_id=next_id))
        history = call('GET', 'history')
        assert history['completed_count'] == 2
        assert all(c['latest_percentage'] == 100 for c in history['concepts'])
        assert history['attempts'][0]['activity_type'] == 'adaptive_practice'
        assert not history['attempts'][0]['repeated_question_ids']
        assert any(c['change_from_previous'] == 100 for c in history['concepts'])
        cookies = client.cookies
    # A new HTTP client with the same authorised cookie reproduces a page refresh.
    with httpx.Client(base_url=base_url, cookies=cookies, timeout=45) as reopened:
        response = reopened.get(f'/api/assessments/sessions/{sid}/results')
        assert response.status_code == 200 and response.json()['score'] == saved['score']
        assert reopened.get(f'/exams/self-assessment?session={sid}').status_code == 200
        assert reopened.get('/api/assessments/history').json()['completed_count'] == 2
    with httpx.Client(base_url=base_url, timeout=45) as anonymous:
        assert anonymous.get(f'/api/assessments/sessions/{sid}/results').status_code == 401
        assert anonymous.post('/api/assessments/demo', json={}, headers={'origin': 'https://unrelated.example'}).status_code == 403
    print(json.dumps({'session_id': sid, 'score': saved['score'], 'analysis_status': result['analysis_status'],
        'feedback_statuses': [q['analysis']['status'] for q in result['questions']], 'refresh_verified': True, 'follow_up_score': follow_score['score'], 'history_count': history['completed_count'], 'fresh_follow_up_questions': len(next_exam['questions']),
        'unauthorised_access_rejected': True, 'live_provider': not mock}, indent=2))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-url', default='http://127.0.0.1:3000')
    parser.add_argument('--mock', action='store_true', help='Use a labelled local mock for this demo job')
    args = parser.parse_args()
    run(args.base_url.rstrip('/'), args.mock)
