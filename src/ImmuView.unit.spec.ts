import { readonly, DirectMutationError, ValidationError } from './ImmuView'; // Adjust the import path

describe('readonly utility', () => {
    it('should initialize with a primitive value', () => {
        const state = readonly(5);
        expect(state.value).toBe(5);
    });

    it('should initialize with an object', () => {
        const state = readonly({ count: 5 });
        expect(state.value.count).toBe(5);
    });

    it('should throw an error when trying to modify a primitive', () => {
        const state = readonly(5);
        let temp = state as any;
        expect(() => {
            temp.value = 10;
        }).toThrow(DirectMutationError);
    });

    it('should throw an error when trying to modify an object property', () => {
        const state = readonly({ count: 5 });
        let temp = state as any;
        expect(() => {
            temp.count = 10;
        }).toThrow(DirectMutationError);
    });

    it('should allow internal modification of a primitive', () => {
        const state = readonly(5);
        state.internalSet(10);
        expect(state.value).toBe(10);
    });

    it('should allow internal modification of an object', () => {
        const state = readonly({ count: 5 });
        state.internalSet({ count: 10 });
        expect(state.value.count).toBe(10);
    });

    it('should not allow direct modification of nested object properties', () => {
        const state = readonly({ data: { count: 5 } });
        expect(() => {
            state.value.data.count = 10;
        }).toThrow(DirectMutationError);
    });

    it('should allow internal modification of nested object properties', () => {
        const state = readonly({ data: { count: 5 } });
        state.internalSet({ data: { count: 10 } });
        expect(state.value.data.count).toBe(10);
    });

    it('should handle arrays', () => {
        const state = readonly([1, 2, 3]);
        expect(state.value[0]).toBe(1);
    });

    it('should not allow direct modification of array elements', () => {
        const state = readonly([1, 2, 3]);
        let temp = state as any;
        expect(() => {
            temp.value[0] = 10;
        }).toThrow(DirectMutationError);
    });

    it('should allow internal modification of arrays', () => {
        const state = readonly([1, 2, 3]);
        state.internalSet([10, 20, 30]);
        expect(state.value[0]).toBe(10);
    });

    it('should validate using a custom validator', () => {
        const state = readonly(5, {
            validator: (value) => value < 10,
        });
        state.internalSet(9);
        expect(state.value).toBe(9);
    });

    it('should throw a validation error for invalid values', () => {
        const state = readonly(5, {
            validator: (value) => value < 10,
        });
        expect(() => {
            state.internalSet(11);
        }).toThrow(ValidationError);
    });

    it('should use a custom error handler', () => {
        const mockErrorHandler = jest.fn();
        const state = readonly(5, {
            validator: (value) => value < 10,
            errorHandler: mockErrorHandler,
        });
        state.internalSet(11);
        expect(mockErrorHandler).toHaveBeenCalledWith(
            expect.any(ValidationError)
        );
    });

    it('should allow internalSet to modify the state', () => {
        const state = readonly({ count: 5 });
        state.internalSet({ count: 10 });
        expect(state.value.count).toBe(10);
    });

    it('should not modify the state when validation fails', () => {
        const state = readonly(
            { count: 5 },
            {
                validator: (newValue) => newValue.count < 10,
            }
        );
        state.internalSet({ count: 15 });
        expect(state.value.count).toBe(5);
    });

    it('should call the errorHandler when validation fails', () => {
        const mockErrorHandler = jest.fn();
        const state = readonly(
            { count: 5 },
            {
                validator: (newValue) => newValue.count < 10,
                errorHandler: mockErrorHandler,
            }
        );
        state.internalSet({ count: 15 });
        expect(mockErrorHandler).toHaveBeenCalledWith(
            expect.any(ValidationError)
        );
    });

    it('should handle nested objects', () => {
        const state = readonly({ outer: { inner: 5 } });
        expect(state.value.outer.inner).toBe(5);
    });

    it('should throw an error when trying to modify a nested object', () => {
        const state = readonly({ outer: { inner: 5 } });
        expect(() => {
            (state.value.outer as any).inner = 10;
        }).toThrow(DirectMutationError);
    });

    it('should allow internalSet to modify a nested object', () => {
        const state = readonly({ outer: { inner: 5 } });
        state.internalSet({ outer: { inner: 10 } });
        expect(state.value.outer.inner).toBe(10);
    });

    it('should handle arrays', () => {
        const state = readonly({ numbers: [1, 2, 3] });
        expect(state.value.numbers[0]).toBe(1);
    });

    it('should throw an error when trying to modify an array', () => {
        const state = readonly({ numbers: [1, 2, 3] });
        expect(() => {
            (state.value.numbers as any).push(4);
        }).toThrow(DirectMutationError);
    });

    it('should handle primitives', () => {
        const state = readonly(5);
        expect(state.value).toBe(5);
    });

    it('should not allow modification of primitives', () => {
        const state = readonly(5);
        expect(() => {
            (state as any).value = 10;
        }).toThrow(DirectMutationError);
    });

    it('should allow internalSet to modify a primitive', () => {
        const state = readonly(5);
        state.internalSet(10);
        expect(state.value).toBe(10);
    });

    it('should not modify a primitive when validation fails', () => {
        const state = readonly(5, {
            validator: (newValue) => newValue < 10,
        });
        state.internalSet(15);
        expect(state.value).toBe(5);
    });
});
