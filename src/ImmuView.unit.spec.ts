import {
    readonly,
    DirectMutationError,
    ValidationError,
    arrayProxyHandler,
    dateProxyHandler,
    createHandler,
    createDeepProxy,
    ReadonlyStateOptions,
    deepMerge,
} from './ImmuView';

describe('readonly', () => {
    describe('Basic Functionality', () => {
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
                (state.value.nested as any).value = 20;
            }).toThrow(DirectMutationError);
        });

        it('should not allow delete of nested object properties', () => {
            const state = readonly({ count: 5, nested: { value: 10 } });
            expect(() => {
                delete (state.value.nested as any).value;
            }).toThrow(DirectMutationError);
        });

        it('should allow internal modification of nested object properties', () => {
            const state = readonly({ count: 5, nested: { value: 10 } });
            state.internalSet({ count: 5, nested: { value: 20 } });
            expect(state.value.nested.value).toBe(20);
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
                { validator, validationErrorMessage },
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
                new ValidationError('Validation failed.'),
            );
        });

        it('should call the provided errorHandler when validation fails', () => {
            // Arrange
            const initialValue = { key: 'value' };
            const newValue = { key: 'newValue' };
            const validationErrorMessage = 'Custom validation error message';
            const validator = jest.fn().mockReturnValue(false); // Always fail validation
            const errorHandler = jest.fn();

            const options: ReadonlyStateOptions<typeof initialValue> = {
                validator,
                errorHandler,
                validationErrorMessage,
            };

            const { internalSet } = readonly(initialValue, options);

            // Act
            internalSet(newValue);

            // Assert
            expect(validator).toHaveBeenCalledWith(newValue);
            expect(errorHandler).toHaveBeenCalledWith(
                new ValidationError(validationErrorMessage),
            );
        });
        it('should throw a ValidationError when options is undefined and validator provided', () => {
            const initialValue = { key: 'value' };
            const newValue = { key: 'newValue' };
            const validator = jest.fn().mockReturnValue(false); // Always fail validation
            const { internalSet } = readonly(initialValue, { validator });

            expect(() => internalSet(newValue)).toThrow(ValidationError);
        });

        it('should throw a ValidationError when errorHandler is not provided in options', () => {
            const initialValue = { key: 'value' };
            const newValue = { key: 'newValue' };
            const options = { validator: () => false }; // Always fail validation
            const { internalSet } = readonly(initialValue, options);

            expect(() => internalSet(newValue)).toThrow(ValidationError);
        });
        it('should not throw a ValidationError when errorHandler is provided and handles the error', () => {
            const initialValue = { key: 'value' };
            const newValue = { key: 'newValue' };
            const errorHandler = jest.fn();
            const options = {
                validator: () => false, // Always fail validation
                errorHandler,
            };
            const { internalSet } = readonly(initialValue, options);

            expect(() => internalSet(newValue)).not.toThrow();
            expect(errorHandler).toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
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

    describe('createDeepProxy', () => {
        it('should create a deep proxy for non-object values', () => {
            const value = 'testString';
            const proxy = createDeepProxy(value);

            expect((proxy as any).value).toBe(value);
        });

        it('should return the same proxy for the same object', () => {
            const targetObject = { key: 'value' };
            const proxies = new WeakMap();

            const proxy1 = createDeepProxy(targetObject, undefined, proxies);
            const proxy2 = createDeepProxy(targetObject, undefined, proxies);

            // Check if the two proxies are the same object
            expect(proxy1).toBe(proxy2);
        });
    });

    describe('Nested object modification', () => {
        const generateNestedObject = (depth: number, value: number) => {
            let obj = { value } as any;
            for (let i = depth - 1; i > 0; i--) {
                obj = { [`level${i}`]: obj };
            }
            return obj;
        };

        const data = Array.from({ length: 200 }, (_, i) => ({
            depth: i + 1,
            expected: (i + 1) * 10,
        }));

        test.each(data)(
            'should not allow modification at depth $depth',
            ({ depth, expected }) => {
                const state = readonly(generateNestedObject(depth, expected));

                const modifyNestedValue = (
                    obj: any,
                    depth: number,
                    value: any,
                ) => {
                    let current = obj;
                    for (let i = 0; i < depth - 1; i++) {
                        current = current[`level${i + 1}`];
                    }
                    current.value = value;
                };

                expect(() =>
                    modifyNestedValue(state.value, depth, expected + 1),
                ).toThrow(DirectMutationError);
            },
        );
    });

    describe('Proxy Handlers', () => {
        describe('ProxyHandler', () => {
            let proxy: { [key: string]: any };
            const obj = { a: 1, b: 2, c: 3 };
            const func = () => {};

            beforeEach(() => {
                proxy = new Proxy(obj, createHandler(obj, new WeakMap()));
            });

            describe('ownKeys', () => {
                // ownKeys
                it('should handle ownKeys for all keys', () => {
                    expect(Reflect.ownKeys(proxy)).toEqual(['a', 'b', 'c']);
                });

                it('should handle ownKeys for no keys', () => {
                    const emptyProxy = new Proxy(
                        {},
                        createHandler({}, new WeakMap()),
                    );
                    expect(Reflect.ownKeys(emptyProxy)).toEqual([]);
                });

                it('should handle ownKeys for symbol keys', () => {
                    const symbolKey = Symbol('key');
                    const symbolObj = { [symbolKey]: 'value' };
                    const symbolProxy = new Proxy(
                        symbolObj,
                        createHandler(symbolObj, new WeakMap()),
                    );
                    expect(Reflect.ownKeys(symbolProxy)).toContain(symbolKey);
                });
            });

            describe('has', () => {
                // has
                it('should handle has for existing key', () => {
                    expect('a' in proxy).toBe(true);
                });

                it('should handle has for non-existing key', () => {
                    expect('z' in proxy).toBe(false);
                });

                it('should handle has for symbol keys', () => {
                    const symbolKey = Symbol('key');
                    const symbolObj = { [symbolKey]: 'value' };
                    const symbolProxy = new Proxy(
                        symbolObj,
                        createHandler(symbolObj, new WeakMap()),
                    );
                    expect(symbolKey in symbolProxy).toBe(true);
                });
            });

            describe('getOwnPropertyDescriptor', () => {
                // getOwnPropertyDescriptor
                it('should handle getOwnPropertyDescriptor for existing key', () => {
                    const desc = Object.getOwnPropertyDescriptor(proxy, 'a');
                    expect(desc).not.toBeUndefined();
                    expect(desc!.value).toBe(1);
                    expect(desc!.enumerable).toBe(true);
                });

                it('should handle getOwnPropertyDescriptor for non-existing key', () => {
                    expect(
                        Object.getOwnPropertyDescriptor(proxy, 'z'),
                    ).toBeUndefined();
                });

                it('should handle getOwnPropertyDescriptor for symbol keys', () => {
                    const symbolKey = Symbol('key');
                    const symbolObj = { [symbolKey]: 'value' };
                    const symbolProxy = new Proxy(
                        symbolObj,
                        createHandler(symbolObj, new WeakMap()),
                    );
                    const desc = Object.getOwnPropertyDescriptor(
                        symbolProxy,
                        symbolKey,
                    );
                    expect(desc).not.toBeUndefined();
                    expect(desc!.value).toBe('value');
                });
            });

            // isExtensible
            it('should handle isExtensible as false', () => {
                expect(Object.isExtensible(proxy)).toBe(false);
            });

            describe('getPrototypeOf', () => {
                // getPrototypeOf
                it('should handle getPrototypeOf for object', () => {
                    expect(Object.getPrototypeOf(proxy)).toBe(Object.prototype);
                });

                it('should handle getPrototypeOf for array', () => {
                    const arrProxy = new Proxy(
                        [],
                        createHandler([], new WeakMap()),
                    );
                    expect(Object.getPrototypeOf(arrProxy)).toBe(
                        Array.prototype,
                    );
                });

                it('should handle getPrototypeOf for null prototype', () => {
                    const nullProtoObj = Object.create(null);
                    const nullProxy = new Proxy(
                        nullProtoObj,
                        createHandler(nullProtoObj, new WeakMap()),
                    );
                    expect(Object.getPrototypeOf(nullProxy)).toBe(null);
                });

                it('should handle getPrototypeOf for custom prototype', () => {
                    const customProto = { custom: true };
                    const customObj = Object.create(customProto);
                    const customProxy = new Proxy(
                        customObj,
                        createHandler(customObj, new WeakMap()),
                    );
                    expect(Object.getPrototypeOf(customProxy)).toBe(
                        customProto,
                    );
                });

                it('should handle getPrototypeOf for function prototype', () => {
                    const funcProxy = new Proxy(
                        func,
                        createHandler(func, new WeakMap()),
                    );
                    expect(Object.getPrototypeOf(funcProxy)).toBe(
                        Function.prototype,
                    );
                });

                it('should handle getPrototypeOf for array prototype', () => {
                    const arrProxy = new Proxy(
                        [],
                        createHandler([], new WeakMap()),
                    );
                    expect(Object.getPrototypeOf(arrProxy)).toBe(
                        Array.prototype,
                    );
                });

                it('should handle getPrototypeOf for date prototype', () => {
                    const dateProxy = new Proxy(
                        new Date(),
                        createHandler(new Date(), new WeakMap()),
                    );
                    expect(Object.getPrototypeOf(dateProxy)).toBe(
                        Date.prototype,
                    );
                });

                it('should handle getPrototypeOf for regexp prototype', () => {
                    const regexProxy = new Proxy(
                        /test/g,
                        createHandler(/test/g, new WeakMap()),
                    );
                    expect(Object.getPrototypeOf(regexProxy)).toBe(
                        RegExp.prototype,
                    );
                });
            });

            // Additional tests
            it('should not allow setting properties', () => {
                expect(() => {
                    proxy.d = 4;
                }).toThrow();
            });

            it('should return correct values for properties', () => {
                expect(proxy.a).toBe(1);
                expect(proxy.b).toBe(2);
            });

            it('should return undefined for non-existing properties', () => {
                expect(proxy.z).toBeUndefined();
            });

            it('should not allow direct mutations', () => {
                expect(() => {
                    proxy.a = 10;
                }).toThrow();
            });

            it('should not allow adding new properties', () => {
                expect(() => {
                    proxy.d = 4;
                }).toThrow();
            });

            it('should not allow deleting properties', () => {
                expect(() => {
                    delete proxy.b;
                }).toThrow();
            });

            it('should not allow calling proxy as a function', () => {
                expect(() => (proxy as any)()).toThrow(TypeError);
            });

            it('should not allow calling proxied function', () => {
                const funcProxy = new Proxy(
                    func,
                    createHandler(func, new WeakMap()),
                );
                expect(() => funcProxy()).toThrow(DirectMutationError);
            });

            describe('apply trap', () => {
                it('should throw "Cannot modify readonly state." when proxying a non-function', () => {
                    const func = () => {};
                    const proxy = new Proxy(
                        func,
                        createHandler(func, new WeakMap()),
                    );

                    expect(() => {
                        proxy();
                    }).toThrow(
                        new DirectMutationError(
                            'Cannot modify readonly state.',
                        ),
                    );
                });
            });
        });

        describe('dateProxyHandler', () => {
            it('should throw an error when a mutating method is called', () => {
                const date = new Date();
                const proxy = new Proxy(date, dateProxyHandler);
                expect(() => proxy.setDate(10)).toThrowError(
                    DirectMutationError,
                );
            });

            it('should return the value when a non-mutating method is called', () => {
                const date = new Date();
                const proxy = new Proxy(date, dateProxyHandler);
                expect(proxy.getFullYear()).toBe(date.getFullYear());
            });

            it('should return non-function properties correctly', () => {
                const date = new Date();
                // Add a custom property to the date object
                (date as any).customProperty = 'testValue';

                const proxy = new Proxy(date, dateProxyHandler);

                // Access the custom property through the proxy
                expect((proxy as any).customProperty).toBe('testValue');
            });
        });

        describe('arrayProxyHandler', () => {
            it('should throw an error when a mutating method is called', () => {
                const arr = [1, 2, 3];
                const proxy = new Proxy(arr, arrayProxyHandler);
                expect(() => proxy.push(4)).toThrowError(DirectMutationError);
            });

            it('should return the value when a non-mutating method is called', () => {
                const arr = [1, 2, 3];
                const proxy = new Proxy(arr, arrayProxyHandler);
                expect(proxy.length).toBe(arr.length);
            });

            it('should return a deep proxy when an object is accessed', () => {
                const obj = { a: { b: 1 } };
                const arr = [obj];
                const proxy = new Proxy(arr, arrayProxyHandler);
                const objProxy = proxy[0];
                expect(objProxy).not.toBe(obj);
                expect(objProxy.a.b).toBe(obj.a.b);
            });
        });
    });

    describe('Special Data Types', () => {
        it('should handle Date objects correctly', () => {
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

        it('should handle functions correctly', () => {
            const fn = () => 'Hello';
            const state = readonly({ fn });
            expect(state.value.fn()).toBe('Hello');
        });

        it('should not allow modifying functions', () => {
            const fn = () => 'Hello';
            const state = readonly({ fn });
            expect(() => {
                (state.value as any).fn = () => 'Changed';
            }).toThrow(DirectMutationError);
        });
    });

    describe('Internal Modifications', () => {
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
    });

    describe('deepMerge', () => {
        it('should merge two basic objects', () => {
            const target = { a: 1, b: 2 };
            const source = { b: 3, c: 4 };
            deepMerge(target, source);
            expect(target).toEqual({ a: 1, b: 3, c: 4 });
        });

        it('should merge nested objects', () => {
            const target = { a: 1, nested: { b: 2 } };
            const source = { nested: { c: 3 } };
            deepMerge(target, source);
            expect(target).toEqual({ a: 1, nested: { b: 2, c: 3 } });
        });

        it('should initialize a nested object if it does not exist in target', () => {
            const target = { a: 1 };
            const source = { nested: { b: 2 } };
            deepMerge(target, source);
            expect(target).toEqual({ a: 1, nested: { b: 2 } });
        });

        it('should overwrite non-object values in target', () => {
            const target = { a: 1, b: 2 };
            const source = { b: 'two' };
            deepMerge(target, source);
            expect(target).toEqual({ a: 1, b: 'two' });
        });

        it('should merge deep nested objects', () => {
            const target = { a: { b: { c: 1 } } };
            const source = { a: { b: { d: 2 } } };
            deepMerge(target, source);
            expect(target).toEqual({ a: { b: { c: 1, d: 2 } } });
        });

        it("should allow source to overwrite target's nested object", () => {
            const target = { a: { b: 1 } };
            const source = { a: 'string' };
            deepMerge(target, source);
            expect(target).toEqual({ a: 'string' });
        });

        it('should overwrite arrays, not merge them', () => {
            const target = { a: [1, 2, 3] };
            const source = { a: [4, 5] };
            deepMerge(target, source);
            expect(target).toEqual({ a: [4, 5] });
        });

        it('should overwrite functions', () => {
            const fn1 = () => 'fn1';
            const fn2 = () => 'fn2';
            const target = { a: fn1 };
            const source = { a: fn2 };
            deepMerge(target, source);
            expect(target.a()).toBe('fn2');
        });

        it('should not modify properties not present in target', () => {
            const target = { a: 1 };
            const source = { b: 2 };
            deepMerge(target, source);
            expect(target).toEqual({ a: 1, b: 2 });
        });

        it('should handle source with nested undefined values', () => {
            const target = { a: 1, nested: { b: 2 } };
            const source = { nested: { b: undefined, c: 3 } };
            deepMerge(target, source);
            expect(target).toEqual({ a: 1, nested: { b: undefined, c: 3 } });
        });
    });
});
