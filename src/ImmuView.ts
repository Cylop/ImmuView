class DirectMutationError extends Error {}
class ValidationError extends Error {}

type ErrorHandler = (error: Error) => void;

type ReadonlyState<T> = {
    value: T;
    internalSet: (newValue: T) => void;
};

type Validator<T> = (value: T) => boolean;

interface ReadonlyStateOptions<T> {
    validator?: Validator<T>;
    errorHandler?: ErrorHandler;
    validationErrorMessage?: string;
}

export const defaultErrorHandler = (error: Error) => {
    console.error(error.message);
};

const isObject = (value: any): value is object =>
    typeof value === 'object' && value !== null;

const deepMerge = (target: any, source: any) => {
    for (const key in source) {
        if (isObject(source[key])) {
            if (!target[key]) target[key] = {};
            deepMerge(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
};

const createDeepProxy = <T>(
    target: T,
    options?: ReadonlyStateOptions<T>,
    proxies: WeakMap<object, any> = new WeakMap()
): T => {
    let proxyKey = {};
    if (!isObject(target)) {
        proxyKey = { value: target };
    } else {
        proxyKey = target;
    }

    if (proxies.has(proxyKey)) {
        return proxies.get(proxyKey);
    }

    const handler: ProxyHandler<T & { [key: string]: any }> = {
        get: (obj, prop: string | symbol) => {
            console.log(
                'GET TRAP',
                'Accessing property',
                prop,
                'of object',
                obj
            );
            const value = obj[prop as keyof T];
            if ((value as any) instanceof Date) {
                console.log('Date found');
                const dateProxyHandler: ProxyHandler<Date> = {
                    get: (dateObj, dateProp) => {
                        if (
                            [
                                'setDate',
                                'setFullYear',
                                'setHours',
                                'setMilliseconds',
                                'setMinutes',
                                'setMonth',
                                'setSeconds',
                                'setTime',
                                'setUTCDate',
                                'setUTCDay',
                                'setUTCFullYear',
                                'setUTCHours',
                                'setUTCMilliseconds',
                                'setUTCMinutes',
                                'setUTCMonth',
                                'setUTCSeconds',
                            ].includes(String(dateProp))
                        ) {
                            return () => {
                                throw new DirectMutationError(
                                    'Cannot modify readonly state.'
                                );
                            };
                        }
                        return dateObj[dateProp as keyof Date];
                    },
                };
                return new Proxy(value, dateProxyHandler);
            } else if (
                Array.isArray(value) ||
                (Array.isArray(obj) && typeof value === 'function')
            ) {
                console.log('Array or array method found');
                const arrayProxyHandler: ProxyHandler<any[]> = {
                    get: (arr, arrProp) => {
                        console.log(
                            `Accessing property ${String(arrProp)} of array`,
                            arr
                        );

                        if (
                            [
                                'push',
                                'pop',
                                'shift',
                                'unshift',
                                'splice',
                                'reverse',
                                'sort',
                            ].includes(String(arrProp))
                        ) {
                            return () => {
                                throw new DirectMutationError(
                                    'Cannot modify readonly state.'
                                );
                            };
                        }

                        const item = arr[arrProp as any];
                        console.log(`Item at index ${String(arrProp)}:`, item);

                        if (isObject(item)) {
                            return createDeepProxy(item as T, options, proxies);
                        }
                        return item;
                    },
                };
                return new Proxy(value, arrayProxyHandler);
            } else if (isObject(value)) {
                console.log('Object found');
                return createDeepProxy(value as T, options, proxies);
            } else if (typeof value === 'function') {
                console.log('Function found');
                return value.bind(obj); // Bind the function to the original object
            }
            return value;
        },
        set: () => {
            throw new DirectMutationError('Cannot modify readonly state.');
        },
        ownKeys: (obj) => {
            return Reflect.ownKeys(obj);
        },
        has: (target, key) => {
            return key in target;
        },
        getOwnPropertyDescriptor: (target, key) => {
            return Reflect.getOwnPropertyDescriptor(target, key);
        },
        deleteProperty: () => {
            throw new DirectMutationError('Cannot modify readonly state.');
        },
        defineProperty: () => {
            throw new DirectMutationError('Cannot modify readonly state.');
        },
        setPrototypeOf: () => {
            throw new DirectMutationError('Cannot modify readonly state.');
        },
        preventExtensions: () => {
            throw new DirectMutationError('Cannot modify readonly state.');
        },
        isExtensible: () => {
            return false;
        },
        getPrototypeOf: () => {
            return isObject(target) ? Reflect.getPrototypeOf(target) : null;
        },
        apply: (target, _thisArg, _argumentsList) => {
            if (typeof target !== 'function') {
                throw new DirectMutationError('Target is not callable.');
            }
            throw new DirectMutationError('Cannot modify readonly state.');
        },
    };

    const proxy = new Proxy(proxyKey, handler);
    console.log('Target:', target);
    console.log('Created Proxy (before set target):', proxy);
    proxies.set(proxyKey, proxy);
    console.log('Target:', target);
    console.log('Created Proxy:', proxy);
    return proxy as T;
};

const readonly = <T>(
    initialValue: T,
    options?: ReadonlyStateOptions<T>
): ReadonlyState<T> => {
    let proxy = createDeepProxy(initialValue, options);
    console.log('Created Proxy in readonly:', proxy);
    const internalSet = (newValue: T) => {
        if (options?.validator && !options.validator(newValue)) {
            const error = new ValidationError(
                options.validationErrorMessage ?? 'Validation failed.'
            );
            if (options?.errorHandler) {
                options.errorHandler(error);
                return;
            }
            throw error;
        }
        deepMerge(initialValue, newValue);
        proxy = createDeepProxy(initialValue, options);
    };

    console.log('Proxy:', proxy);

    return { value: proxy, internalSet };
};

export { readonly, DirectMutationError, ValidationError };
