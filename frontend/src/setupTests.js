// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Provide a CommonJS-friendly axios mock so Jest doesn't attempt to parse ESM axios during tests.
jest.mock('axios', () => {
	const mockAxios = {
		create: jest.fn(() => mockAxios),
		get: jest.fn(),
		post: jest.fn(),
		put: jest.fn(),
		delete: jest.fn(),
		defaults: { headers: { common: {} } },
		interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
	};
	return mockAxios;
});
