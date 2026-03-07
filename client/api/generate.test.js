import handler from './generate';

function createMockRes() {
  return {
    statusCode: 200,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    },
  };
}

test('returns 405 for non-POST requests', async () => {
  const req = { method: 'GET', body: {} };
  const res = createMockRes();

  await handler(req, res);

  expect(res.statusCode).toBe(405);
  expect(res.jsonData).toEqual({ error: 'Method not allowed.' });
});

test('returns 400 when input is missing', async () => {
  const req = { method: 'POST', body: {} };
  const res = createMockRes();

  await handler(req, res);

  expect(res.statusCode).toBe(400);
  expect(res.jsonData).toEqual({ error: 'Input is required.' });
});