import { describe, it, expect } from 'vitest';

describe('Cart Logic Tests', () => {
  it('should calculate the total price correctly', () => {
    const price = 100;
    const quantity = 2;
    const total = price * quantity;
    
    expect(total).toBe(200); // Output = 200
  });
});