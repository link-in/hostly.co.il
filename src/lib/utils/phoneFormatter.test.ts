// Phone Formatter Tests
// Quick validation that phone normalization works correctly

import { normalizePhoneNumber, isValidPhoneNumber } from './phoneFormatter'

// Test cases for normalizePhoneNumber
const testCases = [
  // Israeli format with leading 0
  { input: '0528676516', expected: '+972528676516', description: 'Israeli mobile (052)' },
  { input: '0501234567', expected: '+972501234567', description: 'Israeli mobile (050)' },
  { input: '0521234567', expected: '+972521234567', description: 'Israeli mobile (052)' },
  { input: '0531234567', expected: '+972531234567', description: 'Israeli mobile (053)' },
  { input: '0541234567', expected: '+972541234567', description: 'Israeli mobile (054)' },
  
  // Israeli format with dashes
  { input: '052-867-6516', expected: '+972528676516', description: 'Israeli with dashes' },
  { input: '050-123-4567', expected: '+972501234567', description: 'Israeli with dashes' },
  
  // Israeli format with spaces
  { input: '052 867 6516', expected: '+972528676516', description: 'Israeli with spaces' },
  
  // Already in international format
  { input: '+972528676516', expected: '+972528676516', description: 'Already international' },
  { input: '972528676516', expected: '+972528676516', description: 'International without +' },
  
  // Edge cases
  { input: '528676516', expected: '+972528676516', description: 'Missing leading 0' },
  
  // Landline
  { input: '021234567', expected: '+97221234567', description: 'Jerusalem landline' },
  { input: '031234567', expected: '+97231234567', description: 'Tel Aviv landline' },
]

console.log('🧪 Testing Phone Number Normalization\n')

let passed = 0
let failed = 0

testCases.forEach(({ input, expected, description }) => {
  const result = normalizePhoneNumber(input)
  const isCorrect = result === expected
  
  if (isCorrect) {
    console.log(`✅ ${description}`)
    console.log(`   Input: ${input} → Output: ${result}`)
    passed++
  } else {
    console.log(`❌ ${description}`)
    console.log(`   Input: ${input}`)
    console.log(`   Expected: ${expected}`)
    console.log(`   Got: ${result}`)
    failed++
  }
})

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)

// Test validation function
console.log('\n🧪 Testing Phone Number Validation\n')

const validationTests = [
  { input: '0528676516', expected: true, description: 'Valid Israeli mobile' },
  { input: '+972528676516', expected: true, description: 'Valid international' },
  { input: '123', expected: false, description: 'Too short' },
  { input: 'abc', expected: false, description: 'Not a number' },
  { input: '', expected: false, description: 'Empty string' },
]

let validPassed = 0
let validFailed = 0

validationTests.forEach(({ input, expected, description }) => {
  const result = isValidPhoneNumber(input)
  const isCorrect = result === expected
  
  if (isCorrect) {
    console.log(`✅ ${description}: ${input} → ${result}`)
    validPassed++
  } else {
    console.log(`❌ ${description}: ${input}`)
    console.log(`   Expected: ${expected}, Got: ${result}`)
    validFailed++
  }
})

console.log(`\n📊 Validation Results: ${validPassed} passed, ${validFailed} failed`)

if (failed === 0 && validFailed === 0) {
  console.log('\n🎉 All tests passed!')
} else {
  console.log('\n⚠️  Some tests failed')
  process.exit(1)
}
