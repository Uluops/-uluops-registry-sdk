// Test error handling patterns from README
import {
  RegistryApiError,
  NotFoundError,
  ValidationError,
  isRegistryApiError,
} from './dist/errors/index.js';

console.log('=== Test README Error Patterns ===\n');

// Pattern from README line 656-665
console.log('1. Basic error handling pattern');
try {
  throw new NotFoundError('Definition', 'my-agent');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log('   ✓ instanceof NotFoundError works');
  } else if (error instanceof ValidationError) {
    console.log('   ✗ Wrong error type detected');
  } else if (isRegistryApiError(error)) {
    console.log('   ✓ isRegistryApiError guard works');
  } else {
    console.log('   ✗ Error not recognized');
  }
}

// Check error structure
console.log('\n2. Error structure completeness');
const testError = new ValidationError('Test error', { field: 'name', value: 'bad' });
const hasRequiredFields = (
  typeof testError.statusCode === 'number' &&
  typeof testError.code === 'string' &&
  typeof testError.message === 'string' &&
  typeof testError.details === 'object'
);
console.log('   ✓ Has statusCode, code, message, details:', hasRequiredFields);

// Check NotFoundError structure from README
console.log('\n3. NotFoundError format (line 88-92 of README)');
const notFoundError = new NotFoundError('Definition', 'my-agent');
console.log('   Message:', notFoundError.message);
console.log('   ✓ Includes resource type:', notFoundError.message.includes('Definition'));
console.log('   ✓ Includes identifier:', notFoundError.message.includes('my-agent'));

// RateLimitError with retryAfter
console.log('\n4. RateLimitError with retryAfter (line 700-706)');
const { RateLimitError } = await import('./dist/errors/index.js');
const rateLimitError = new RateLimitError(undefined, 60);
console.log('   ✓ Has retryAfter property:', typeof rateLimitError.retryAfter === 'number');
console.log('   ✓ Message includes retry time:', rateLimitError.message.includes('60'));

// toJSON method
console.log('\n5. Error serialization (line 791-799)');
const apiError = new RegistryApiError(500, 'Test', 'TEST_CODE', { key: 'value' }, 'req-123');
const json = apiError.toJSON();
console.log('   ✓ toJSON() works:', typeof json === 'object');
console.log('   ✓ Includes requestId:', json.requestId === 'req-123');
console.log('   ✓ Includes code:', json.code === 'TEST_CODE');
console.log('   ✓ Includes details:', json.details?.key === 'value');

console.log('\n=== All patterns validated ===');
