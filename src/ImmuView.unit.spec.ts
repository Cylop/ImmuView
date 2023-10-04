import { readonly, DirectMutationError, ValidationError } from './ImmuView'; // Adjust the import path

describe('readonly utility', () => {
    it('should initialize with an object', () => {
        const state = readonly({ count: 5 });
        expect(state.value.count).toBe(5);
    });

    it('should throw an error when trying to modify an object property', () => {
        const state = readonly({ count: 5 });
        expect(() => {
            (state.value as any).count = 10;
        }).toThrow(DirectMutationError);
    });

    it('should allow internal modification of an object', () => {
        const state = readonly({ count: 5 });
        state.internalSet({ count: 10 });
        expect(state.value.count).toBe(10);
    });

    it('should not allow direct modification of nested object properties', () => {
        const state = readonly({ count: 5, nested: { value: 10 } });
        expect(() => {
            delete (state.value.nested as any).value;
            // state.value.count = 10;
            //(state.value.nested as any).value = 20;
        }).toThrow(DirectMutationError);
    });

    it('should allow internal modification of nested object properties', () => {
        const state = readonly({ count: 5, nested: { value: 10 } });
        state.internalSet({ count: 5, nested: { value: 20 } });
        expect(state.value.nested.value).toBe(20);
    });

    it('should handle deep proxying', () => {
        const state = readonly({
            level1: {
                level2: {
                    level3: {
                        value: 10,
                    },
                },
            },
        });
        expect(state.value.level1.level2.level3.value).toBe(10);
    });

    it('should throw error on deep property modification', () => {
        const state = readonly({
            level1: {
                level2: {
                    level3: {
                        value: 10,
                    },
                },
            },
        });
        expect(() => {
            (state.value.level1.level2.level3 as any).value = 20;
        }).toThrow(DirectMutationError);
    });

    it('should allow internal modification on deep properties', () => {
        const state = readonly({
            level1: {
                level2: {
                    level3: {
                        value: 10,
                    },
                },
            },
        });
        state.internalSet({
            level1: {
                level2: {
                    level3: {
                        value: 20,
                    },
                },
            },
        });
        expect(state.value.level1.level2.level3.value).toBe(20);
    });

    it('should validate using custom validator', () => {
        const validator = (value: any) => value.count <= 10;
        const state = readonly({ count: 5 }, { validator });
        expect(() => {
            state.internalSet({ count: 15 });
        }).toThrow(ValidationError);
    });

    it('should not throw error when validation passes', () => {
        const validator = (value: any) => value.count <= 10;
        const state = readonly({ count: 5 }, { validator });
        state.internalSet({ count: 10 });
        expect(state.value.count).toBe(10);
    });

    it('should handle custom error messages', () => {
        const validator = (value: any) => value.count <= 10;
        const validationErrorMessage = 'Count exceeds limit';
        const state = readonly(
            { count: 5 },
            { validator, validationErrorMessage }
        );
        expect(() => {
            state.internalSet({ count: 15 });
        }).toThrowError(new ValidationError('Count exceeds limit'));
    });

    it('should handle custom error handler', () => {
        const errorHandler = jest.fn();
        const validator = (value: any) => value.count <= 10;
        const state = readonly({ count: 5 }, { validator, errorHandler });
        state.internalSet({ count: 15 });
        expect(errorHandler).toBeCalledWith(
            new ValidationError('Validation failed.')
        );
    });
});

