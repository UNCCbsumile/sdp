import '@testing-library/jest-dom';

// Mock the fetch function
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
}); 