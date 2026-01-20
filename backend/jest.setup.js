jest.setTimeout(30000);

const originalFetch = global.fetch;

afterAll(() => {
  global.fetch = originalFetch;
});