describe('readonly utility - edge cases', () => {
    it('should handle arrays correctly', () => {
        const state = readonly([1, 2, 3]);
        expect(state.value[0]).toBe(1);
        expect(() => {
            (state.value as any)[0] = 4;
        }).toThrow(DirectMutationError);
        expect(() => {
            (state.value as any).push(4);
        }).toThrow(DirectMutationError);
    });

    it('should handle functions correctly', () => {
        const fn = () => 'Hello';
        const state = readonly({ fn });
        expect(state.value.fn()).toBe('Hello');
        expect(() => {
            (state.value as any).fn = () => 'Changed';
        }).toThrow(DirectMutationError);
    });

    it('should handle nested arrays correctly', () => {
        const state = readonly({ data: [1, { value: 2 }, 3] });
        expect((state.value.data[1] as { value: number }).value).toBe(2);
        expect(() => {
            (state.value.data[1] as any).value = 3;
        }).toThrow(DirectMutationError);
    });

    it('should handle prototype chain correctly', () => {
        const obj = Object.create({ inherited: 'value' });
        const state = readonly(obj);
        expect(state.value.inherited).toBe('value');
        expect(() => {
            (state.value as any).inherited = 'changed';
        }).toThrow(DirectMutationError);
    });

    it('should handle null and undefined correctly', () => {
        const state = readonly({ value: null, undef: undefined });
        expect(state.value.value).toBeNull();
        expect(state.value.undef).toBeUndefined();
    });

    it('should handle symbols correctly', () => {
        const sym = Symbol('key');
        const state = readonly({ [sym]: 'value' });
        expect(state.value[sym]).toBe('value');
        expect(() => {
            (state.value as any)[sym] = 'changed';
        }).toThrow(DirectMutationError);
    });
});

describe('readonly utility extended tests', () => {
    it('should handle arrays', () => {
        const state = readonly([1, 2, 3]);
        expect(state.value[0]).toBe(1);
        expect(() => {
            (state.value as any)[0] = 4;
        }).toThrow(DirectMutationError);
        expect(() => {
            (state.value as any).push(4);
        }).toThrow(DirectMutationError);
    });

    it('should handle nested arrays', () => {
        const state = readonly({ numbers: [1, 2, 3] });
        expect(state.value.numbers[1]).toBe(2);
        expect(() => {
            (state.value.numbers as any).push(4);
        }).toThrow(DirectMutationError);
    });

    it('should handle array of objects', () => {
        const state = readonly([{ count: 1 }, { count: 2 }]);
        expect(state.value[0].count).toBe(1);
        expect(() => {
            (state.value[0] as any).count = 3;
        }).toThrow(DirectMutationError);
    });

    it('should not allow adding new properties', () => {
        const state = readonly({ count: 5 });
        expect(() => {
            (state.value as any).newProp = 10;
        }).toThrow(DirectMutationError);
    });

    it('should not allow deleting properties', () => {
        const state = readonly({ count: 5 });
        expect(() => {
            delete (state.value as any).count;
        }).toThrow(DirectMutationError);
    });

    it('should handle objects with null values', () => {
        const state = readonly({ prop: null });
        expect(state.value.prop).toBeNull();
    });

    it('should handle objects with undefined values', () => {
        const state = readonly({ prop: undefined });
        expect(state.value.prop).toBeUndefined();
    });

    it('should handle objects with function values', () => {
        const fn = () => 42;
        const state = readonly({ func: fn });
        expect(state.value.func()).toBe(42);
    });

    it('should not allow modifying functions', () => {
        const fn = () => 42;
        const state = readonly({ func: fn });
        expect(() => {
            (state.value as any).func = () => 24;
        }).toThrow(DirectMutationError);
    });

    it('should handle Date objects', () => {
        const date = new Date();
        const state = readonly({ date });
        expect(state.value.date).toBeInstanceOf(Date);
    });

    it('should not allow modifying Date objects', () => {
        const date = new Date();
        const state = readonly({ date });
        expect(() => {
            (state.value.date as any).setFullYear(2000);
        }).toThrow(DirectMutationError);
    });

    // ... continue with other data types and scenarios

    it('should handle deeply nested structures', () => {
        const state = readonly({
            level1: {
                level2: {
                    level3: {
                        level4: {
                            value: 10,
                        },
                    },
                },
            },
        });
        expect(state.value.level1.level2.level3.level4.value).toBe(10);
    });

    it('should not allow modifications in deeply nested structures', () => {
        const state = readonly({
            level1: {
                level2: {
                    level3: {
                        level4: {
                            value: 10,
                        },
                    },
                },
            },
        });
        expect(() => {
            (state.value.level1.level2.level3.level4 as any).value = 20;
        }).toThrow(DirectMutationError);
    });

    it('should handle arrays in deeply nested structures', () => {
        const state = readonly({
            level1: {
                level2: {
                    level3: {
                        values: [1, 2, 3],
                    },
                },
            },
        });
        expect(state.value.level1.level2.level3.values[1]).toBe(2);
    });

    it('should not allow modifications in arrays of deeply nested structures', () => {
        const state = readonly({
            level1: {
                level2: {
                    level3: {
                        values: [1, 2, 3],
                    },
                },
            },
        });
        expect(() => {
            (state.value.level1.level2.level3.values as any).push(4);
        }).toThrow(DirectMutationError);
    });

    // ... continue with other edge cases

    it('should handle internal modifications of arrays', () => {
        const state = readonly([1, 2, 3]);
        state.internalSet([4, 5, 6]);
        expect(state.value[0]).toBe(4);
    });

    it('should handle internal modifications of nested arrays', () => {
        const state = readonly({ numbers: [1, 2, 3] });
        state.internalSet({ numbers: [4, 5, 6] });
        expect(state.value.numbers[0]).toBe(4);
    });

    it('should handle internal modifications of array of objects', () => {
        const state = readonly([{ count: 1 }, { count: 2 }]);
        state.internalSet([{ count: 3 }, { count: 4 }]);
        expect(state.value[0].count).toBe(3);
    });

    // ... continue with other scenarios for internal modifications

    it('should handle symbols', () => {
        const symbolKey = Symbol('key');
        const state = readonly({ [symbolKey]: 42 });
        expect(state.value[symbolKey]).toBe(42);
    });

    it('should not allow modifications using symbols', () => {
        const symbolKey = Symbol('key');
        const state = readonly({ [symbolKey]: 42 });
        expect(() => {
            (state.value as any)[symbolKey] = 24;
        }).toThrow(DirectMutationError);
    });

    // ... continue with other data types and scenarios
});

