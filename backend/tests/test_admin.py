import os
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from unittest.mock import patch
from uuid import uuid4
from fastapi.testclient import TestClient
from app.main import app
from app.database import connection, initialize
from app.auth import create_account, new_session
from app.scheduling import IST


class AdminTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {'KISANSETU_DB_PATH': os.path.join(self.temp.name, 'admin.sqlite3')})
        self.env.start()
        self.client = TestClient(app).__enter__()
        self.headers = {}
        with connection() as db:
            for role in ('government', 'super_admin', 'operator', 'farmer'):
                user = create_account(db, 'test-' + role, 'test-password-12345', role, role, 'mandi-a' if role == 'operator' else None)
                self.headers[role] = {'Authorization': 'Bearer ' + new_session(db, user['id'])}
        self.day = (datetime.now(IST).date() + timedelta(days=1)).isoformat()
        self.today = datetime.now(IST).date().isoformat()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.env.stop()
        self.temp.cleanup()

    def request(self, method, path, role='government', **kwargs):
        return self.client.request(method, '/api/' + path, headers=self.headers[role], **kwargs)

    def crop(self, headers=None):
        r = self.client.post('/api/farmers/me/crops', headers=headers or self.headers['farmer'], json=dict(type='Wheat', quantity=2, unit='Tonnes', expectedDate=self.day, preferredCentreId='mandi-a', transportAvailable=True))
        self.assertEqual(r.status_code, 201, r.text)
        return r.json()['id']

    def book(self, crop, slot='s1', headers=None):
        return self.client.post('/api/bookings/me', headers=headers or self.headers['farmer'], json=dict(centreId='mandi-a', cropId=crop, day=self.day, slotId=slot))

    def test_roles_and_assigned_mandi(self):
        self.assertEqual(self.client.get('/api/admin/dashboard').status_code, 401)
        for role in self.headers:
            for page in ('dashboard', 'farmers', 'procurement', 'analytics', 'notifications', 'reports', 'reports/export', 'settings'):
                response = self.request('GET', 'admin/' + page, role)
                self.assertEqual(response.status_code, 200 if role in ('government', 'super_admin') else 403, (role, page, response.text))
        self.assertEqual(self.request('GET', 'admin/mandis', 'operator').json()[0]['id'], 'mandi-a')
        self.assertEqual(len(self.request('GET', 'admin/mandis', 'operator').json()), 1)
        for path in ('admin/queue?centreId=mandi-b', f'admin/slots?centreId=mandi-b&day={self.day}', 'admin/mandis/mandi-b', 'admin/mandis/mandi-b/alternatives'):
            self.assertEqual(self.request('GET', path, 'operator').status_code, 403)
        self.assertEqual(self.request('PATCH', 'admin/mandis/mandi-a', 'operator', json=dict(capacity=10, processingMin=5, activeCounters=2)).status_code, 403)
        self.assertEqual(self.request('GET', 'admin/mandis', 'farmer').status_code, 403)
        initialize()
        self.assertEqual(self.request('GET', 'auth/me').json()['role'], 'government')

    def test_shared_slot_capacity_disable_and_concurrency(self):
        slot = dict(centreId='mandi-a', day=self.day, slotId='afternoon', starts='14:00', ends='15:00', capacity=1, enabled=True)
        self.assertEqual(self.request('POST', 'admin/slots', 'operator', json=slot).status_code, 201)
        visible = self.request('GET', f'bookings/slots/mandi-a?day={self.day}', 'farmer').json()
        self.assertTrue(next(s for s in visible if s['id'] == 'afternoon')['available'])
        first = self.crop()
        second = self.client.post('/api/auth/register', json=dict(username='second', password='second-password-123', name='Second')).json()
        other_headers = {'Authorization': 'Bearer ' + second['token']}
        other_crop = self.crop(other_headers)
        with ThreadPoolExecutor(max_workers=2) as pool:
            a = pool.submit(self.book, first, 'afternoon')
            b = pool.submit(self.book, other_crop, 'afternoon', other_headers)
            self.assertEqual(sorted([a.result().status_code, b.result().status_code]), [200, 409])
        self.assertEqual(self.request('PATCH', 'admin/slots', json={**slot, 'capacity': 0}).status_code, 409)
        self.assertEqual(self.request('PATCH', 'admin/slots', json={**slot, 'starts': '15:00', 'ends': '16:00'}).status_code, 409)
        self.assertEqual(self.request('PATCH', 'admin/slots', json={**slot, 'enabled': False}).status_code, 200)
        self.assertFalse(next(s for s in self.request('GET', f'bookings/slots/mandi-a?day={self.day}', 'farmer').json() if s['id'] == 'afternoon')['available'])
        initialize()
        saved = next(s for s in self.request('GET', f'admin/slots?centreId=mandi-a&day={self.day}').json() if s['id'] == 'afternoon')
        self.assertEqual(saved['booked'], 1)
        self.assertFalse(saved['enabled'])

    def test_visit_lifecycle_real_metrics_and_farmer_compatibility(self):
        self.assertEqual(self.book(self.crop()).status_code, 200)
        row = self.request('GET', 'admin/queue', 'operator').json()[0]
        self.assertEqual(row['quantity_quintals'], 20)
        visit = row['id']
        def move(before, after, **extra):
            return self.request('PATCH', 'admin/queue/' + visit, 'operator', json=dict(expectedStatus=before, status=after, **extra))
        self.assertEqual(move('Booked', 'Completed').status_code, 422)
        self.assertEqual(move('Booked', 'Checked In').status_code, 200)
        self.assertEqual(move('Booked', 'Checked In').status_code, 409)
        self.assertEqual(move('Checked In', 'Waiting').status_code, 200)
        self.assertEqual(move('Waiting', 'Quality Check').status_code, 200)
        self.assertEqual(self.request('GET', 'queues/me', 'farmer').json()['stage'], 'grading')
        self.assertEqual(move('Quality Check', 'Procurement').status_code, 200)
        self.assertEqual(move('Procurement', 'Completed').status_code, 422)
        self.assertEqual(move('Procurement', 'Completed', actualQuantityQuintals=18.5).status_code, 200)
        self.assertEqual(self.request('GET', 'queues/me', 'farmer').json()['stage'], 'completed')
        data = self.request('GET', 'admin/dashboard').json()['metrics']
        self.assertEqual(data['processedToday'], 1)
        self.assertEqual(data['procurementQuintals'], 18.5)
        self.assertIsNotNone(data['averageWaitingMin'])
        data = self.request('GET', 'admin/analytics').json()
        self.assertEqual(data['totalQuintals'], 18.5)
        self.assertEqual(data['byCrop'], [dict(label='Wheat', quintals=18.5)])
        self.assertIsNotNone(data['averageProcessingMin'])
        export = self.request('GET', f'admin/reports/export?start={self.today}&end={self.day}').json()
        self.assertIn('18.5', export['csv'])
        farmer = self.request('GET', 'admin/farmers').json()[0]
        self.assertFalse({'phone', 'password_hash', 'username'} & farmer.keys())
        self.assertGreater(len(self.request('GET', 'notifications', 'farmer').json()), 0)

    def test_empty_metrics_and_threshold_alerts(self):
        metrics = self.request('GET', 'admin/dashboard').json()['metrics']
        self.assertEqual(metrics['procurementQuintals'], 0)
        self.assertIsNone(metrics['averageWaitingMin'])
        self.assertEqual(self.request('GET', 'admin/analytics').json()['byCrop'], [])
        self.assertEqual(self.request('PATCH', 'admin/settings', json=dict(busyPercent=90, overloadedPercent=70)).status_code, 422)
        self.assertEqual(self.request('PATCH', 'admin/settings', json=dict(busyPercent=50, overloadedPercent=80)).status_code, 200)
        self.assertEqual(self.request('PATCH', 'admin/mandis/mandi-a', json=dict(capacity=1, processingMin=5, activeCounters=1)).status_code, 200)
        self.assertEqual(self.request('POST', 'queues/mandi-a/join', 'farmer').status_code, 200)
        dashboard = self.request('GET', 'admin/dashboard').json()
        self.assertEqual(dashboard['alerts'][0]['centreId'], 'mandi-a')
        self.assertEqual(dashboard['metrics']['overloadedMandis'], 1)
        alternatives = self.request('GET', f'admin/mandis/mandi-a/alternatives?day={self.day}', 'operator').json()
        self.assertTrue(alternatives)
        self.assertTrue(all(a['availableCapacity'] > 0 and a['distanceKm'] >= 0 for a in alternatives))
        self.assertEqual(self.request('PATCH', 'admin/mandis/mandi-a', json=dict(capacity=1, processingMin=5, activeCounters=1, closed=True)).status_code, 200)
        self.assertEqual(self.request('GET', 'admin/mandis/mandi-a').json()['status'], 'Closed')
        self.assertFalse(any(s['available'] for s in self.request('GET', f'bookings/slots/mandi-a?day={self.day}', 'farmer').json()))

    def test_farmer_recovery_visible_in_government_dashboard(self):
        self.assertEqual(self.book(self.crop()).status_code, 200)
        report=self.request('POST','recovery','farmer',json=dict(requestId=str(uuid4()),reason='vehicle',arrival=self.day+'T11:00:00+05:30')).json()
        pending=self.request('GET','admin/notifications').json()['delayReports'][0]
        self.assertEqual(pending['id'],report['id'])
        self.assertEqual(pending['farmerName'],'farmer')
        self.assertEqual(pending['centreId'],'mandi-a')
        self.assertFalse(pending['resolved'])
        self.assertIsNone(pending['newSlot'])
        options=self.request('GET',f"recovery/{report['id']}/options",'farmer').json()
        option=next(o for o in options if o['id']!='keep')
        outcome=self.request('POST',f"recovery/{report['id']}/apply",'farmer',json={'optionId':option['id']})
        self.assertEqual(outcome.status_code,200)
        resolved=self.request('GET','admin/notifications').json()['delayReports'][0]
        self.assertTrue(resolved['rescheduled'])
        self.assertTrue(resolved['resolved'])
        self.assertEqual(resolved['newSlot'],outcome.json()['booking']['slot'])
        self.assertEqual(self.request('GET','bookings/me','farmer').json()['slot'],resolved['newSlot'])
        self.assertNotIn('mobile',resolved)
        self.assertNotIn('password_hash',resolved)
        self.assertEqual(self.request('GET','admin/notifications','operator').status_code,403)