describe('ImmuState - Primitives', () => {
    describe('Number', () => {
        it('should not allow direct modification of a number', () => {
            const state = readonly(5);
            expect(state.value).toBe(5);
            expect(() => {
                (state.value as any) = 10;
            }).toThrow(DirectMutationError);
        });
    });

    describe('String', () => {
        it('should not allow direct modification of a string', () => {
            const state = readonly('hello');
            expect(state.value).toBe('hello');
            expect(() => {
                (state.value as any) = 'world';
            }).toThrow(DirectMutationError);
        });
    });

    describe('Boolean', () => {
        it('should not allow direct modification of a boolean', () => {
            const state = readonly(true);
            expect(state.value).toBe(true);
            expect(() => {
                (state.value as any) = false;
            }).toThrow(DirectMutationError);
        });
    });

    describe('Symbol', () => {
        it('should not allow direct modification of a symbol', () => {
            const symbolValue = Symbol('test');
            const state = readonly(symbolValue);
            expect(state.value).toBe(symbolValue);
            expect(() => {
                (state.value as any) = Symbol('modified');
            }).toThrow(DirectMutationError);
        });
    });

    describe('Null', () => {
        it('should handle null values correctly', () => {
            const state = readonly(null);
            expect(state.value).toBeNull();
            expect(() => {
                (state.value as any) = 'not null';
            }).toThrow(DirectMutationError);
        });
    });

    describe('Undefined', () => {
        it('should handle undefined values correctly', () => {
            const state = readonly(undefined);
            expect(state.value).toBeUndefined();
            expect(() => {
                (state.value as any) = 'defined';
            }).toThrow(DirectMutationError);
        });
    });
});
